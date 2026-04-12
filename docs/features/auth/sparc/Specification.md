# Specification: Authentication

## User Stories

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| US-040 | Как пользователь, хочу войти по email без пароля | Magic Link приходит на email, клик → session |
| US-041 | Как пользователь, хочу быть перенаправлен на dashboard | После auth → /dashboard |
| US-042 | Как незарегистрированный, при переходе на /dashboard | Redirect → / |
| US-043 | Как пользователь, мои данные изолированы от других | RLS: user_id = auth.uid() |

## Auth Flow

```
1. Пользователь вводит email на главной странице
2. supabase.auth.signInWithOtp({ email })
3. Supabase отправляет Magic Link письмо
4. Пользователь кликает ссылку → /auth/callback?code=xxx
5. exchangeCodeForSession(code) → session установлена
6. Redirect → /dashboard (или ?next= параметр)
```

## API

### GET /auth/callback

**Params:** `code: string`, `next: string` (optional, default: `/dashboard`)

**Supabase call:**
```typescript
await supabase.auth.exchangeCodeForSession(code)
```

**Success:** Redirect → `${origin}${next}`

**Error:** Redirect → `${origin}/?auth_error=1`

## Middleware

**Файл:** `apps/web/middleware.ts`

**Защищённые пути:**
```typescript
const PROTECTED_PATHS = ['/dashboard', '/roast', '/settings']
```

**Исключённые пути (публичные):**
```
/_next/static/**
/_next/image/**
/favicon.ico
/share/**        ← публичные страницы шеринга
```

**Логика:**
```
updateSession(request)  // refresh JWT если нужен
IF path IN PROTECTED AND NOT session:
  redirect '/?auth_required=1'
```

## Supabase Clients

Три разных клиента для разных контекстов:

| Клиент | Файл | Когда использовать |
|--------|------|-------------------|
| Browser | `lib/supabase/client.ts` | Client Components, useSession |
| Server | `lib/supabase/server.ts` | Server Components, API routes |
| Middleware | `lib/supabase/middleware.ts` | Только в middleware.ts |

**Критично (Next.js 15):**
```typescript
// ✅ server.ts — ОБЯЗАТЕЛЬНО await
const cookieStore = await cookies()
```

## Database

### profiles table (packages/db/schema/001_init.sql)

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'plus', 'pro')),
  roasts_this_month INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Auto-create trigger

```sql
CREATE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, split_part(NEW.email, '@', 1));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

## Session Management

- httpOnly cookie через `@supabase/ssr`
- Auto-refresh: Supabase refresh token в cookie
- Expiry: 1 час access token, 30 дней refresh token
- НИКОГДА не хранить в localStorage
