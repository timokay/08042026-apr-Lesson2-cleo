# Completion: Share Roast Card — Definition of Done

## Чеклист

### Backend
- [x] `app/api/share/route.ts` — POST /api/share
- [x] Auth check (401)
- [x] Ownership verification (404 if not owner)
- [x] Token generation: `randomBytes(8).toString('base64url')`
- [x] Reuse existing share_token
- [x] `UPDATE roasts SET is_public=true, share_token=token`

### Frontend (Share)
- [x] `RoastCard.tsx` — "Поделиться" кнопка
- [x] POST /api/share → clipboard.writeText
- [x] "Скопировано!" feedback (2s timeout)

### Public Page
- [x] `app/share/[token]/page.tsx` — Server Component
- [x] `generateMetadata()` — OG title, description, url
- [x] Token regex validation перед DB запросом
- [x] `notFound()` для невалидных/не найденных токенов
- [x] RoastCard (read-only) + CTA "Сделай свой анализ"

### Database
- [x] `roasts.share_token TEXT UNIQUE`
- [x] `roasts.is_public BOOLEAN DEFAULT FALSE`
- [x] RLS policy: `is_public = TRUE OR user_id = auth.uid()`
- [x] Partial index: `idx_roasts_share_token WHERE share_token IS NOT NULL`

### Infrastructure
- [x] `/share/*` исключён из auth middleware

## Метрики готовности

- ✅ Публичная страница без авторизации: работает
- ✅ OG meta tags: присутствуют
- ✅ Token entropy: 64 bits
- ✅ Security: ownership check + RLS
- ⏳ OG image — не реализована (only text meta)
- ⏳ Revoke шеринга — не реализован
