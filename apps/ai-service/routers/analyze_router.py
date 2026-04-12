"""
POST /analyze — CSV upload + transaction analysis
POST /analyze/context — JSON transaction analysis for BFF chat (with Redis cache)
Receives multipart file or pre-parsed transactions.
"""
import json
import logging
import os
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from models.schemas import AnalyzeContextRequest, AnalyzeContextResponse, AnalyzeResponse
from services.categorizer import build_category_summaries, categorize_batch
from services.csv_parser import parse_csv
from services.parasite_detector import find_parasites
from services.rate_limiter import get_rate_limiter

logger = logging.getLogger(__name__)
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")

router = APIRouter(prefix="/analyze", tags=["analyze"])


@router.post("", response_model=AnalyzeResponse)
async def analyze_csv(
    file: Annotated[UploadFile, File(description="Bank statement CSV")],
    user_id: Annotated[str, Form()],
    bank: Annotated[str, Form()] = "auto",
) -> AnalyzeResponse:
    """
    Parse and analyze a bank CSV statement.
    - Detects encoding (UTF-8 / cp1251)
    - Detects bank format
    - Categorizes transactions (rule-based)
    - Finds recurring subscriptions (parasite detector)
    """
    if file.content_type not in ("text/csv", "application/csv", "application/octet-stream"):
        if not (file.filename or "").endswith(".csv"):
            raise HTTPException(
                status_code=400,
                detail={"code": "PARSE_ERROR", "message": "Не смогли прочитать файл. Попробуй CSV из Т-Банка"},
            )

    raw = await file.read()

    try:
        transactions = parse_csv(raw, user_id, bank_hint=bank)
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail={"code": "PARSE_ERROR", "message": str(e)},
        )

    if len(raw) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail={"code": "FILE_TOO_LARGE", "message": "Максимум 10 МБ"},
        )

    categorized = categorize_batch(transactions)
    category_summaries_raw = build_category_summaries(categorized)
    parasites = find_parasites(categorized)

    dates = [t.transaction_date for t in categorized]
    period = {
        "start": str(min(dates)) if dates else "",
        "end":   str(max(dates)) if dates else "",
    }

    total_spent = round(sum(abs(t.amount) for t in categorized if t.amount < 0), 2)

    from models.schemas import CategorySummary
    category_summaries = [CategorySummary(**s) for s in category_summaries_raw]

    return AnalyzeResponse(
        transactions=categorized,
        categories=category_summaries,
        parasites=parasites,
        period=period,
        total_spent=total_spent,
    )


@router.post("/context", response_model=AnalyzeContextResponse)
async def analyze_context(body: AnalyzeContextRequest) -> AnalyzeContextResponse:
    """
    JSON-based analysis for BFF chat. Accepts pre-parsed transactions from Supabase.
    Cached in Redis by user_id + UTC date (TTL 3600s) to prevent N×/analyze per session.
    """
    limiter = get_rate_limiter(REDIS_URL)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    cache_key = f"chat:context:{body.user_id}:{today}"

    # Check Redis cache first
    cached = await limiter._redis.get(cache_key)
    if cached:
        try:
            return AnalyzeContextResponse(**json.loads(cached))
        except Exception:
            pass  # cache corrupt — recompute

    categorized = categorize_batch(body.transactions)
    summaries_raw = build_category_summaries(categorized)
    parasites = find_parasites(categorized)
    total_spent = round(sum(abs(t.amount) for t in categorized if t.amount < 0), 2)

    result = AnalyzeContextResponse(
        categories=[
            {"name": s["category"], "percent": s["percent"], "total": s["total"]}
            for s in summaries_raw
        ],
        parasites=[
            {"name": p.name, "amount_per_month": p.amount_per_month}
            for p in parasites
        ],
        total_spent=total_spent,
    )

    # Cache for 1 hour
    await limiter._redis.setex(cache_key, 3600, result.model_dump_json())
    return result
