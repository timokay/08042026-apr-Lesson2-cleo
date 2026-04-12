# PRD: Upgrade to Plus

## Обзор

**Название фичи:** Upgrade to Plus  
**Спринт:** MVP Sprint 1 (Week 6)  
**Приоритет:** Критический (revenue)

## Проблема

Клёво не монетизируется. Free plan → нет revenue → нельзя оплачивать Claude API. Нужна минимальная платёжная система для российского рынка.

## Решение

Страница /upgrade + Robokassa payment + webhook → Plus план (299₽/мес, ручное продление).

## Целевая аудитория

Пользователи Клёво на free plan, которые:
1. Достигли лимита (1 ростер/мес) — **самый высокий intent**
2. Хотят больше функций (badges, future features)

## Value Proposition

**Free:** 1 ростер в месяц, базовые функции  
**Plus (299₽/мес):** Безлимитные ростеры + "Plus" badge + приоритетный AI

## MoSCoW

### Must Have
- `/upgrade` страница с описанием планов
- Robokassa payment integration (redirect flow)
- Webhook handler: подтверждение оплаты → update plan
- Plan enforcement: plus/pro → bypass monthly limit
- `plan_expires_at` check: если истёк → downgrade to free (on-demand)
- Upgrade CTA при rate limit (уже реализован в UpgradeModal.tsx)

### Should Have
- /upgrade?success=1 success state
- /settings: текущий план + дата истечения + кнопка "Продлить"
- InvoiceId идемпотентность (защита от duplicate webhook)

### Could Have
- Email уведомление за 3 дня до истечения
- "Plus" badge в интерфейсе
- Промокоды

### Won't Have (v1)
- Автоплатёж (recurring via Robokassa)
- Годовая подписка (799₽/год)
- Реферальная программа
- Stripe/PayPal (вне РФ)

## Метрики успеха

| Метрика | Цель |
|---------|------|
| Conversion rate (rate-limit hit → upgrade) | ≥ 5% |
| Webhook success rate | ≥ 99% |
| Payment flow completion (initiated → paid) | ≥ 70% |
| Monthly churn | ≤ 30% |

## User Flow

```
1. Пользователь нажимает "Поджарь!" → 429 → UpgradeModal
2. Нажимает "Upgrade за 299₽/мес"
3. Redirect → /upgrade
4. Нажимает "Оплатить через Robokassa"
5. POST /api/payments/create-invoice
6. Redirect → Robokassa payment page
7. Пользователь вводит данные карты → оплачивает
8. Robokassa → POST /api/payments/webhook (ResultURL)
9. Verify MD5 signature → UPDATE profiles SET plan='plus', plan_expires_at=now()+30
10. Robokassa → Redirect /upgrade?success=1
11. Пользователь видит "Оплата прошла! Теперь ты Plus ⚡"
```
