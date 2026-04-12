# Specification: Upgrade to Plus

## User Stories

| ID | Story | Priority |
|----|-------|----------|
| US-050 | Как free пользователь, хочу видеть страницу с описанием Plus плана | Must |
| US-051 | Как free пользователь, хочу оплатить через Robokassa и сразу получить Plus | Must |
| US-052 | Как Plus пользователь, хочу видеть свой план и дату истечения | Should |
| US-053 | Как Plus пользователь, хочу продлить план нажав "Продлить" | Should |
| US-054 | Как plus пользователь, хочу делать безлимитные ростеры | Must |
| US-055 | Как expired plus пользователь, хочу быть автоматически возвращён на free | Must |

## Acceptance Criteria

### US-051 (Оплата)
```gherkin
Given пользователь на free плане на /upgrade
When нажимает "Оплатить через Robokassa"
Then создаётся invoice, redirect на Robokassa page

Given пользователь оплатил на Robokassa
When Robokassa отправляет webhook на /api/payments/webhook
Then profile.plan = 'plus', profile.plan_expires_at = now() + 30 дней

Given пользователь успешно оплатил
When redirect обратно на /upgrade?success=1
Then показывается "Оплата прошла! Теперь ты Plus ⚡"
```

### US-054 (Plan enforcement)
```gherkin
Given пользователь с plan='plus' И plan_expires_at в будущем
When делает запрос на ростер
Then monthly limit check пропускается → ростер генерируется

Given пользователь с plan='plus' НО plan_expires_at в прошлом
When делает запрос на ростер
Then обрабатывается как free (monthly limit применяется)
```

## API Контракты

### POST /api/payments/create-invoice

**Auth:** JWT (обязателен)

**Request:** `{}`  (amount и plan фиксированы в env)

**Response 200:**
```json
{
  "invoice_id": "KLV-1234567",
  "payment_url": "https://auth.robokassa.ru/Merchant/Index.aspx?...",
  "amount": 299.00,
  "expires_at": "2025-04-12T15:00:00Z"
}
```

**Errors:** 401 UNAUTHORIZED, 409 ALREADY_SUBSCRIBED

### POST /api/payments/webhook (ResultURL от Robokassa)

**Auth:** Нет — только MD5 signature verification

**Request (form-encoded от Robokassa):**
```
OutSum=299.00&InvoiceId=KLV-1234567&SignatureValue=abc123...&shp_user_id=uuid
```

**Validation:**
```
md5(f"{OutSum}:{InvoiceId}:{Password2}:{shp_user_id}") == SignatureValue
```

**Response 200:** `OK{InvoiceId}` (строго такой формат для Robokassa!)

**Response 400:** Bad Request (если signature invalid)

### GET /api/payments/status

**Auth:** JWT

**Response:**
```json
{
  "plan": "plus",
  "plan_expires_at": "2025-05-12T00:00:00Z",
  "days_remaining": 30
}
```

## Database Changes

### Новая таблица: payment_transactions

```sql
CREATE TABLE payment_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id),
  invoice_id    TEXT NOT NULL UNIQUE,  -- идемпотентность
  amount        DECIMAL(10,2) NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  robokassa_id  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at       TIMESTAMPTZ
);
```

### Изменения profiles (уже есть):
- `plan TEXT DEFAULT 'free' CHECK (plan IN ('free','plus','pro'))` ✅
- `plan_expires_at TIMESTAMPTZ` ✅

## Environment Variables (новые)

```
ROBOKASSA_MERCHANT_LOGIN=klevo_merchant
ROBOKASSA_PASSWORD1=xxx  # для создания invoice
ROBOKASSA_PASSWORD2=yyy  # для проверки webhook
ROBOKASSA_TEST_MODE=true # false в production
PLUS_PRICE_RUB=299.00
PLUS_DURATION_DAYS=30
```

## Plan Enforcement Logic

```python
async def check_roast_allowed(user_id: str) -> tuple[bool, str]:
    """Returns (allowed, reason)"""
    profile = await get_profile(user_id)
    
    # Plus/Pro with valid expiry → unlimited
    if profile.plan in ('plus', 'pro'):
        if profile.plan_expires_at and profile.plan_expires_at > datetime.now(UTC):
            return True, "plus_active"
        else:
            # Expired → downgrade
            await downgrade_to_free(user_id)
    
    # Free → check monthly limit
    return await check_monthly_limit(user_id)
```
