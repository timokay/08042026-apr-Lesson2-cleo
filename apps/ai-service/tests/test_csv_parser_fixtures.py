"""
Integration tests for CSV Parser using real fixture files.
Source: docs/test-scenarios.md — mandatory test cases
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from pathlib import Path
from services.csv_parser import parse_csv

FIXTURES = Path(__file__).parent / "fixtures"
USER_ID = "fixture-user"


def test_tbank_utf8_fixture_50_transactions():
    """Happy path: valid T-Bank CSV → 50 transactions parsed."""
    data = (FIXTURES / "tbank_march2025.csv").read_bytes()
    txns = parse_csv(data, USER_ID, bank_hint="tbank")
    assert len(txns) == 50
    assert all(t.amount < 0 for t in txns)
    assert all(t.user_id == USER_ID for t in txns)


def test_tbank_cp1251_fixture_decoded_correctly():
    """cp1251 encoding is detected and decoded without errors."""
    data = (FIXTURES / "tbank_cp1251.csv").read_bytes()
    txns = parse_csv(data, USER_ID)
    assert len(txns) == 50


def test_incoming_only_raises_no_transactions():
    """CSV with only income → raises ValueError (no expenses found)."""
    data = (FIXTURES / "tbank_incoming_only.csv").read_bytes()
    with pytest.raises(ValueError, match="\u041d\u0435 \u043d\u0430\u0448\u043b\u0438 \u0442\u0440\u0430\u043d\u0437\u0430\u043a\u0446\u0438\u0439"):
        parse_csv(data, USER_ID)


def test_large_2000_rows_truncated_to_1000():
    """2000-row CSV → only first 1000 processed."""
    data = (FIXTURES / "large_2000_rows.csv").read_bytes()
    txns = parse_csv(data, USER_ID)
    assert len(txns) <= 1000
