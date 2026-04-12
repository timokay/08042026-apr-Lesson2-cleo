# Architecture: Roast Mode

## Компоненты

```
Browser (React)
  └─ app/roast/page.tsx         apps/web/
       SSE reader (EventSource / fetch ReadableStream)
       State machine: idle → streaming → done | error | rate_limited | insufficient

Next.js BFF
  └─ app/api/roast/route.ts
       ├─ Auth check (Supabase JWT)
       ├─ Rate limit check → 429 если превышен
       ├─ GET transactions from Supabase (period filter)
       ├─ POST /analyze to AI service (get categories + parasites)
       └─ Proxy SSE stream от /roast → client

Python FastAPI (AI service)
  └─ routers/roast_router.py
       └─ POST /roast → StreamingResponse
           └─ generate_roast() — AsyncGenerator[str]
               ├─ _stream_claude() — httpx.AsyncClient streaming
               ├─ _stream_yandexgpt() — non-streaming, yield once
               └─ _generic_roast() — template fallback

Redis
  └─ Rate limiter ZSET: "rate:roast:{user_id}" (sliding window)
     Monthly key: "rate:roast:monthly:{user_id}:{year}:{month}"
```

## Поток данных (SSE)

```
1. Browser → POST /api/roast { period }
2. Next.js → auth check (401 if not auth)
3. Next.js → Redis rate limit check (429 if exceeded)
4. Next.js → Supabase: SELECT transactions WHERE user_id=? AND period=?
5. Next.js → AI service: POST /analyze (для категорий и паразитов)
6. Next.js → AI service: POST /roast (SSE stream)
7. AI service → Claude API (proxyapi.ru):
   POST /v1/messages { stream: true }
   → async for line in response.aiter_lines():
       parse "data: {...}" → extract text delta → yield
8. AI service SSE → Next.js SSE → Browser (chunked transfer)
9. Done: Next.js → Supabase: INSERT roasts
10. Done event: { type:"done", roast_id: uuid }
```

## SSE Proxy (критично)

```typescript
// apps/web/app/api/roast/route.ts
const aiStream = await fetch(`${AI_SERVICE_URL}/roast`, { method: 'POST', body })
return new Response(aiStream.body, {
  headers: {
    'Content-Type': 'text/event-stream',
    'X-Accel-Buffering': 'no',  // критично для nginx!
    'Cache-Control': 'no-cache',
  }
})
```

## Nginx Config (важно для SSE)

```nginx
location /api/roast {
    proxy_buffering off;       # критично!
    proxy_read_timeout 300s;
}
```

## Fallback Chain

```
Claude (proxyapi.ru, timeout 30s)
  → YandexGPT (3 retries, exponential backoff 1s/2s/4s)
  → Generic template (₽{total} потрачено, 2 совета)
```
