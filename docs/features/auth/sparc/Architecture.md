# Architecture: Authentication

## Компоненты

```
Browser
  └─ app/page.tsx (Landing + Login form)
       supabase.auth.signInWithOtp({ email })
       ← Magic Link email от Supabase

Next.js Middleware
  └─ middleware.ts
       updateSession(request)   [lib/supabase/middleware.ts]
       IF protected path AND no session → redirect /?auth_required=1

Next.js Routes
  └─ app/auth/callback/route.ts
       GET ?code=xxx
       exchangeCodeForSession(code)
       → redirect /dashboard

Supabase Self-hosted
  ├─ auth.users table
  ├─ profiles table (trigger auto-create)
  └─ JWT httpOnly cookies (via @supabase/ssr)
```

## Поток данных

### Login

```
1. Browser: supabase.auth.signInWithOtp({ email, redirectTo: '/auth/callback' })
2. Supabase: sends Magic Link email
3. User: clicks link → browser → /auth/callback?code=xxx
4. Next.js /auth/callback:
   supabase.auth.exchangeCodeForSession(code)
   → JWT stored in httpOnly cookie
5. Redirect → /dashboard
```

### Session validation (каждый запрос)

```
1. Request arrives
2. middleware.ts → updateSession(request)
   @supabase/ssr reads cookie, refreshes if expired
3. IF protected path AND !session → redirect /?auth_required=1
4. IF session valid → request proceeds
```

### API Route auth check

```typescript
// Каждый API route:
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
```

## Security Properties

- **httpOnly cookies** → недоступны JavaScript → XSS защита
- **RLS** → user_id isolation на уровне DB
- **JWT** → stateless auth (нет серверного хранения сессий)
- **PKCE flow** → exchangeCodeForSession защищает от code interception
- **No password** → нет password hash leaks, нет brute force

## Supabase Self-hosted (ФЗ-152)

Данные пользователей (email, profile) хранятся на VPS HOSTKEY (Москва). Облачный Supabase (US) не используется.
