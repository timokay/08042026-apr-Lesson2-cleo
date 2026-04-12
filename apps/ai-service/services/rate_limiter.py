"""
Redis Rate Limiter
Source: docs/Architecture.md, docs/Refinement.md
- 10 AI requests / minute / user (sliding window)
- 1 roast / month / user (free plan)
- 15+ req/min → block for 1 hour (anti-abuse)
"""
import time
from dataclasses import dataclass
from typing import Optional

import redis.asyncio as redis


@dataclass
class RateLimitResult:
    allowed: bool
    retry_after: int  # seconds to wait if not allowed
    remaining: int    # remaining requests in window


class RateLimiter:
    def __init__(self, redis_client: redis.Redis):
        self._redis = redis_client

    async def check_ai_rate(self, user_id: str) -> RateLimitResult:
        """
        Sliding window: 10 AI requests per 60 seconds.
        Also blocks for 1 hour if > 15 requests/minute detected.
        """
        now = time.time()
        window = 60  # seconds
        limit = 10
        abuse_limit = 15
        abuse_block = 3600  # 1 hour

        key = f"rate:ai:{user_id}"
        block_key = f"rate:block:{user_id}"

        # Check if user is blocked (anti-abuse)
        blocked_ttl = await self._redis.ttl(block_key)
        if blocked_ttl > 0:
            return RateLimitResult(allowed=False, retry_after=blocked_ttl, remaining=0)

        pipe = self._redis.pipeline()
        # Remove entries outside the window
        pipe.zremrangebyscore(key, 0, now - window)
        # Count current window requests
        pipe.zcard(key)
        # Add current request timestamp
        pipe.zadd(key, {str(now): now})
        pipe.expire(key, window * 2)
        results = await pipe.execute()

        count = results[1] + 1  # +1 for current request

        # Anti-abuse: block for 1 hour
        if count > abuse_limit:
            await self._redis.setex(block_key, abuse_block, "1")
            return RateLimitResult(allowed=False, retry_after=abuse_block, remaining=0)

        if count > limit:
            return RateLimitResult(allowed=False, retry_after=window, remaining=0)

        return RateLimitResult(allowed=True, retry_after=0, remaining=limit - count)

    async def check_daily_chat(self, user_id: str, plan: str) -> RateLimitResult:
        """
        Daily chat message limit: free=10, plus=100.
        Uses atomic Lua script to prevent TOCTOU race condition.
        Key resets at midnight UTC (TTL = seconds until midnight).
        """
        from datetime import datetime, timezone, timedelta

        now = datetime.now(timezone.utc)
        today = now.strftime('%Y-%m-%d')
        limit = 10 if plan == 'free' else 100

        midnight = datetime(now.year, now.month, now.day, tzinfo=timezone.utc) + timedelta(days=1)
        ttl = int((midnight - now).total_seconds())

        key = f"chat:daily:{user_id}:{today}"

        # Atomic Lua: check limit, increment if allowed, set TTL on first write
        lua_script = """
local count = tonumber(redis.call('GET', KEYS[1])) or 0
if count >= tonumber(ARGV[1]) then
    return -1
end
local new_count = redis.call('INCR', KEYS[1])
if new_count == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[2])
end
return new_count
"""
        result = await self._redis.eval(lua_script, 1, key, limit, ttl)

        if result == -1:
            return RateLimitResult(allowed=False, retry_after=ttl, remaining=0)

        return RateLimitResult(allowed=True, retry_after=0, remaining=limit - int(result))

    async def decrement_daily_chat(self, user_id: str) -> None:
        """Undo a daily chat increment (e.g. when AI call fails before first token)."""
        from datetime import datetime, timezone

        now = datetime.now(timezone.utc)
        today = now.strftime('%Y-%m-%d')
        key = f"chat:daily:{user_id}:{today}"
        # Atomic Lua: only decrement if count > 0 (prevent negative values)
        lua_script = """
local count = tonumber(redis.call('GET', KEYS[1])) or 0
if count > 0 then redis.call('DECR', KEYS[1]) end
return 1
"""
        await self._redis.eval(lua_script, 1, key)

    def _monthly_roast_key(self, user_id: str) -> tuple[str, int]:
        """Returns (redis_key, ttl_seconds) for this user's current month."""
        import calendar
        from datetime import datetime

        now = datetime.now()
        days_in_month = calendar.monthrange(now.year, now.month)[1]
        days_remaining = days_in_month - now.day + 1
        ttl = days_remaining * 86400
        key = f"roast:monthly:{user_id}:{now.year}:{now.month}"
        return key, ttl

    async def check_chat_rate(self, user_id: str) -> RateLimitResult:
        """
        Sliding window: 10 chat requests per 60 seconds.
        Separate from check_ai_rate so chat and roast limits can diverge independently.
        """
        return await self._check_sliding_window(
            key=f"rate:chat:{user_id}",
            block_key=f"rate:block:{user_id}",
            limit=10,
            abuse_limit=15,
            window=60,
            abuse_block=3600,
        )

    async def _check_sliding_window(
        self,
        key: str,
        block_key: str,
        limit: int,
        abuse_limit: int,
        window: int,
        abuse_block: int,
    ) -> RateLimitResult:
        """Reusable sliding window rate limiter."""
        now = time.time()

        blocked_ttl = await self._redis.ttl(block_key)
        if blocked_ttl > 0:
            return RateLimitResult(allowed=False, retry_after=blocked_ttl, remaining=0)

        pipe = self._redis.pipeline()
        pipe.zremrangebyscore(key, 0, now - window)
        pipe.zcard(key)
        pipe.zadd(key, {str(now): now})
        pipe.expire(key, window * 2)
        results = await pipe.execute()

        count = results[1] + 1

        if count > abuse_limit:
            await self._redis.setex(block_key, abuse_block, "1")
            return RateLimitResult(allowed=False, retry_after=abuse_block, remaining=0)

        if count > limit:
            return RateLimitResult(allowed=False, retry_after=window, remaining=0)

        return RateLimitResult(allowed=True, retry_after=0, remaining=limit - count)

    async def check_monthly_roast(self, user_id: str) -> RateLimitResult:
        """
        Free plan: check if user has roast quota remaining this month.
        Does NOT consume the quota — call consume_monthly_roast() after success.
        """
        key, ttl = self._monthly_roast_key(user_id)
        count = await self._redis.get(key)
        if count and int(count) >= 1:
            return RateLimitResult(allowed=False, retry_after=ttl, remaining=0)
        return RateLimitResult(allowed=True, retry_after=0, remaining=0)

    async def consume_monthly_roast(self, user_id: str) -> None:
        """
        Consume the monthly roast quota for free plan.
        Call only after the roast stream has started successfully.
        """
        key, ttl = self._monthly_roast_key(user_id)
        pipe = self._redis.pipeline()
        pipe.incr(key)
        pipe.expire(key, ttl)
        await pipe.execute()


# Singleton pattern — shared across requests to avoid connection pool exhaustion
_limiter: Optional[RateLimiter] = None


def get_rate_limiter(redis_url: str) -> RateLimiter:
    global _limiter
    if _limiter is None:
        client = redis.from_url(redis_url, decode_responses=True)
        _limiter = RateLimiter(client)
    return _limiter
