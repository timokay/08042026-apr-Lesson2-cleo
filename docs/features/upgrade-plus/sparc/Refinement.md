# Refinement: Upgrade to Plus

## Edge Cases Matrix

| # | Сценарий | Expected | Handling |
|---|----------|----------|---------|
| E1 | Пользователь уже Plus (активный) → попытка оплатить снова | 409 ALREADY_SUBSCRIBED | check plan_expires_at в create-invoice |
| E2 | Webhook с неверной подписью | 400, игнорировать | MD5 verify ПЕРЕД DB изменениями |
| E3 | Webhook пришёл дважды (Robokassa retry) | 200 OK, no duplicate | InvoiceId UNIQUE + idempotency check |
| E4 | plan_expires_at истёк → запрос роастера | Downgrade to free, check monthly limit | on-demand check в check_roast_allowed() |
| E5 | Robokassa недоступен → создание invoice | 503 с retry CTA | try/catch в create-invoice |
| E6 | shp_user_id не передан в webhook | 400 BAD_REQUEST | Validate presence перед MD5 |
| E7 | Пользователь нажал "Назад" на странице Robokassa | plan = free, /upgrade?failed=1 | FailURL обработчик |
| E8 | Concurrent webhooks (race condition) | Один обработан, другой idempotent | UNIQUE constraint на InvoiceId |
| E9 | ROBOKASSA_PASSWORD2 не задан | 500 + логирование | startup check env vars |
| E10 | Сумма в webhook != ожидаемой (289 вместо 299) | Reject: подозрительный запрос | Сравнить OutSum с txn.amount |

## Тест-план

```gherkin
Scenario: Happy path payment
  Given пользователь на free плане
  When POST /api/payments/create-invoice
  Then получает payment_url c Robokassa параметрами
  And payment_transactions создана со status='pending'
  When Robokassa POST webhook с правильной подписью
  Then profile.plan = 'plus', plan_expires_at = now()+30d
  And payment_transactions.status = 'paid'
  And response body = "OKKL-xxx"

Scenario: Invalid webhook signature
  Given webhook с неверным SignatureValue
  When POST /api/payments/webhook
  Then response 400
  And profile.plan не изменился

Scenario: Duplicate webhook
  Given invoice KLV-123 уже status='paid'
  When Robokassa повторно POST webhook
  Then response 200 "OK{id}"
  And plan и БД не изменились

Scenario: Plus bypass monthly limit
  Given profile.plan='plus', plan_expires_at=future
  When запрос на ростер
  Then monthly limit не проверяется → ростер генерируется

Scenario: Expired plus → downgrade
  Given profile.plan='plus', plan_expires_at=past
  When запрос на ростер
  Then profile.plan='free' автоматически
  And monthly limit применяется
```

## Security Hardening

- Password1 и Password2 — в `.env` только, НИКОГДА в коде
- Webhook URL — HTTPS (Robokassa требует)
- MD5 verification до DB changes (no TOCTOU)
- InvoiceId не предсказуем (timestamp + random)
- `shp_user_id` входит в MD5 — нельзя подменить

## Performance

- create-invoice: ~200ms (1 DB read + 1 DB write + URL build)
- webhook: ~100ms (2 DB writes + verify)
- check_plan_active: ~50ms (1 DB read, можно кешировать в Redis)

**Optimization:** кешировать plan в Redis с TTL=5мин (не критично для v1).

## Technical Debt Items

- v1: ручное продление → v2: автоплатёж через ЮKassa RecurringPayments
- v1: no email notifications → v2: "3 дня до истечения" email
- v1: MD5 (Robokassa legacy) → v2: SHA256 (Robokassa новый API)
- v1: no refund handling → v2: webhook для возврата → plan downgrade
