"""
POST /chat — AI chat with SSE streaming
Source: docs/features/ai-chat/sparc/Pseudocode.md Algorithm 2
"""
import json
import logging
import os
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from models.schemas import ChatRequest
from services.chat_generator import generate_chat_response
from services.rate_limiter import get_rate_limiter

router = APIRouter(prefix="/chat", tags=["chat"])

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")

logger = logging.getLogger(__name__)

# Max history items to store per session (10 pairs = 20 messages)
MAX_HISTORY_ITEMS = 20


async def _get_history(redis, key: str) -> list[dict]:
    """Fetch last MAX_HISTORY_ITEMS messages from Redis list."""
    raw = await redis.lrange(key, -MAX_HISTORY_ITEMS, -1)
    result = []
    for item in raw:
        try:
            result.append(json.loads(item))
        except json.JSONDecodeError:
            continue
    return result


async def _append_history(redis, key: str, role: str, content: str) -> None:
    """Append a message to history list, trim to MAX_HISTORY_ITEMS, reset TTL."""
    await redis.rpush(key, json.dumps({"role": role, "content": content}, ensure_ascii=False))
    await redis.ltrim(key, -MAX_HISTORY_ITEMS, -1)
    await redis.expire(key, 3600)


async def _sse_stream(req: ChatRequest) -> AsyncGenerator[bytes, None]:
    """
    SSE stream: token events while generating, then done event.
    Manages Redis history: appends on first token (user) and after done (assistant).
    Emits error event if both AI providers fail.
    """
    limiter = get_rate_limiter(REDIS_URL)
    history_key = f"chat:history:{req.user_id}:{req.session_id}"

    # Persist user message to history before streaming starts
    await _append_history(limiter._redis, history_key, "user", req.message)

    assistant_chunks: list[str] = []

    try:
        async for chunk in generate_chat_response(req):
            assistant_chunks.append(chunk)
            payload = json.dumps({"text": chunk}, ensure_ascii=False)
            yield f"event: token\ndata: {payload}\n\n".encode("utf-8")

        # Persist assistant response
        assistant_content = "".join(assistant_chunks)
        await _append_history(limiter._redis, history_key, "assistant", assistant_content)

        import uuid
        done_payload = json.dumps({"message_id": str(uuid.uuid4())}, ensure_ascii=False)
        yield f"event: done\ndata: {done_payload}\n\n".encode("utf-8")

    except Exception as e:
        logger.error("Chat generation failed: %s", e)
        # Remove the user message we already appended — generation never happened
        await limiter._redis.rpop(history_key)
        error_payload = json.dumps({"code": "AI_UNAVAILABLE"}, ensure_ascii=False)
        yield f"event: error\ndata: {error_payload}\n\n".encode("utf-8")


@router.post("")
async def chat(req: ChatRequest) -> StreamingResponse:
    """
    Stream an AI chat response via Server-Sent Events.
    Rate limited: 10 req/min.
    Daily limit enforced by plan: free=10/day, plus=100/day.
    History managed in Redis (session-scoped, TTL 1h).
    """
    limiter = get_rate_limiter(REDIS_URL)

    # Per-minute rate limit
    rate_result = await limiter.check_chat_rate(req.user_id)
    if not rate_result.allowed:
        raise HTTPException(
            status_code=429,
            detail={"code": "RATE_LIMIT", "retry_after": rate_result.retry_after},
            headers={"Retry-After": str(rate_result.retry_after)},
        )

    # Daily limit by plan
    daily_result = await limiter.check_daily_chat(req.user_id, req.plan)
    if not daily_result.allowed:
        raise HTTPException(
            status_code=429,
            detail={"code": "DAILY_LIMIT", "retry_after": daily_result.retry_after},
            headers={"Retry-After": str(daily_result.retry_after)},
        )

    # Fetch session history from Redis and inject into request
    history_key = f"chat:history:{req.user_id}:{req.session_id}"
    history = await _get_history(limiter._redis, history_key)
    req_with_history = req.model_copy(update={"history": history})

    return StreamingResponse(
        _sse_stream(req_with_history),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
