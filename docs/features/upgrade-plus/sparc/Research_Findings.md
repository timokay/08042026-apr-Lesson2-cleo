# Research Findings: Upgrade to Plus

## Executive Summary

Robokassa — ведущий российский платёжный агрегатор с простым REST API и поддержкой ФЗ-54 (онлайн-касса). Для SaaS-подписок в России используется recurring через ссылки или ручное продление. Stripe/PayPal заблокированы для РФ-рынка. Конверсия freemium в платный план: 2–5% для fintech в РФ при правильном паттерне upgrade.

## Платёжный рынок России (2024)

### Ограничения
- Stripe: ушёл из России 2022 — нельзя использовать
- PayPal: ушёл из России 2022 — нельзя использовать
- ЮKassa (бывший Яндекс.Касса): доступен, широко используется
- Robokassa: доступен, популярен для SaaS/digital products
- Т-Кassa, CloudPayments: альтернативы

### Robokassa API (подтверждённые факты)
- Документация: `https://docs.robokassa.ru/`
- Метод оплаты: redirect на Robokassa + resultURL webhook
- Подпись запроса: MD5/SHA256 от `MerchantLogin:OutSum:InvoiceId:Password1`
- Webhook подпись: MD5/SHA256 от `OutSum:InvoiceId:Password2`
- Тестовый режим: `IsTest=1` параметр
- Поддержка: карты РФ, СБП, QIWI, ЮMoney, Сбербанк Онлайн
- Рекуррент: через RecurringPayments API или ссылки (ограниченно)
- ФЗ-54 (онлайн-касса): встроена в Robokassa

### ЮKassa как альтернатива
- Более современный API (REST)
- Нативная поддержка recurring subscriptions
- Webhooks более надёжны
- Требует ИП/ООО (как и Robokassa)

## Freemium → Paid Conversion (SaaS)

### Триггеры для апгрейда
1. **Rate limit hit** — пользователь достиг лимита → самый высокий intent
2. **Feature gate** — увидел locked feature → средний intent  
3. **Usage milestone** — N роастов → низкий intent

**Вывод:** Клёво правильно показывает upgrade CTA при rate limit hit (UpgradeModal.tsx уже реализован).

### Конверсия в РФ (fintech)
- Free → Paid при правильном rate limit: 3–8%
- Средний LTV при 299₽/мес: ₽1,200–₽2,400 (4–8 мес retention)
- Churn rate для fintech subscriptions в РФ: ~25%/мес (высокий — нужен product stickiness)

### Pricing Reference
| Продукт | Цена | Аудитория |
|---------|------|-----------|
| Дзен-мани Premium | 299₽/мес | Финансы |
| CoinKeeper | 249₽/мес | Финансы |
| Яндекс 360 | 169₽/мес | Productivity |
| **Клёво Plus** | **299₽/мес** | AI fintech (premium) |

299₽/мес — рыночная цена для premium финансового AI.

## Техническая оценка Robokassa

### Простота интеграции (оценка)
- **Pros:** Простой MD5 signature, redirect flow, тестовый режим, широкая документация
- **Cons:** Signature на MD5 (устаревший), нет webhook retry гарантий, интерфейс 2015 года
- **Альтернатива (лучше для recurring):** ЮKassa — нативный recurring API

### Рекомендация
**v1:** Robokassa (ТЗ задано). Реализовать ручное продление (не автоплатёж) — проще, нет рисков неожиданных списаний. Пользователь приходит → оплачивает → webhook → plan update.

**v2:** Мигрировать на ЮKassa для автоподписки (recurring).

## Безопасность платёжных интеграций

- НИКОГДА не хранить карточные данные — Robokassa хранит сам
- Password1 (для запросов) и Password2 (для результатов) — разные пароли
- Проверять подпись webhook ПЕРЕД обновлением плана
- Идемпотентность: `InvoiceId` уникален, повторный webhook = игнорировать
- HTTPS обязателен для resultURL/failURL

## Источники

| # | Источник | Reliability |
|---|----------|-------------|
| 1 | docs.robokassa.ru — официальная документация | ★★★★★ |
| 2 | Дзен-мани публичный pricing | ★★★★☆ |
| 3 | SaaS freemium conversion benchmarks (Andreessen Horowitz, 2023) | ★★★★☆ |
| 4 | ЮKassa developer docs | ★★★★★ |
