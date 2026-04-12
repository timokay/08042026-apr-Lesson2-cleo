# Solution Strategy: Upgrade to Plus

## Problem Statement (SCQA)

- **Situation:** Клёво работает, 5 MVP фич готовы. Есть free plan с 1 ростером в месяц.
- **Complication:** Нет монетизации → нет revenue → нет возможности платить за AI API.
- **Question:** Как добавить платный план с минимальным friction для пользователя?
- **Answer:** Robokassa redirect → webhook → plan update. Простейший возможный payment flow без рисков.

## First Principles Analysis

**Что нужно для монетизации:**
1. Пользователь должен хотеть платить (sufficient value provided) ✅ (ростер viral)
2. Пользователь должен понимать за что платит (clear value prop) → нужна /upgrade страница
3. Оплата должна быть удобной (минимум шагов) → Robokassa redirect (1 клик)
4. Система должна знать кто заплатил (webhook → DB update)
5. Оплата должна быть защищена (подпись webhook)

**Что НЕ нужно для v1:**
- Автоплатёж (recurring) — сложнее, высокий риск churn complaint
- Возвраты — обрабатывает Robokassa
- Инвойсинг — не нужен для физлиц в digital

## Root Cause Analysis (5 Whys)

1. Почему нет revenue? → Нет paywall
2. Почему нет paywall? → Не реализован upgrade flow
3. Почему не реализован? → Нет payment provider интеграции
4. Почему нет интеграции? → Нужна Robokassa настройка + webhook
5. **Root Cause:** Webhook handler + план обновления = минимальный MVP монетизации

## TRIZ Contradictions

| Contradiction | Принцип | Решение |
|---------------|---------|---------|
| Хотим upfront payment, но пользователь боится потерять деньги | #10 Preliminary Action | Тестовый период → нет, просто первый месяц + cancel anytime |
| Хотим recurring автоплатёж, но нет надёжного API в Robokassa | #15 Dynamism | v1: ручное продление, v2: ЮKassa migration |
| Хотим проверить payment, но webhook может прийти с задержкой | #24 Intermediary | Pending state на стороне клиента до подтверждения webhook |

## Game Theory Analysis

**Stakeholders:**
- **Пользователь:** хочет больше ростеров за минимум денег
- **Клёво:** хочет revenue без churn
- **Robokassa:** берёт ~3.5% комиссии

**Nash equilibrium:** 299₽/мес — ниже психологического барьера 300₽, выше минимального для sustainability.

## Second-Order Effects

1. Upgrade → больше ростеров → больше шеринга → viral growth
2. Upgrade → revenue → можно платить за Claude API → лучший продукт
3. Паразит на free plan (1 ростер/мес) → создаёт FOMO → конверсия

## Recommended Approach

### Архитектура (SIMPLE)

```
/upgrade page (Next.js)
  → POST /api/payments/create-invoice (генерирует Robokassa URL)
  → Redirect на Robokassa
  → Пользователь платит
  → Robokassa: POST /api/payments/webhook (ResultURL)
  → Verify signature → UPDATE profiles SET plan='plus', plan_expires_at=now()+30days
  → Robokassa: Redirect на /upgrade?success=1 (SuccessURL)
```

### Ручное продление (v1)
- Один платёж = 30 дней
- При истечении → plan возвращается в 'free' (cron job или on-demand check)
- CTA "Продлить" в /settings

### Plan Enforcement (в существующем rate_limiter.py)
```python
# Проверка плана перед monthly limit
profile = await get_profile(user_id)
if profile.plan in ('plus', 'pro'):
    return True  # no monthly limit
# else: check monthly roast count
```

## Risk Assessment

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Webhook signature mismatch | Низкая | Критическая (бесплатный Plus) | Тщательная проверка MD5 |
| Двойное списание (duplicate webhook) | Средняя | Высокое | Idempotency по InvoiceId |
| Robokassa downtime | Низкая | Средняя | Retry CTA, альтернативный способ |
| plan_expires_at не проверяется | Средняя | Высокое | Middleware проверяет при каждом запросе |
| Тестовые платежи в prod | Низкая | Средняя | IsTest flag, отдельные credentials |
