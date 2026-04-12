# Completion: Upgrade to Plus — Definition of Done

## Pre-Deployment Checklist

### Robokassa Setup
- [ ] Зарегистрирован аккаунт Robokassa (требует ИП/ООО)
- [ ] Получены MERCHANT_LOGIN, PASSWORD1, PASSWORD2
- [ ] Настроен ResultURL: `https://klevo.app/api/payments/webhook`
- [ ] Настроен SuccessURL: `https://klevo.app/upgrade?success=1`
- [ ] Настроен FailURL: `https://klevo.app/upgrade?failed=1`
- [ ] Тестовый режим проверен (IsTest=1)

### Environment Variables
- [ ] `ROBOKASSA_MERCHANT_LOGIN` задан
- [ ] `ROBOKASSA_PASSWORD1` задан
- [ ] `ROBOKASSA_PASSWORD2` задан
- [ ] `ROBOKASSA_TEST_MODE=false` в production
- [ ] `PLUS_PRICE_RUB=299.00` задан
- [ ] `PLUS_DURATION_DAYS=30` задан

### Database
- [ ] `packages/db/schema/004_payments.sql` применён
- [ ] `payment_transactions` table создана
- [ ] RLS: только владелец читает свои транзакции
- [ ] `profiles.plan`, `profiles.plan_expires_at` уже существуют ✅

### Backend
- [ ] `app/api/payments/create-invoice/route.ts` — create invoice + Robokassa URL
- [ ] `app/api/payments/webhook/route.ts` — MD5 verify + plan update
- [ ] `app/api/payments/status/route.ts` — текущий план
- [ ] `lib/robokassa.ts` — signature helpers
- [ ] `apps/ai-service/services/rate_limiter.py` — plan check добавлен

### Frontend
- [ ] `app/upgrade/page.tsx` — plans comparison + pay button
- [ ] Success/Failed states на /upgrade
- [ ] /settings показывает plan + expires_at + "Продлить" кнопка

### Tests
- [ ] Webhook signature verification тест
- [ ] Idempotency тест (duplicate webhook)
- [ ] Plan enforcement тест (plus bypass, expired downgrade)
- [ ] create-invoice: уже подписан тест

## Deployment Sequence

1. Применить `004_payments.sql` миграцию
2. Задать env vars на VPS
3. `docker compose up -d --build web`
4. Тестовый платёж через Robokassa Test Mode (IsTest=1)
5. Проверить webhook в логах
6. Переключить `ROBOKASSA_TEST_MODE=false`
7. Полная оплата тестовой картой Robokassa

## Monitoring & Alerting

| Метрика | Порог | Alert |
|---------|-------|-------|
| webhook 400 rate | > 2% | Slack (возможная атака) |
| Payment conversion | < 1% | Slack (UX issue) |
| plan_expires_at downgrade rate | > 50% | Email (retention issue) |

## Rollback Plan

1. `ROBOKASSA_TEST_MODE=true` — остановить реальные платежи
2. Если webhook ломает DB: reverse migration `004_payments.sql`
3. profiles.plan → все сбросить в 'free' (admin query)

## Logging

Обязательные log events:
- `INFO: User {id} created invoice {invoice_id}`
- `INFO: User {id} upgraded to Plus, expires {date}`
- `INFO: User {id} plan expired, downgraded to free`
- `WARNING: Invalid Robokassa signature for invoice {id}`
- `WARNING: Duplicate webhook for invoice {id}, ignoring`
