# Completion: Roast Mode — Definition of Done

## Чеклист

### Backend (AI service)
- [x] `services/roast_generator.py` — generate_roast(), _stream_claude(), _stream_yandexgpt(), _generic_roast()
- [x] System prompt с русским языком enforcement
- [x] _build_user_prompt() — персонализация по categories + parasites
- [x] Claude fallback → YandexGPT → template
- [x] `services/rate_limiter.py` — singleton Redis, sliding window, monthly check
- [x] `routers/roast_router.py` — StreamingResponse, \n\n chunk termination, X-Accel-Buffering header

### Backend (Next.js BFF)
- [x] `app/api/roast/route.ts` — SSE proxy
- [x] Auth check (401)
- [x] Rate limit check (Redis через AI service)
- [x] Fetch transactions from Supabase
- [x] Proxy SSE stream к клиенту

### Frontend
- [x] `app/roast/page.tsx` — SSE reader, state machine
- [x] States: idle / streaming / done / error / rate_limited / insufficient
- [x] Streaming cursor animation (blinking |)
- [x] `RoastCard.tsx` — шринг кнопка
- [x] `UpgradeModal.tsx` — при rate_limited

### Infrastructure
- [x] nginx: `proxy_buffering off` для /api/roast
- [x] Redis: single instance для rate limiting

### Tests
- [x] `tests/test_roast_generator.py` — (via mock AI)
- [x] `tests/test_rate_limiter.py` — sliding window, monthly, anti-abuse

## Метрики готовности

- ✅ SSE streaming работает end-to-end
- ✅ Fallback chain: Claude → YandexGPT → template
- ✅ Rate limiting: 10/мин, 1/мес (free)
- ⏳ Language retry (EN → retry RU) — не реализовано
- ⏳ E2E Playwright тест — не реализован
