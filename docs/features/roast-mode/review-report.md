# Review Report: Roast Mode

**Дата:** 2026-04-12

## Статус: APPROVED с замечаниями ✅

## Сильные стороны

1. **Robust fallback chain**: Claude → YandexGPT → template — пользователь никогда не видит 500
2. **SSE \n\n enforcement**: критичный баг предотвращён
3. **X-Accel-Buffering: no**: nginx буферизация предотвращена
4. **Redis singleton**: корректный rate limiting без race conditions
5. **State machine**: понятная UI логика без сложного состояния

## Issues

### Major (требует внимания)
- **Language retry не реализован** — AI иногда отвечает по-английски при английских мерчантах
  - Рекомендация: добавить `detect_language(first_50_chars)` → retry с forced RU
  - Workaround: двойной RU указатель в prompt (сейчас так)

### Minor
- `generate_roast`: `sum(t.count for t in req.categories)` — не `transaction_count` из request. Может быть неточным если categories частичные
- `_stream_yandexgpt`: `asyncio.sleep(2 ** attempt)` внутри try-block — если asyncio.CancelledError брошен, он будет пойман `except Exception`. Нужно `except (httpx.HTTPError, asyncio.TimeoutError)`
- `CLAUDE_API_KEY` читается в module scope — при ротации ключа нужен restart (не hot-reload)

### Informational  
- `max_tokens: 600` может обрезать ростер в середине предложения
  - Рекомендация: raise до 800 или добавить stop sequence

## Security

- ✅ CLAUDE_API_KEY никогда не передаётся в клиент
- ✅ Rate limiting предотвращает злоупотребление
- ✅ Транзакции пользователя не логируются в plaintext

## Итог

Roast Mode production-ready с оговоркой: language retry нужен до GA. Остальные issues minor.
