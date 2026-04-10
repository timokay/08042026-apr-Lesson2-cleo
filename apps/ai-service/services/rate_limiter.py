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

    async def check_monthly_roast(self, user_id: str) -> RateLimitResult:
        """
        Free plan: 1 roast per calendar month.
        Key resets at start of next month (TTL = days remaining in month * 86400).
        """
        import calendar
        from datetime import datetime

        now = datetime.now()
        days_in_month = calendar.monthrange(now.year, now.month)[1]
        days_remaining = days_in_month - now.day + 1
        ttl = days_remaining * 86400

        key = f"roast:monthly:{user_id}:{now.year}:{now.month}"

        count = await self._redis.get(key)
        if count and int(count) >= 1:
            return RateLimitResult(
                allowed=False,
                retry_after=ttl,
                remaining=0,
            )

        pipe = self._redis.pipeline()
        pipe.incr(key)
        pipe.expire(key, ttl)
        await pipe.execute()

        return RateLimitResult(allowed=True, retry_after=0, remaining=0)


# Singleton pattern — shared across requests to avoid connection pool exhaustion
_limiter: Optional[RateLimiter] = None


def get_rate_limiter(redis_url: str) -> RateLimiter:
    global _limiter
    if _limiter is None:
        client = redis.from_url(redis_url, decode_responses=True)
        _limiter = RateLimiter(client)
    return _limiter
