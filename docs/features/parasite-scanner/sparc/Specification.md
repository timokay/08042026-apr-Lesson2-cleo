# Specification: Parasite Scanner

## User Stories

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| US-010 | Как пользователь, хочу видеть список подписок с суммой/мес | SubscriptionList с monthly amount и confidence badge |
| US-011 | Как пользователь, хочу знать о неактивных подписках | Отмечены как "неактивная" если > 45 дней без списания |
| US-012 | Как пользователь, хочу отсортированный список | Самые дорогие подписки первыми |

## Модель данных

### Subscription (packages/types/src/index.ts)
```typescript
interface Subscription {
  name: string                // display name (max 60 chars)
  amount_per_month: number    // normalized to 30-day month
  last_charge_date: string    // ISO date
  confidence: "high" | "medium" | "low"
  is_active: boolean          // false if > 45 days since last charge
  transaction_ids: string[]   // IDs для drill-down
}
```

### Python schema (apps/ai-service/models/schemas.py)
```python
class SubscriptionConfidence(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class Subscription(BaseModel):
    name: str
    amount_per_month: float
    last_charge_date: date
    confidence: SubscriptionConfidence
    is_active: bool
    transaction_ids: list[str]
```

## API

Parasite Scanner вызывается внутри POST /analyze (не отдельный эндпоинт).

**Ответ включён в UploadResponseBody.parasites:**
```json
[
  {
    "name": "Яндекс Плюс",
    "amount_per_month": 299.0,
    "last_charge_date": "2025-03-15",
    "confidence": "high",
    "is_active": true,
    "transaction_ids": ["uuid1", "uuid2", "uuid3"]
  }
]
```

## Правила определения подписки

```
recurring = std_dev(intervals) < 5 дней
         AND 7 ≤ avg_interval ≤ 35 дней
active    = (today - last_charge_date) ≤ 45 дней
confidence = "high" IF merchant IN KNOWN_SUBSCRIPTIONS AND recurring
           = "medium" IF recurring
           = "low"  IF NOT recurring (не используется — такие не добавляются)
```

## Ограничения

- Минимум 2 списания для определения паттерна
- Только расходы (amount < 0)
- Нормализация по merchant[:40].lower() для группировки
- Top 20 по сумме/мес (не все)
