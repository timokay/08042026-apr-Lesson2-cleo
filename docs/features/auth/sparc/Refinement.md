# Refinement: Authentication

## Edge Cases

| # | Сценарий | Поведение |
|---|----------|-----------|
| E1 | /auth/callback без code параметра | Redirect /?auth_error=1 |
| E2 | code уже использован (replay) | Supabase error → /?auth_error=1 |
| E3 | Истёкший Magic Link (> 24 часов) | Supabase error → /?auth_error=1 |
| E4 | Пользователь открывает /dashboard без сессии | Redirect /?auth_required=1 |
| E5 | Сессия истекла → запрос к API | 401 UNAUTHORIZED от API route |
| E6 | Первый вход (новый пользователь) | DB trigger создаёт profile автоматически |
| E7 | Trigger profile fail (DB error) | Пользователь создан, профиля нет → graceful degradation |
| E8 | /share/* без сессии | Доступно (middleware исключает /share/*) |
| E9 | next= параметр с внешним URL | Суpabase/Next.js redirect только на same-origin |
| E10 | Пользователь удалён из auth.users | CASCADE delete profiles (ON DELETE CASCADE) |

## Security Checklist

- ✅ JWT в httpOnly cookies (не localStorage)
- ✅ RLS на всех таблицах
- ✅ exchangeCodeForSession (PKCE flow)
- ✅ updateSession в middleware (refresh tokens)
- ✅ Нет service role key в client-side коде
- ⚠️ next= parameter не валидируется (open redirect риск — low priority для v1)

## Тест-план

- TC-AUTH-001: Magic Link → session → /dashboard ✅
- TC-AUTH-002: Нет сессии → /dashboard redirect ✅  
- TC-AUTH-003: /share/* без сессии → 200 (публичная) ✅

## Известные ограничения

- Нет rate limiting на signInWithOtp (email abuse)
- next= не валидируется (open redirect) — minor для internal links
- Нет "Выйти" кнопки в UI (v1 - только через auth.signOut())
