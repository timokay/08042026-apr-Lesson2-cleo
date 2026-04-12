# Final Summary: AI Chat

## Overview

AI Chat — conversational финансовый советник поверх существующего анализа транзакций. Пользователь задаёт вопросы о своих расходах, получает персонализированные ответы с характером Клёво. SSE streaming, Redis session history, plan-based rate limiting.

## Problem & Solution

**Problem:** Пользователи получают одноразовый ростер, но не могут задать уточняющие вопросы. Нет диалога — нет retention.

**Solution:** Чат-эндпоинт в AI Service с финансовым контекстом в system prompt и историей сессии в Redis. BFF агрегирует контекст, проверяет лимиты, проксирует SSE стриминг.

## Target Users

Пользователи Клёво после первого ростера — те, кто хочет глубже разобраться в своих расходах.

## Key Features (MVP)

1. **Conversational AI** — диалог с памятью в рамках сессии (Redis, 1 час)
2. **Финансовый контекст** — AI знает топ-категории и паразитные подписки пользователя
3. **SSE Streaming** — первый токен < 2.5s, UX идентичен roast-mode
4. **Plan enforcement** — free: 10 сообщений/день, plus: 100/день
5. **Quick replies** — 3 кнопки для снижения friction при первом открытии

## Technical Approach

- **Architecture:** BFF pattern (Next.js → AI Service), без прямого доступа к Claude из браузера
- **Streaming:** SSE через FastAPI StreamingResponse, идентично roast-mode
- **History:** Redis sliding window (last 10 пар), TTL 1 час
- **Context:** агрегированный summary (500 токенов) вместо raw транзакций
- **Security:** session_id включает user_id в Redis ключе → изоляция истории

## Reused Patterns (из существующего кода)

- `generate_roast` → `generate_chat_response` (тот же streaming паттерн)
- `check_ai_rate` → переиспользуется без изменений
- SSE proxy в Next.js BFF → идентичен `/api/roast/route.ts`
- `createClient` + RLS → `chat_messages` RLS policy

## Success Metrics

| Метрика | Цель |
|---------|------|
| DAU chat / DAU total | ≥ 30% |
| Avg messages per session | ≥ 4 |
| Plus conversion from chat | ≥ 5% |
| First token p95 | < 2.5s |

## Risks

| Риск | Митигация |
|------|-----------|
| Hallucination финансовых советов | Конкретные данные в контексте + disclaimer |
| Высокая стоимость токенов | Summary контекст, max_tokens=512, daily limit |
| Redis OOM | TTL 1 час, max 20 сообщений/сессия |

## Immediate Next Steps

1. Валидация SPARC документации (Phase 2)
2. Реализация `chat_generator.py` и `chat_router.py`
3. Реализация `/api/chat/route.ts` BFF
4. Реализация `app/chat/page.tsx` UI
5. Review и commit
