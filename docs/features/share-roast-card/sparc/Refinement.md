# Refinement: Share Roast Card

## Edge Cases

| # | Сценарий | Поведение |
|---|----------|-----------|
| E1 | Пользователь не авторизован → POST /api/share | 401 UNAUTHORIZED |
| E2 | roast_id не принадлежит пользователю | 404 NOT_FOUND (не раскрываем существование) |
| E3 | Повторный шеринг того же ростера | Reuse token, тот же share_url |
| E4 | Невалидный токен в URL (/share/../../etc) | regex fail → notFound() |
| E5 | Токен существует, is_public=false | notFound() (RLS фильтрует) |
| E6 | Токен не найден в DB | notFound() |
| E7 | clipboard API недоступен (HTTP, старый браузер) | Silent fail — кнопка остаётся "Поделиться", нет ошибки |
| E8 | Пользователь делает приватным уже публичный ростер | Не реализовано в v1 (нет revoke API) |
| E9 | roast_id не UUID | Zod validation → 400 |
| E10 | APP_URL не задан | Fallback 'http://localhost:3000' |

## Security Checklist

- ✅ Ownership check перед is_public=true
- ✅ Token entropy: 64 bits (randomBytes)
- ✅ URL validation перед DB запросом
- ✅ RLS: anon читает только is_public=true
- ⚠️ Нет revoke (is_public=false) — v1 limitation
- ⚠️ Нет rate limiting на POST /api/share — возможность спама токенов (low priority)

## Тест-план

- SC-SHARE-001: POST /api/share → share_url → GET /share/[token] → 200 ✅
- SC-SHARE-002: Cross-user share attempt → 404 ✅
- SC-SHARE-003: Invalid token → 404 ✅

## Известные ограничения

- Нет OG image (только title/description). Для Telegram это нормально, для Twitter card нужна image.
- Нет счётчика просмотров
- Нет возможности отозвать шеринг (is_public нельзя вернуть в false)
