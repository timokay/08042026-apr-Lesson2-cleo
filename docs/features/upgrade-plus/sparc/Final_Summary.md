# Final Summary: Upgrade to Plus

## Обзор

**Upgrade to Plus** — система монетизации Клёво. Robokassa payment integration + Plus план 299₽/мес + enforcement ограничений.

## Problem & Solution

**Problem:** Клёво без revenue. Free plan → нет денег на Claude API → нет масштабирования.

**Solution:** Robokassa redirect flow (минимальная сложность) → webhook → plan upgrade. Ручное продление (v1). Минимальный viable payment.

## Target Users

Free пользователи, которые достигли лимита (1 ростер/мес) — самый высокий conversion intent.

## Key Features

1. **Payment Flow** — create-invoice → Robokassa redirect → webhook → Plus активирован
2. **Plan Enforcement** — Plus bypass monthly limit; expired → auto-downgrade to free
3. **/upgrade page** — сравнение планов + pay button
4. **Idempotency** — безопасный повторный webhook
5. **Settings page** — план, дата истечения, кнопка "Продлить"

## Technical Approach

- **Architecture:** Next.js BFF handles payment (не AI service)
- **Payment:** Robokassa MD5 signature, redirect flow
- **Security:** Password2 webhook verification, no JWT on webhook endpoint
- **Idempotency:** UNIQUE InvoiceId + status check
- **Plan check:** On-demand (не cron) — auto-downgrade при каждом roast запросе

## Research Highlights

1. Robokassa — стандарт для digital SaaS в РФ при ФЗ-152
2. 299₽/мес — соответствует рынку (Дзен-мани, CoinKeeper)
3. Rate limit hit → conversion rate 5-8% при правильном upgrade CTA
4. MD5 подпись (legacy) достаточна для v1, SHA256 в v2
5. ЮKassa лучше для recurring — мигрировать в v2

## Success Metrics

| Метрика | Цель | Таймлайн |
|---------|------|---------|
| Conversion (rate limit → upgrade) | ≥ 5% | Month 1 |
| Webhook success rate | ≥ 99% | Week 1 |
| Monthly churn | ≤ 30% | Month 2 |

## Timeline

| Phase | Features |
|-------|----------|
| MVP (v1) | Robokassa redirect, plan enforcement, ручное продление |
| v1.1 | Email notifications, Plus badge |
| v2.0 | ЮKassa auto-recurring, годовая подписка |

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Webhook forgery | MD5 + Password2 verification |
| Duplicate payment | UNIQUE InvoiceId idempotency |
| Robokassa downtime | Graceful error + retry CTA |
| plan_expires not checked | On-demand check при каждом roast |

## Immediate Next Steps

1. Зарегистрировать аккаунт Robokassa (требует ИП/ООО юридическое лицо)
2. Реализовать `004_payments.sql` + API routes + /upgrade page
3. Модифицировать `rate_limiter.py` для plan check
4. Тестовый платёж через IsTest=1
5. Deploy + monitor webhook logs
