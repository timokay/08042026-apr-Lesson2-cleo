# Research Findings: AI Chat

## Executive Summary

Conversational AI для личных финансов — растущий сегмент. Ключевой инсайт: пользователи хотят не просто данные, а интерпретацию с конкретными советами. Главная техническая задача — управление контекстом (token budget) при работе с историей транзакций.

## Market Analysis

### Аналоги в мире
| Продукт | Подход | Слабое место |
|---------|--------|--------------|
| Cleo AI (US) | Personalized chat + budget coach | Недоступен в РФ |
| Copilot (US) | AI insights на транзакции | Только iOS, US банки |
| Т-Банк "Олег" | Банковский ассистент | Корпоративный тон, нет юмора |
| Сбер "СберБанк Онлайн AI" | Общий ассистент | Не специализирован на расходах |

### Вывод
РФ-рынок не имеет personality-driven финансового чата. Ближайший аналог — Cleo AI, но он недоступен в РФ и не знает российских банков.

## Technology Assessment

### LLM Context Management
- Claude Sonnet поддерживает 200K токенов контекста — достаточно для всей истории транзакций пользователя за год
- Оптимальный подход: передавать summarized context (категории + топ паразиты), не raw транзакции
- Few-shot examples в system prompt эффективно задают тон и стиль

### Streaming
- SSE (Server-Sent Events) уже используется в roast-mode — переиспользуем паттерн
- FastAPI `StreamingResponse` + Next.js `ReadableStream` proxy — проверено в production

### Chat History
- Redis для in-session history (быстро, TTL 1 час)
- PostgreSQL для персистентной истории (Plus фича)
- Максимум последних N сообщений в контексте (sliding window, 10-20 пар)

### Rate Limiting
- Free: 10 сообщений/день (Redis counter)
- Plus: 100 сообщений/день (практически безлимит)
- Per-minute: 20 req/min max (anti-abuse)

## User Insights

- Пользователи хотят ответы на "почему" и "как исправить" — не просто факты
- Короткие ответы (2-4 предложения) работают лучше длинных эссе
- Quick reply кнопки снижают friction для первого сообщения (Cleo подтверждает)
- Характер и юмор = engagement, но не в ущерб полезности

## Confidence Assessment

- **High:** SSE streaming переиспользует готовый паттерн (подтверждено кодом)
- **High:** Claude 200K контекст достаточен для истории транзакций
- **Medium:** Метрики retention (30% DAU) — экстраполяция из Cleo данных
- **Low:** Голосовой ввод (Web Speech API) — не исследован детально, вынесен в Could Have
