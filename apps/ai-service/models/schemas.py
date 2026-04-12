"""
Pydantic models for request/response validation.
Source: docs/Pseudocode.md data structures, docs/Specification.md API contracts
"""
from datetime import date
from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


class TransactionCategory(str, Enum):
    FOOD_DELIVERY = "food_delivery"
    RESTAURANTS = "restaurants"
    SUBSCRIPTIONS = "subscriptions"
    TRANSPORT = "transport"
    GROCERIES = "groceries"
    SHOPPING = "shopping"
    UTILITIES = "utilities"
    ENTERTAINMENT = "entertainment"
    SAVINGS = "savings"
    OTHER = "other"


class TransactionSource(str, Enum):
    CSV = "csv"
    MANUAL = "manual"
    BANK_API = "bank_api"
    SMS = "sms"


class Transaction(BaseModel):
    id: str
    user_id: str
    amount: float          # always negative for expenses
    currency: str = "RUB"
    category: TransactionCategory = TransactionCategory.OTHER
    description: str = ""
    merchant: str = ""
    transaction_date: date
    source: TransactionSource = TransactionSource.CSV
    is_subscription: bool = False
    created_at: str = ""


class CategorySummary(BaseModel):
    category: TransactionCategory
    total: float
    percent: float
    count: int
    transactions: list[Transaction] = []


class SubscriptionConfidence(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class Subscription(BaseModel):
    name: str
    amount_per_month: float
    last_charge_date: date
    confidence: SubscriptionConfidence
    is_active: bool = True
    transaction_ids: list[str] = []


# ------ Request/Response models ------

class AnalyzeRequest(BaseModel):
    user_id: str
    bank: Literal["tbank", "sber", "alfa", "auto"] = "auto"


class AnalyzeResponse(BaseModel):
    transactions: list[Transaction]
    categories: list[CategorySummary]
    parasites: list[Subscription]
    period: dict[str, str]
    total_spent: float


class AnalyzeContextRequest(BaseModel):
    """JSON-based analyze for BFF chat (transactions already in DB)."""
    user_id: str
    transactions: list[Transaction]


class AnalyzeContextResponse(BaseModel):
    """Lightweight context for AI chat system prompt."""
    categories: list[dict]   # [{name, percent, total}]
    parasites: list[dict]    # [{name, amount_per_month}]
    total_spent: float


class RoastRequest(BaseModel):
    user_id: str
    period: Literal["last_month", "last_3_months", "all"] = "last_month"
    categories: list[CategorySummary]
    parasites: list[Subscription]
    total_spent: float
    plan: Literal["free", "plus"] = "free"  # passed by BFF; determines monthly limit enforcement


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    user_id: str
    session_id: str
    message: str
    history: list[ChatMessage] = []
    context: dict = {}  # { total_spent, top_categories, parasites, period }
    plan: Literal["free", "plus"] = "free"


class ParasitesRequest(BaseModel):
    transactions: list[Transaction]


class ParasitesResponse(BaseModel):
    parasites: list[Subscription]
    total_monthly_waste: float


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"] = "ok"
    version: str = "0.1.0"
    llm: Literal["connected", "fallback", "unavailable"] = "connected"
