# Completion: AI Chat

## Definition of Done

- [ ] `POST /api/chat` (BFF) — auth, daily limit, context, SSE proxy
- [ ] `POST /chat` (AI Service) — streaming с Claude/YandexGPT fallback
- [ ] Redis session history (`chat:history:{user_id}:{session_id}`)
- [ ] Redis daily counter (`chat:daily:{user_id}:{date}`)
- [ ] `apps/web/app/chat/page.tsx` — UI с quick replies, streaming, typing indicator
- [ ] `packages/db/schema/005_chat.sql` — chat_messages table + RLS
- [ ] Zod validation на /api/chat (message length, session_id format)
- [ ] YandexGPT fallback при Claude timeout
- [ ] Free plan: 10 сообщений/день, upgrade CTA при превышении
- [ ] session_id isolation (user_id в Redis ключе)

## Pre-Deployment Checklist

- [ ] Все Gherkin сценарии из Refinement.md покрыты тестами
- [ ] Security: session_id isolation проверен (cross-user test)
- [ ] Performance: first token < 2.5s проверен под нагрузкой
- [ ] Redis TTL корректен (daily counter сбрасывается в полночь UTC)
- [ ] `.env.example` актуален (новых переменных нет — переиспользуем REDIS_URL, AI_SERVICE_URL)
- [ ] `chat_messages` миграция применена на staging

## Deployment Sequence

1. Применить `packages/db/schema/005_chat.sql`
2. Deploy AI Service (новый роутер `/chat`)
3. Deploy Next.js BFF (новый route `/api/chat`)
4. Deploy `apps/web/app/chat/page.tsx`
5. Smoke test: отправить сообщение, проверить streaming

## Rollback

- AI Service: `docker compose rollback ai-service` → предыдущий образ
- Next.js: `docker compose rollback web` → предыдущий образ
- DB: `chat_messages` таблица не ломает обратную совместимость (просто не используется)

## Monitoring

| Метрика | Порог | Алерт |
|---------|-------|-------|
| /chat p99 latency (first token) | > 3s | Telegram |
| AI Service error rate | > 5% | Telegram |
| Daily limit hits (free users) | > 50%/day | Slack (product signal) |
| Redis memory | > 80% | PagerDuty |

## Logging

```python
# AI Service
logger.info("chat.request", user_id=user_id, session_id=session_id, message_len=len(message))
logger.info("chat.response", user_id=user_id, tokens=token_count, model=model_used)
logger.warning("chat.fallback", user_id=user_id, reason="claude_timeout")
logger.error("chat.error", user_id=user_id, error=str(e))
```

```typescript
// BFF
console.info('Chat request', { userId, sessionId, messageLen: message.length })
console.warn('Chat daily limit hit', { userId, count })
```

## New Environment Variables

Нет новых переменных — переиспользуются:
- `REDIS_URL` — уже в .env.example
- `AI_SERVICE_URL` — уже в .env.example
- `CLAUDE_API_KEY` — уже в .env.example
- `YANDEX_GPT_API_KEY` — уже в .env.example
