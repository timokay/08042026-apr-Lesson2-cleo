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

TBANK_CSV_UTF8 = b"""Дата операции;Сумма операции;MCC;Описание;Категория
01.03.2025;-450.00;;Яндекс Еда;Еда
02.03.2025;-320.00;;Яндекс Такси;Транспорт
03.03.2025;-199.00;;Яндекс Плюс;Подписки
04.03.2025;-1250.00;;Пятёрочка;Продукты
05.03.2025;-890.00;;Кафе Буфет;Рестораны
"""

TBANK_CSV_CP1251 = TBANK_CSV_UTF8.decode("utf-8").encode("cp1251")

TBANK_INCOMING_ONLY = b"""Дата операции;Сумма операции;MCC;Описание
01.03.2025;5000.00;;Перевод от мамы
02.03.2025;15000.00;;Зарплата
"""

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
    header = b"Дата операции;Сумма операции;MCC;Opisanie\n"
    rows = b"01.03.2025;-100.00;;Магазин\n" * 2000
    csv_content = header + rows
    txns = parse_csv(csv_content, USER_ID)
    assert len(txns) <= 1000
