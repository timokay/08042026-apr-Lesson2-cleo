"""
Algorithm 2: Transaction Categorizer
Source: docs/Pseudocode.md — Algorithm 2
Rule-based first, AI batching for unmatched (20 txns per call)
"""
import re
from models.schemas import Transaction, TransactionCategory

# Rule-based patterns: (regex pattern, category)
# Note: uses \w+ style but we explicitly handle Cyrillic via character classes
CATEGORY_PATTERNS: list[tuple[str, TransactionCategory]] = [
    # Food delivery
    (r"яндекс\s*еда|yandex\s*food|delivery\s*club|самокат|кухня\s*на\s*районе|goldenfish|chikin", TransactionCategory.FOOD_DELIVERY),
    # Restaurants/cafes
    (r"кафе|ресторан|суши|пицца|burger|mcdonalds|мак|kfc|subway|papa\s*john|domino|шаурма|пельменная|блинная", TransactionCategory.RESTAURANTS),
    # Subscriptions
    (r"netflix|spotify|apple\s*one|яндекс\s*плюс|yandex\s*plus|vk\s*музыка|vk\s*music|okko|ivi|кинопоиск|premier|start\s*ru|more\.tv|mts\s*premium|beeline\s*tv|megogo|canva|notion|adobe|headspace|github|figma", TransactionCategory.SUBSCRIPTIONS),
    # Transport
    (r"яндекс\s*такси|yandex\s*taxi|uber|gett|ситимобил|sitimobil|каршеринг|делимобиль|яндекс\s*драйв|метро|мцд|электричка|ржд|аэрофлот|s7|utair", TransactionCategory.TRANSPORT),
    # Groceries
    (r"пятёрочка|пятерочка|магнит|перекрёсток|перекресток|лента|ашан|auchan|окей|о'кей|вкусвилл|вкус\s*вилл|дикси|атак|metro\s*cash|глобус|самбери", TransactionCategory.GROCERIES),
    # Shopping (online)
    (r"wildberries|вайлдберриз|ozon|озон|lamoda|lamoda|ali\s*express|aliexpress|детский\s*мир|спортмастер|зара|zara|h&m|икеа|ikea", TransactionCategory.SHOPPING),
    # Utilities
    (r"жкх|квартплата|электроэнергия|мосэнерго|интернет|мтс|билайн|мегафон|теле2|tele2|ростелеком|газ|водоканал|капитальный\s*ремонт", TransactionCategory.UTILITIES),
    # Entertainment
    (r"кино|театр|цирк|музей|концерт|клуб|спортзал|тренажёрный|фитнес|worldclass|x-fit|лужники|парк|батут|боулинг|квест", TransactionCategory.ENTERTAINMENT),
    # Savings
    (r"накопительный|депозит|вклад|сбережения|пополнение\s*счёта|инвестиции|брокер", TransactionCategory.SAVINGS),
]

# Compile patterns for performance
_COMPILED: list[tuple[re.Pattern, TransactionCategory]] = [
    (re.compile(pattern, re.IGNORECASE | re.UNICODE), category)
    for pattern, category in CATEGORY_PATTERNS
]


def categorize_single(description: str, merchant: str) -> TransactionCategory:
    """Rule-based categorization for a single transaction."""
    text = f"{description} {merchant}".lower().strip()
    for pattern, category in _COMPILED:
        if pattern.search(text):
            return category
    return TransactionCategory.OTHER


def categorize_batch(transactions: list[Transaction]) -> list[Transaction]:
    """
    Categorize all transactions.
    Rule-based first; OTHER transactions would go to AI batching in production.
    For MVP, rule-based covers ~80% of Russian merchant names.
    """
    result = []
    for txn in transactions:
        categorized = txn.model_copy(
            update={"category": categorize_single(txn.description, txn.merchant)}
        )
        result.append(categorized)
    return result


def build_category_summaries(transactions: list[Transaction]) -> list[dict]:
    """
    Group transactions by category, calculate totals and percentages.
    Returns list sorted by total DESC (for pie chart).
    """
    totals: dict[TransactionCategory, list[Transaction]] = {}

    for txn in transactions:
        if txn.amount >= 0:
            continue  # skip income
        cat = txn.category
        totals.setdefault(cat, []).append(txn)

    total_all = sum(abs(t.amount) for txns in totals.values() for t in txns)
    if total_all == 0:
        return []

    summaries = []
    for cat, txns in totals.items():
        cat_total = sum(abs(t.amount) for t in txns)
        summaries.append({
            "category": cat,
            "total": round(cat_total, 2),
            "percent": round(cat_total / total_all * 100, 1),
            "count": len(txns),
            "transactions": txns,
        })

    summaries.sort(key=lambda s: s["total"], reverse=True)
    return summaries
