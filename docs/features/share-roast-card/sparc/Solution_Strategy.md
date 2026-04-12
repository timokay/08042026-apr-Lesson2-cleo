# Solution Strategy: Share Roast Card

## Ключевые решения

### 1. randomBytes(8).base64url() как токен

**Обоснование:** 64 bits entropy — достаточно для URL (brute force нереален). URL-safe: нет `+/=`. Короткий (11 символов). Crypto-random (не Math.random).

**Альтернатива:** UUID — длиннее (36 символов), не URL-safe без дополнительной обработки.

### 2. Reuse existing token

**Обоснование:** Пользователь нажимает "Поделиться" несколько раз — URL должен быть одинаковым. Нет смысла инвалидировать старую ссылку.

**Реализация:** `token = roast.share_token ?? randomBytes(8).base64url()`

### 3. is_public=TRUE + RLS вместо отдельной таблицы

**Обоснование:** Простейшая модель. is_public toggle — идиоматично. RLS anon key читает только is_public=true строки. Нет N+1 join на shares таблицу.

### 4. /share/* исключён из middleware

**Обоснование:** Middleware проверяет auth для всех routes. /share/[token] должен быть публичным. Добавлен в excluded paths (`.claude/rules` — не redirect для /share/).

```typescript
// middleware.ts
const PROTECTED = ['/dashboard', '/roast', '/settings']
// /share/* — НЕ в списке, доступен без auth
```

### 5. Next.js Server Component для share page

**Обоснование:** SEO + OG tags генерируются на сервере. `generateMetadata()` — Next.js 15 API для SSR meta. Нет client-side fetch нужен для базовой страницы.

### 6. Token validation (regex) перед DB запросом

**Обоснование:** Предотвращает лишние DB запросы с мусором. `/^[a-zA-Z0-9_-]{8,16}$/` — valid base64url range. 404 вместо DB error.
