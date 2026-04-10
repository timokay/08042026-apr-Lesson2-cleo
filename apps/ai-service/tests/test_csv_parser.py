"""
Tests for CSV Parser (Algorithm 1)
Source: docs/test-scenarios.md — CSV Upload scenarios
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from services.csv_parser import detect_encoding, parse_csv, deduplicate
from models.schemas import Transaction


# ---- Fixtures ----

_TBANK_CSV_STR = (
    "\u0414\u0430\u0442\u0430 \u043e\u043f\u0435\u0440\u0430\u0446\u0438\u0438;"
    "\u0421\u0443\u043c\u043c\u0430 \u043e\u043f\u0435\u0440\u0430\u0446\u0438\u0438;MCC;"
    "\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435;"
    "\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044f\n"
    "01.03.2025;-450.00;;\u042f\u043d\u0434\u0435\u043a\u0441 \u0415\u0434\u0430;"
    "\u0415\u0434\u0430\n"
    "02.03.2025;-320.00;;\u042f\u043d\u0434\u0435\u043a\u0441 \u0422\u0430\u043a\u0441\u0438;"
    "\u0422\u0440\u0430\u043d\u0441\u043f\u043e\u0440\u0442\n"
    "03.03.2025;-199.00;;\u042f\u043d\u0434\u0435\u043a\u0441 \u041f\u043b\u044e\u0441;"
    "\u041f\u043e\u0434\u043f\u0438\u0441\u043a\u0438\n"
    "04.03.2025;-1250.00;;"
    "\u041f\u044f\u0442\u0451\u0440\u043e\u0447\u043a\u0430;"
    "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u044b\n"
    "05.03.2025;-890.00;;"
    "\u041a\u0430\u0444\u0435 \u0411\u0443\u0444\u0435\u0442;"
    "\u0420\u0435\u0441\u0442\u043e\u0440\u0430\u043d\u044b\n"
)
TBANK_CSV_UTF8: bytes = _TBANK_CSV_STR.encode("utf-8")
TBANK_CSV_CP1251: bytes = _TBANK_CSV_STR.encode("cp1251")

_TBANK_INCOMING_STR = (
    "\u0414\u0430\u0442\u0430 \u043e\u043f\u0435\u0440\u0430\u0446\u0438\u0438;"
    "\u0421\u0443\u043c\u043c\u0430 \u043e\u043f\u0435\u0440\u0430\u0446\u0438\u0438;MCC;"
    "\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435\n"
    "01.03.2025;5000.00;;"
    "\u041f\u0435\u0440\u0435\u0432\u043e\u0434 \u043e\u0442 \u043c\u0430\u043c\u044b\n"
    "02.03.2025;15000.00;;\u0417\u0430\u0440\u043f\u043b\u0430\u0442\u0430\n"
)
TBANK_INCOMING_ONLY: bytes = _TBANK_INCOMING_STR.encode("utf-8")

UNSUPPORTED_CONTENT = b"PK\x03\x04This is a docx file, not CSV"

USER_ID = "test-user-123"


# ---- Encoding detection ----

def test_detect_encoding_utf8():
    assert detect_encoding("Привет мир".encode("utf-8")) == "utf-8"


def test_detect_encoding_cp1251():
    assert detect_encoding("Привет мир".encode("cp1251")) == "cp1251"


# ---- Happy path ----

def test_parse_tbank_utf8_returns_transactions():
    txns = parse_csv(TBANK_CSV_UTF8, USER_ID)
    assert len(txns) == 5
    assert all(t.user_id == USER_ID for t in txns)
    assert all(t.amount < 0 for t in txns)


def test_parse_tbank_cp1251_handles_encoding():
    txns = parse_csv(TBANK_CSV_CP1251, USER_ID)
    assert len(txns) == 5


def test_parse_returns_sorted_by_date_desc():
    txns = parse_csv(TBANK_CSV_UTF8, USER_ID)
    dates = [t.transaction_date for t in txns]
    assert dates == sorted(dates, reverse=True)


# ---- Edge cases ----

def test_incoming_only_csv_raises():
    with pytest.raises(ValueError, match="Не нашли транзакций"):
        parse_csv(TBANK_INCOMING_ONLY, USER_ID)


def test_file_too_large_raises():
    large = b"x" * (6 * 1024 * 1024)
    with pytest.raises(ValueError, match="Файл слишком большой"):
        parse_csv(large, USER_ID)


def test_unsupported_format_raises():
    with pytest.raises(ValueError):
        parse_csv(UNSUPPORTED_CONTENT, USER_ID)


# ---- Deduplication ----

def test_deduplicate_removes_exact_duplicates():
    txns = parse_csv(TBANK_CSV_UTF8, USER_ID)
    doubled = txns + txns  # force duplicates
    unique = deduplicate(doubled)
    assert len(unique) == len(txns)


# ---- Row limit ----

def test_2000_rows_truncated_to_1000():
    header = (
        "\u0414\u0430\u0442\u0430 \u043e\u043f\u0435\u0440\u0430\u0446\u0438\u0438;"
        "\u0421\u0443\u043c\u043c\u0430 \u043e\u043f\u0435\u0440\u0430\u0446\u0438\u0438;MCC;Opisanie\n"
    ).encode("utf-8")
    rows = "01.03.2025;-100.00;;\u041c\u0430\u0433\u0430\u0437\u0438\u043d\n".encode("utf-8") * 2000
    csv_content = header + rows
    txns = parse_csv(csv_content, USER_ID)
    assert len(txns) <= 1000
