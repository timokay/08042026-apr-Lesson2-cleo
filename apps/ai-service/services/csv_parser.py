"""
Algorithm 1: CSV Parser
Source: docs/Pseudocode.md — Algorithm 1
Supports: Т-Банк, Сбербанк, Альфа-Банк, Generic CSV
Handles encoding detection (UTF-8 / cp1251)
"""
import csv
import io
import uuid
from datetime import datetime, date
from typing import Optional

from models.schemas import Transaction, TransactionCategory, TransactionSource

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
MAX_ROWS = 1000

# Bank format detection by header keywords
TBANK_HEADERS = {"дата операции", "сумма операции"}
SBER_HEADERS = {"дата проводки"}
ALFA_HEADERS = {"дата транзакции"}


def detect_encoding(raw_bytes: bytes) -> str:
    """Detect encoding — UTF-8 or cp1251 (Windows-1251) for Russian bank exports."""
    try:
        raw_bytes.decode("utf-8")
        return "utf-8"
    except UnicodeDecodeError:
        return "cp1251"


def detect_bank_format(headers: list[str]) -> str:
    """Identify bank by column headers."""
    lower = {h.lower().strip() for h in headers}
    if TBANK_HEADERS & lower:
        return "tbank"
    if SBER_HEADERS & lower:
        return "sber"
    if ALFA_HEADERS & lower:
        return "alfa"
    return "generic"


def parse_amount(value: str) -> Optional[float]:
    """Parse Russian-formatted number like '-1 234,56' or '1234.56'."""
    cleaned = value.strip().replace(" ", "").replace("\u00a0", "").replace(",", ".")
    try:
        return float(cleaned)
    except ValueError:
        return None


def parse_date(value: str) -> Optional[date]:
    """Parse multiple date formats used by Russian banks."""
    for fmt in ("%d.%m.%Y", "%Y-%m-%d", "%d/%m/%Y", "%d.%m.%Y %H:%M:%S"):
        try:
            return datetime.strptime(value.strip(), fmt).date()
        except ValueError:
            continue
    return None


def _parse_tbank(reader: csv.DictReader, user_id: str) -> list[Transaction]:
    transactions = []
    for row in reader:
        amount_str = row.get("Сумма операции") or row.get("сумма операции", "")
        date_str = row.get("Дата операции") or row.get("дата операции", "")
        description = row.get("Описание") or row.get("описание") or row.get("Категория", "")
        merchant = row.get("MCC") or description[:50]

        amount = parse_amount(amount_str)
        txn_date = parse_date(date_str)

        if amount is None or txn_date is None:
            continue
        if amount >= 0:
            continue  # skip income

        transactions.append(Transaction(
            id=str(uuid.uuid4()),
            user_id=user_id,
            amount=amount,
            transaction_date=txn_date,
            description=description.strip(),
            merchant=merchant.strip(),
            source=TransactionSource.CSV,
        ))
    return transactions


def _parse_sber(reader: csv.DictReader, user_id: str) -> list[Transaction]:
    transactions = []
    for row in reader:
        amount_str = row.get("Сумма") or row.get("сумма", "")
        date_str = row.get("Дата проводки") or row.get("дата", "")
        description = row.get("Описание") or row.get("Назначение", "")

        amount = parse_amount(amount_str)
        txn_date = parse_date(date_str)

        if amount is None or txn_date is None:
            continue
        if amount >= 0:
            continue

        transactions.append(Transaction(
            id=str(uuid.uuid4()),
            user_id=user_id,
            amount=amount,
            transaction_date=txn_date,
            description=description.strip(),
            merchant=description[:50].strip(),
            source=TransactionSource.CSV,
        ))
    return transactions


def _parse_generic(reader: csv.DictReader, user_id: str) -> list[Transaction]:
    """Fuzzy matching for unknown bank CSV formats."""
    fieldnames = [f.lower().strip() for f in (reader.fieldnames or [])]

    # Find date column
    date_col = next((f for f in fieldnames if "дата" in f or "date" in f), None)
    # Find amount column
    amount_col = next((f for f in fieldnames if "сумма" in f or "amount" in f or "sum" in f), None)
    # Find description column
    desc_col = next(
        (f for f in fieldnames if any(k in f for k in ("описание", "description", "назначение", "категория"))),
        None
    )

    if not date_col or not amount_col:
        return []

    transactions = []
    for row in reader:
        # Match case-insensitively
        row_lower = {k.lower().strip(): v for k, v in row.items()}
        amount = parse_amount(row_lower.get(amount_col, ""))
        txn_date = parse_date(row_lower.get(date_col, ""))
        description = row_lower.get(desc_col or "", "")

        if amount is None or txn_date is None:
            continue
        if amount >= 0:
            continue

        transactions.append(Transaction(
            id=str(uuid.uuid4()),
            user_id=user_id,
            amount=amount,
            transaction_date=txn_date,
            description=description.strip(),
            merchant=description[:50].strip(),
            source=TransactionSource.CSV,
        ))
    return transactions


def deduplicate(transactions: list[Transaction]) -> list[Transaction]:
    """Remove duplicates: same date + amount + description."""
    seen: set[tuple] = set()
    unique = []
    for t in transactions:
        key = (t.transaction_date, t.amount, t.description[:50])
        if key not in seen:
            seen.add(key)
            unique.append(t)
    return unique


def parse_csv(file_bytes: bytes, user_id: str, bank_hint: str = "auto") -> list[Transaction]:
    """
    Main entry point. Parse CSV bytes into Transaction list.
    Raises ValueError with user-friendly Russian messages on failure.
    """
    if len(file_bytes) > MAX_FILE_SIZE:
        raise ValueError("Файл слишком большой. Максимум 5 МБ")

    encoding = detect_encoding(file_bytes)
    text = file_bytes.decode(encoding, errors="replace")

    reader = csv.DictReader(io.StringIO(text), delimiter=";")
    # Some banks use comma as delimiter
    if not reader.fieldnames or len(reader.fieldnames) < 2:
        reader = csv.DictReader(io.StringIO(text), delimiter=",")

    if not reader.fieldnames:
        raise ValueError("Не смогли прочитать файл. Попробуй CSV из Т-Банка")

    bank = bank_hint if bank_hint != "auto" else detect_bank_format(list(reader.fieldnames))

    rows_read = 0
    transactions: list[Transaction] = []

    if bank == "tbank":
        transactions = _parse_tbank(reader, user_id)
    elif bank == "sber":
        transactions = _parse_sber(reader, user_id)
    else:
        transactions = _parse_generic(reader, user_id)

    rows_read = len(transactions)

    if not transactions:
        raise ValueError(
            "Не нашли транзакций. Убедись, что загружаешь выписку расходов"
        )

    transactions = deduplicate(transactions)
    truncated = len(transactions) > MAX_ROWS
    transactions = transactions[:MAX_ROWS]

    # Sort by date DESC
    transactions.sort(key=lambda t: t.transaction_date, reverse=True)

    return transactions
