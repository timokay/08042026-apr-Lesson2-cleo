# Review Report: Share Roast Card

**Дата:** 2026-04-12

## Статус: APPROVED ✅

## Сильные стороны

1. **Security**: ownership check + RLS = двойная защита
2. **Token entropy**: randomBytes(8) = crypto-grade
3. **Reuse pattern**: идемпотентный шеринг
4. **Token validation**: regex перед DB = нет лишних запросов
5. **Server Component**: SSR OG meta — правильно

## Issues

### Minor
- Нет rate limiting на POST /api/share — пользователь может генерировать токены для чужих roast_id (но ownership check → 404, так что реальный вред минимален)
- `notFound()` после token regex fail — correct, но нет logging. Сложно дебажить если regex слишком строгий
- Clipboard API failure — silent. Стоит добавить fallback: `<input value={url} onClick={select}>`

### Informational
- `NEXT_PUBLIC_APP_URL` — единственный ENV var. Если не задан → localhost:3000 в share URL. Документировать в .env.example ✅ (уже есть)

## Security Audit

- ✅ IDOR защита: `.eq('user_id', user.id)` в WHERE
- ✅ SQL injection: parameterized queries (Supabase client)
- ✅ Token не предсказуем: crypto.randomBytes
- ✅ RLS не отключается при service role key (не используется в этом route)

## Итог

Чистая, безопасная реализация. Minor issues не блокируют. Рекомендую только clipboard fallback.
