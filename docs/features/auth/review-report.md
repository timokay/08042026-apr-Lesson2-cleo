# Review Report: Authentication

**Дата:** 2026-04-12

## Статус: APPROVED ✅

## Сильные стороны

1. **httpOnly cookies**: правильная стратегия, XSS-safe
2. **PKCE flow**: exchangeCodeForSession — не raw token в URL
3. **3 клиента**: правильная изоляция browser/server/middleware контекстов
4. **await cookies()**: Next.js 15 совместимость соблюдена
5. **DB trigger**: атомарное создание profile
6. **Middleware исключения**: /share/*, статика — без лишних auth checks

## Issues

### Minor
- `app/auth/callback/route.ts`: `next` параметр не валидируется — potential open redirect
  - Рекомендация: `const next = searchParams.get('next')?.startsWith('/') ? ... : '/dashboard'`
  - Патч: 3 строки кода
- Нет rate limiting на `/auth/callback` — возможен DoS через повторные code submission
  - Mitigation: Supabase само инвалидирует code после первого использования

### Informational
- `lib/supabase/server.ts`: одна функция `createClient()` — хорошо для простоты, но при необходимости service-role потребуется второй export
- Magic Link TTL 24 часа — можно уменьшить до 1 часа для security (tradeoff с UX)

## Security Audit

- ✅ Нет localStorage для токенов
- ✅ JWT validation на каждом API route
- ✅ Supabase service role key не в клиентском коде
- ✅ Redirect только на same-origin (почти — см. minor issue выше)
- ✅ RLS на всех таблицах

## ФЗ-152 Compliance

- ✅ Self-hosted Supabase (не US cloud)
- ✅ Email данные на RU VPS
- ✅ Нет передачи PII во внешние сервисы

## Итог

Auth реализован правильно. Один minor fix (next= validation) рекомендован до GA. Остальное production-ready.
