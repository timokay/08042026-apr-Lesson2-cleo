"""
POST /roast — AI roast generation with SSE streaming
Source: docs/Pseudocode.md Algorithm 4, docs/Specification.md POST /api/roast
"""
import json
import os
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from models.schemas import RoastRequest
from services.rate_limiter import get_rate_limiter
from services.roast_generator import generate_roast

router = APIRouter(prefix="/roast", tags=["roast"])

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")


async def _sse_stream(req: RoastRequest) -> AsyncGenerator[bytes, None]:
    """
    SSE format: each chunk must end with \n\n
    Tokens streamed as: data: {"text": "..."}\n\n
    Final event:        event: done\ndata: {"summary": "..."}\n\n
    """
    full_text = []

    async for chunk in generate_roast(req):
        full_text.append(chunk)
        payload = json.dumps({"text": chunk}, ensure_ascii=False)
        yield f"event: token\ndata: {payload}\n\n".encode("utf-8")

    summary = "".join(full_text)[:280]
    done_payload = json.dumps({"summary": summary}, ensure_ascii=False)
    yield f"event: done\ndata: {done_payload}\n\n".encode("utf-8")


@router.post("")
async def roast(req: RoastRequest) -> StreamingResponse:
    """
    Stream an AI roast via Server-Sent Events.
    Rate limited: 10 AI req/min, 1 roast/month (free plan).
    """
    limiter = get_rate_limiter(REDIS_URL)

    # Check per-minute rate limit
    result = await limiter.check_ai_rate(req.user_id)
    if not result.allowed:
        raise HTTPException(
            status_code=429,
            detail={"code": "RATE_LIMIT", "retry_after": result.retry_after},
            headers={"Retry-After": str(result.retry_after)},
        )

    # Free plan: 1 roast per calendar month
    if req.plan == "free":
        monthly_result = await limiter.check_monthly_roast(req.user_id)
        if not monthly_result.allowed:
            raise HTTPException(
                status_code=429,
                detail={"code": "MONTHLY_LIMIT", "retry_after": monthly_result.retry_after},
                headers={"Retry-After": str(monthly_result.retry_after)},
            )

    if len(req.categories) < 1 or sum(c.count for c in req.categories) < 5:
        raise HTTPException(
            status_code=422,
            detail={"code": "INSUFFICIENT_DATA", "message": "Маловато данных для ростера"},
        )

    return StreamingResponse(
        _sse_stream(req),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # disable Nginx buffering for SSE
        },
    )
