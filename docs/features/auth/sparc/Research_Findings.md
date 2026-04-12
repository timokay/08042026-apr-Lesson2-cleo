# Research Findings: Authentication

## Magic Link vs Пароли

| Метрика | Magic Link | Пароль |
|---------|-----------|--------|
| Security риск | Низкий (нет хешей) | Высокий (утечки) |
| UX friction | Средний (нужна почта) | Высокий (придумать пароль) |
| Support cost | Низкий (нет "забыл пароль") | Высокий |
| Adoption | Растёт (Notion, Linear, Loom) | Традиционно |
| Конверсия | ~85% при хорошей email delivery | ~70% (пароль → abandonment) |

**Вывод:** Magic Link оптимален для MVP.

## @supabase/ssr (Next.js 15)

- `@supabase/ssr` — официальный пакет для SSR/Edge/Middleware
- Заменяет устаревший `@supabase/auth-helpers-nextjs`
- `createBrowserClient` — для Client Components
- `createServerClient` — для Server Components и API routes
- Работает с App Router (не Pages Router)

## Next.js 15 async cookies()

**Критическое изменение в Next.js 15:**
- `cookies()` из `next/headers` теперь **async**
- Синхронный вызов выбрасывает предупреждение (deprecation) или ошибку
- Все примеры из Next.js 14 нужно обновить: `const cookieStore = await cookies()`

## ФЗ-152 и Auth

- Email адреса — персональные данные по ФЗ-152
- Должны храниться на VPS в РФ (HOSTKEY Москва)
- Cloud Supabase (US region) нарушает ФЗ-152
- Self-hosted Supabase на RU VPS — единственный compliant вариант

## Supabase PKCE Flow

PKCE (Proof Key for Code Exchange):
1. Client generates `code_verifier` (random string)
2. Client sends `code_challenge = SHA256(code_verifier)` с запросом
3. Callback: client sends `code` + `code_verifier`
4. Server verifies: `SHA256(code_verifier) == code_challenge`
5. If match: выдаёт session

Защита от code interception в URL.
