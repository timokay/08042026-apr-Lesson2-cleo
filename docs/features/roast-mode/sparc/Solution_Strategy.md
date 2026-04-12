# Solution Strategy: Roast Mode

## Ключевые технические решения

### 1. SSE вместо WebSocket

**Решение:** Server-Sent Events (одностороннее streaming от сервера).

**Обоснование:**
- Claude API отдаёт SSE — не нужно перепаковывать
- Нет bidirectional нужды (только сервер → клиент)
- Проще через nginx (WebSocket требует upgrade headers)
- Работает через HTTP/1.1 long connection

### 2. BFF SSE proxy (Next.js proxies AI service stream)

**Решение:** Next.js перебрасывает ReadableStream напрямую в response.

**Обоснование:**
- AI service не доступен публично (docker-network only)
- Auth/rate-limit проверки только в Next.js
- Browser не знает об AI service

**Критично:** `X-Accel-Buffering: no` — иначе nginx буферизует SSE и пользователь видит задержку.

### 3. Claude → YandexGPT fallback

**Решение:** try Claude, on exception → try YandexGPT, on exception → template.

**Обоснование:**
- proxyapi.ru иногда даёт 529 (overloaded) или timeout
- YandexGPT работает с RU VPS напрямую (без прокси)
- Generic template — хуже, но лучше 500 ошибки пользователю

**YandexGPT особенность:** non-streaming, весь ответ сразу. Симулируем streaming через `yield full_text` — пользователь видит появление сразу, не по токенам.

### 4. Redis sliding window rate limiting

**Решение:** ZSET с timestamp как score, ZREMRANGEBYSCORE + ZCARD в pipeline.

**Обоснование:**
- Atomic: ZADD + ZCARD в одном pipeline = нет race condition
- Window-based (не fixed bucket): точный лимит без burst проблем
- Redis singleton (не per-request) — критично для корректности

### 5. Русский язык enforcement

**Решение:** "ВАЖНО: Отвечай ТОЛЬКО на русском языке" в system prompt + "Ответ только на русском языке." в конце user prompt.

**Обоснование:** Claude иногда переключается на English если транзакции содержат английские названия. Двойное указание в system+user prompt снижает вероятность до ~1%.

**Будущее улучшение:** Language detection на первых 50 символах ответа → автоматический retry.
