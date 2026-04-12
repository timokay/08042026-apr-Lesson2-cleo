# Architecture: Share Roast Card

## Компоненты

```
Browser (authenticated user)
  └─ RoastCard.tsx — "Поделиться" кнопка
       POST /api/share → clipboard copy

Next.js BFF
  └─ app/api/share/route.ts
       auth → verify ownership → generate/reuse token → update DB

Supabase
  └─ roasts table: share_token, is_public
       RLS: is_public=TRUE → readable by anyone

Next.js SSR (public)
  └─ app/share/[token]/page.tsx
       generateMetadata() → OG tags
       Server Component, no auth required
```

## Поток шеринга

```
1. User clicks "Поделиться" on RoastCard
2. POST /api/share { roast_id: "uuid" }
3. Auth check → 401 if no session
4. SELECT roasts WHERE id=? AND user_id=auth.uid()
   → 404 if not found
5. IF roast.share_token EXISTS → reuse
   ELSE → token = randomBytes(8).toString('base64url')
6. UPDATE roasts SET is_public=true, share_token=token WHERE id=?
7. RETURN { share_url: `${APP_URL}/share/${token}`, token }
8. Browser: navigator.clipboard.writeText(share_url)
9. "Скопировано!" feedback (2 секунды)
```

## Поток просмотра (публичная страница)

```
1. Recipient opens /share/abc123XY
2. Next.js middleware: /share/* исключён из protected paths
3. app/share/[token]/page.tsx
4. Validate token format: /^[a-zA-Z0-9_-]{8,16}$/
   → notFound() if invalid
5. SELECT * FROM roasts WHERE share_token=? AND is_public=TRUE
   (RLS anon key: is_public=TRUE condition applied)
   → notFound() if not found
6. generateMetadata(): OG title, description, url
7. Render: RoastCard с текстом ростера (read-only, без кнопок)
8. CTA: "Сделать свой анализ → klevo.app"
```

## Security

- Token validation (regex) предотвращает path traversal и SQL injection
- RLS: is_public=TRUE — нельзя получить приватный ростер по токену
- Ownership check: user_id = auth.uid() перед установкой is_public
- randomBytes(8) = 64 bits entropy — достаточно для share URL
