"""
Algorithm 3: Parasite Detector
Source: docs/Pseudocode.md — Algorithm 3
Detects recurring subscriptions from transaction history.
"""
import statistics
from datetime import date, timedelta

from models.schemas import Subscription, SubscriptionConfidence, Transaction

# Seed list of known subscription keywords for HIGH confidence
KNOWN_SUBSCRIPTIONS = {
    "netflix", "spotify", "apple one", "apple music", "яндекс плюс", "yandex plus",
    "vk музыка", "vk music", "okko", "ivi", "кинопоиск", "kinopoisk", "premier",
    "start ru", "more.tv", "mts premium", "beeline tv", "megogo", "canva",
    "notion", "adobe", "headspace", "github", "figma", "zoom",
    "worldclass", "x-fit", "1с", "антивирус",
}


def _normalize_merchant(merchant: str) -> str:
    """Normalize merchant name for grouping."""
    return merchant.lower().strip()[:40]


def _is_known_subscription(name: str) -> bool:
    name_lower = name.lower()
    return any(sub in name_lower for sub in KNOWN_SUBSCRIPTIONS)


def _estimate_monthly_amount(amounts: list[float], intervals: list[float]) -> float:
    """Estimate monthly cost from observed amounts and intervals."""
    avg_amount = abs(sum(amounts) / len(amounts)) if amounts else 0
    avg_interval = sum(intervals) / len(intervals) if intervals else 30
    # Normalize to 30-day month
    if avg_interval == 0:
        return avg_amount
    return round(avg_amount * (30 / avg_interval), 2)


def find_parasites(transactions: list[Transaction]) -> list[Subscription]:
    """
    Main algorithm:
    1. Group by normalized merchant name
    2. Check for recurring intervals (std deviation < 5 days)
    3. Classify confidence
    4. Return top-20 sorted by monthly cost DESC
    """
    # Group by merchant
    groups: dict[str, list[Transaction]] = {}
    for txn in transactions:
        if txn.amount >= 0:
            continue  # skip income
        key = _normalize_merchant(txn.merchant or txn.description)
        groups.setdefault(key, []).append(txn)

    parasites: list[Subscription] = []

    for merchant_key, txns in groups.items():
        if len(txns) < 2:
            continue  # need at least 2 charges to detect pattern

        # Sort by date
        txns.sort(key=lambda t: t.transaction_date)
        dates = [t.transaction_date for t in txns]
        amounts = [t.amount for t in txns]

        # Calculate intervals between charges
        intervals = [
            (dates[i + 1] - dates[i]).days
            for i in range(len(dates) - 1)
        ]

        if not intervals:
            continue

        avg_interval = sum(intervals) / len(intervals)
        std_dev = statistics.stdev(intervals) if len(intervals) > 1 else 0

        # Check recurring pattern: std_dev < 5 days AND reasonable interval
        is_recurring = std_dev < 5 and 7 <= avg_interval <= 35

        if not is_recurring:
            continue

        last_date = dates[-1]
        days_since_last = (date.today() - last_date).days
        is_active = days_since_last <= 45  # consider inactive if > 45 days

        # Determine confidence
        is_known = _is_known_subscription(merchant_key)
        if is_known and is_recurring:
            confidence = SubscriptionConfidence.HIGH
        elif is_recurring:
            confidence = SubscriptionConfidence.MEDIUM
        else:
            confidence = SubscriptionConfidence.LOW

        monthly_amount = _estimate_monthly_amount(amounts, intervals)

        # Use the most common display name from transactions
        display_name = max(
            set(t.merchant or t.description for t in txns),
            key=lambda n: sum(1 for t in txns if (t.merchant or t.description) == n)
        )

        parasites.append(Subscription(
            name=display_name[:60],
            amount_per_month=monthly_amount,
            last_charge_date=last_date,
            confidence=confidence,
            is_active=is_active,
            transaction_ids=[t.id for t in txns],
        ))

    # Sort by monthly cost DESC (biggest waste first), return top 20
    parasites.sort(key=lambda s: s.amount_per_month, reverse=True)
    return parasites[:20]
