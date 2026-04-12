# Solution Strategy: AI Chat

## Problem Statement (SCQA)

- **Situation:** Клёво уже анализирует транзакции и генерирует ростер. Пользователь видит инсайты.
- **Complication:** Одноразовый ростер не отвечает на follow-up вопросы. После "подгорания" нет диалога.
- **Question:** Как добавить conversational layer поверх существующего анализа без дублирования логики?
- **Answer:** Чат-роутер в AI Service, который принимает историю сообщений + финансовый контекст пользователя, генерирует ответы стримингом. BFF (Next.js) хранит историю сессии и собирает контекст из DB.

## First Principles Analysis

1. Чат — это sequence of (role, content) pairs → LLM API это уже поддерживает нативно
2. Финансовый контекст нужен только в system prompt → не нужно повторять в каждом сообщении
3. История транзакций большая, но агрегированный summary маленький (~500 токенов) → передавать summary
4. Стриминг уже есть в roast_generator.py → переиспользуем паттерн, не копируем

## Root Cause (5 Whys)

1. Почему пользователи не возвращаются после ростера? → Нет следующего шага
2. Почему нет следующего шага? → Нет диалога, только monologue
3. Почему нет диалога? → Нет chat endpoint
4. Почему нет chat endpoint? → Roast это one-shot, не conversational
5. Root cause: AI Service спроектирован для one-shot запросов, не для диалогов

## Key Contradictions (TRIZ)

| Противоречие | TRIZ Принцип | Решение |
|---|---|---|
| Полный контекст транзакций vs токен-лимиты | #10 Prior Action | Предварительно агрегировать контекст в BFF |
| Характер/тон vs полезность | #35 Parameter Change | Короткие остроумные ответы + конкретный совет в конце |
| История сессии vs stateless backend | #25 Self-service | Redis кеш в AI Service, TTL 1 час |

## Recommended Approach

### Архитектура
```
User → Next.js BFF → AI Service /chat endpoint → Claude/YandexGPT
         ↓
   собирает контекст из Supabase (профиль + агрегаты)
   хранит историю в Redis (сессия)
```

### System Prompt Strategy
System prompt содержит:
1. Персонаж ("Клёво — дружелюбный финансовый советник с характером...")
2. Финансовый контекст (top categories, total spent, top 3 parasites)
3. Plan уровень (free/plus) — чтобы знать лимиты

История передаётся как messages array (последние 10 пар).

### Rate Limiting
- Free: 10 messages/day (новый Redis counter `chat:daily:{user_id}:{date}`)
- Plus: 100 messages/day
- Per-minute: 20 req/min (переиспользуем check_ai_rate)

## Risk Assessment

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Hallucination (AI даёт неверные финансовые советы) | Medium | High | Добавить disclaimer, конкретные данные в контекст |
| Redis OOM от истории чатов | Low | Medium | TTL 1 час, max 20 сообщений на сессию |
| Высокая стоимость API (много токенов) | Medium | Medium | Summary вместо raw транзакций, Plus-only для длинных сессий |
| Латентность > 2.5s | Low | Medium | Streaming решает perceived latency |
