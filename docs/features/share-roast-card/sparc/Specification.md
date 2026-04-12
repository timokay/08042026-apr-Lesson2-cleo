# Specification: Share Roast Card

## User Stories

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| US-030 | Как пользователь, хочу поделиться ростером через ссылку | POST /api/share → { share_url } → clipboard |
| US-031 | Как получатель, хочу увидеть ростер без логина | GET /share/[token] — публичная страница |
| US-032 | Как получатель, хочу красивое превью в Telegram | OG meta: title, description |
| US-033 | Как пользователь, повторный шеринг → та же ссылка | Reuse share_token если уже есть |

## API

### POST /api/share

**Auth:** JWT cookie (обязателен — только владелец может шарить)

**Request:**
```json
{ "roast_id": "uuid" }
```

**Validation:** Zod — `z.object({ roast_id: z.string().uuid() })`

**Authorization check:**
```sql
SELECT id, share_token, user_id FROM roasts
WHERE id = ? AND user_id = auth.uid()
```
404 если не найдено или не владелец.

**Response 200:**
```json
{
  "share_url": "https://klevo.app/share/abc123XY",
  "token": "abc123XY"
}
```

**Token generation:**
```typescript
randomBytes(8).toString('base64url')  // URL-safe, 11 chars
```

### GET /share/[token] (публичный роут)

**Auth:** Не требуется (исключён из middleware protected paths)

**Page:** Server Component, SSR

**Data fetch:**
```sql
SELECT r.*, u.display_name
FROM roasts r
WHERE share_token = ? AND is_public = TRUE
```

**Response:** HTML страница с OG мета.

**OG Tags:**
```html
<meta property="og:title" content="Мой финансовый ростер от Клёво" />
<meta property="og:description" content="Посмотри как AI поджарил мои расходы 🔥" />
<meta property="og:url" content="https://klevo.app/share/{token}" />
```

**Error handling:**
- Token не найден или is_public=false → `notFound()` (404)
- Invalid token format → `notFound()` (проверка regex `/^[a-zA-Z0-9_-]{8,16}$/`)

## Database

### roasts table
```sql
share_token TEXT UNIQUE,  -- NULL if not shared
is_public BOOLEAN DEFAULT FALSE
```

### RLS Policy
```sql
-- Чтение: own roasts OR is_public = true
CREATE POLICY "select_roasts_own_or_public"
ON roasts FOR SELECT
USING (user_id = auth.uid() OR is_public = TRUE);
```

### Index
```sql
CREATE INDEX idx_roasts_share_token
ON roasts (share_token)
WHERE share_token IS NOT NULL;  -- partial index
```
