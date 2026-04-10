"""
POST /analyze — CSV upload + transaction analysis
Receives multipart file, parses, categorizes, detects parasites.
"""
import os
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from models.schemas import AnalyzeResponse
from services.categorizer import build_category_summaries, categorize_batch
from services.csv_parser import parse_csv
from services.parasite_detector import find_parasites

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
