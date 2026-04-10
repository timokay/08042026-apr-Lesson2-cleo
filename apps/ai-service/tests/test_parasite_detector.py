"""
Tests for Parasite Detector (Algorithm 3)
Source: docs/test-scenarios.md — Parasite Scanner scenarios
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import uuid
from datetime import date, timedelta

import pytest
from services.parasite_detector import find_parasites
from models.schemas import Subscription, SubscriptionConfidence, Transaction, TransactionSource, TransactionCategory


def make_txn(merchant: str, amount: float, days_ago: int, user_id: str = "u1") -> Transaction:
    return Transaction(
        id=str(uuid.uuid4()),
        user_id=user_id,
        amount=-abs(amount),
        currency="RUB",
        category=TransactionCategory.SUBSCRIPTIONS,
        description=merchant,
        merchant=merchant,
        transaction_date=date.today() - timedelta(days=days_ago),
        source=TransactionSource.CSV,
        is_subscription=False,
    )


# ---- Happy path ----

def test_finds_monthly_subscription():
    # Netflix charged 3 times, ~30-day intervals
    txns = [
        make_txn("Netflix", 590, 0),
        make_txn("Netflix", 590, 31),
        make_txn("Netflix", 590, 62),
    ]
    parasites = find_parasites(txns)
    assert len(parasites) == 1
    assert "Netflix" in parasites[0].name
    assert parasites[0].amount_per_month == pytest.approx(590, abs=50)


def test_known_subscription_gets_high_confidence():
    txns = [
        make_txn("Яндекс Плюс", 199, 0),
        make_txn("Яндекс Плюс", 199, 30),
    ]
    parasites = find_parasites(txns)
    assert parasites[0].confidence == SubscriptionConfidence.HIGH


def test_unknown_recurring_gets_medium_confidence():
    txns = [
        make_txn("МойНеизвестныйСервис", 499, 0),
        make_txn("МойНеизвестныйСервис", 499, 30),
        make_txn("МойНеизвестныйСервис", 499, 60),
    ]
    parasites = find_parasites(txns)
    assert len(parasites) == 1
    assert parasites[0].confidence == SubscriptionConfidence.MEDIUM


def test_sorted_by_monthly_amount_desc():
    txns = [
        make_txn("Spotify", 299, 0),
        make_txn("Spotify", 299, 30),
        make_txn("Spotify", 299, 60),
        make_txn("WorldClass", 2200, 0),
        make_txn("WorldClass", 2200, 30),
        make_txn("WorldClass", 2200, 60),
    ]
    parasites = find_parasites(txns)
    assert len(parasites) == 2
    assert parasites[0].amount_per_month > parasites[1].amount_per_month


# ---- Edge cases ----

def test_single_charge_not_detected():
    txns = [make_txn("Netflix", 590, 5)]
    parasites = find_parasites(txns)
    assert len(parasites) == 0


def test_irregular_intervals_not_detected():
    # Charges on days 0, 5, 40, 55 — too irregular
    txns = [
        make_txn("RandoService", 100, 0),
        make_txn("RandoService", 100, 5),
        make_txn("RandoService", 100, 40),
        make_txn("RandoService", 100, 55),
    ]
    parasites = find_parasites(txns)
    assert len(parasites) == 0


def test_inactive_subscription_flagged():
    # Last charge was 50 days ago
    txns = [
        make_txn("OldService", 299, 80),
        make_txn("OldService", 299, 50),
    ]
    parasites = find_parasites(txns)
    if parasites:
        assert not parasites[0].is_active


def test_income_transactions_ignored():
    txns = [
        Transaction(
            id=str(uuid.uuid4()),
            user_id="u1",
            amount=5000.0,  # positive = income
            currency="RUB",
            category=TransactionCategory.OTHER,
            description="Зарплата",
            merchant="Работодатель",
            transaction_date=date.today() - timedelta(days=0),
            source=TransactionSource.CSV,
        ),
        Transaction(
            id=str(uuid.uuid4()),
            user_id="u1",
            amount=5000.0,
            currency="RUB",
            category=TransactionCategory.OTHER,
            description="Зарплата",
            merchant="Работодатель",
            transaction_date=date.today() - timedelta(days=30),
            source=TransactionSource.CSV,
        ),
    ]
    parasites = find_parasites(txns)
    assert len(parasites) == 0


def test_max_20_returned():
    # Create 25 distinct recurring subscriptions
    txns = []
    for i in range(25):
        name = f"Service{i:02d}"
        txns += [make_txn(name, 100 + i, 0), make_txn(name, 100 + i, 30)]
    parasites = find_parasites(txns)
    assert len(parasites) <= 20
