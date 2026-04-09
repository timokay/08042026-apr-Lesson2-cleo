---
name: security-patterns
description: >
  Security patterns for Клёво: API key management, JWT auth, RLS enforcement,
  input validation, rate limiting. Use when implementing any security-sensitive
  feature, adding external API integration, or reviewing auth/data access code.
  Trigger words: API key, auth, JWT, RLS, rate limit, validation, encryption.
version: "1.0"
maturity: production
---

# Security Patterns: Клёво

## Pattern 1: API Key Storage (Python FastAPI)

```python
# apps/ai-service/config.py
import os
from dotenv import load_dotenv
from functools import lru_cache

load_dotenv()

class Settings:
    claude_api_key: str = os.getenv("CLAUDE_API_KEY", "")
    yandex_api_key: str = os.getenv("YANDEX_GPT_API_KEY", "")
    proxy_api_url: str = os.getenv("PROXY_API_URL", "https://api.proxyapi.ru/anthropic")
    
    def validate(self):
        if not self.claude_api_key and not self.yandex_api_key:
            raise RuntimeError("At least one AI API key must be configured")

@lru_cache()
def get_settings() -> Settings:
    s = Settings()
    s.validate()
    return s
```

## Pattern 2: Supabase Auth (Next.js Server)

```typescript
// apps/web/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, { ...options, httpOnly: true, secure: true })
          )
        },
      },
    }
  )
}

// Usage in API route:
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  // RLS is automatically enforced — queries scoped to user
}
```

## Pattern 3: Zod Input Validation (Next.js API Route)

```typescript
// apps/web/app/api/upload/route.ts
import { z } from 'zod'

const UploadSchema = z.object({
  filename: z.string().max(255).endsWith('.csv'),
  encoding: z.enum(['utf-8', 'cp1251']).optional(),
})

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = UploadSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Не смогли прочитать файл', details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  // Continue with validated data: parsed.data
}
```

## Pattern 4: Redis Rate Limiting (Python FastAPI)

```python
# apps/ai-service/services/rate_limiter.py
import redis.asyncio as redis
import time

class RateLimiter:
    def __init__(self, redis_url: str):
        self.redis = redis.from_url(redis_url, decode_responses=True)
    
    async def check_per_minute(self, user_id: str, limit: int = 10) -> bool:
        """Sliding window rate limit: limit requests per 60 seconds."""
        key = f"rate:minute:{user_id}"
        now = time.time()
        pipe = self.redis.pipeline()
        pipe.zremrangebyscore(key, 0, now - 60)
        pipe.zadd(key, {str(now): now})
        pipe.zcard(key)
        pipe.expire(key, 60)
        results = await pipe.execute()
        count = results[2]
        return count <= limit
    
    async def check_monthly_roast(self, user_id: str, plan: str) -> bool:
        """Free plan: 1 roast per calendar month."""
        if plan == "plus":
            return True
        key = f"roast:month:{user_id}:{time.strftime('%Y-%m')}"
        count = await self.redis.incr(key)
        if count == 1:
            await self.redis.expire(key, 32 * 24 * 3600)  # ~1 month TTL
        return count <= 1
```

## Pattern 5: RLS Policy Template (SQL)

```sql
-- Every table needs this pattern
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Users can only access their own rows
CREATE POLICY "select_transactions_own_user"
  ON transactions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "insert_transactions_own_user"
  ON transactions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "delete_transactions_own_user"
  ON transactions FOR DELETE
  USING (user_id = auth.uid());
```

## Anti-Patterns (DO NOT DO)

```typescript
// ❌ Auth token in localStorage
localStorage.setItem('auth_token', jwt)

// ❌ Service role key in browser
const supabase = createClient(url, process.env.NEXT_PUBLIC_SERVICE_ROLE_KEY)

// ❌ No user_id filter (bypasses RLS intent)
const { data } = await supabase.from('transactions').select('*')
  .eq('user_id', req.body.userId)  // ← trust client input = WRONG

// ✅ Let RLS do the work — no manual user_id filter needed
const { data } = await supabase.from('transactions').select('*')
// RLS policy: auth.uid() filters automatically on server
```
