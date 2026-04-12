# Completion: Auth — Definition of Done

## Чеклист

### Supabase Setup
- [x] Supabase Auth enabled (email provider)
- [x] Magic Link в настройках
- [x] Redirect URL: `{APP_URL}/auth/callback`

### Database
- [x] `profiles` table с RLS
- [x] Auto-create trigger `on_auth_user_created`
- [x] RLS на всех таблицах: transactions, roasts, savings_goals

### Next.js
- [x] `lib/supabase/client.ts` — Browser client
- [x] `lib/supabase/server.ts` — Server client (await cookies())
- [x] `lib/supabase/middleware.ts` — updateSession()
- [x] `middleware.ts` — protected paths + session refresh
- [x] `app/auth/callback/route.ts` — exchangeCodeForSession

### Frontend
- [x] Login form на landing page (email input + Magic Link)
- [x] "Письмо отправлено" состояние
- [x] Redirect после auth через ?next= параметр

### Security
- [x] httpOnly cookies (не localStorage)
- [x] PKCE flow (exchangeCodeForSession)
- [x] updateSession в каждом запросе (auto-refresh)
- [x] /share/* исключён из auth middleware

## Метрики готовности

- ✅ Magic Link flow: работает end-to-end
- ✅ Session refresh: работает через middleware
- ✅ Protected routes: /dashboard, /roast, /settings → 401/redirect без сессии
- ✅ Public routes: /share/* → доступны без auth
- ⏳ OAuth (Google/VK) — не реализован (v2)
