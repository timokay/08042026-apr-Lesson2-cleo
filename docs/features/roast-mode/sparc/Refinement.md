# Refinement: Roast Mode

## Edge Cases

| # | Сценарий | Поведение | Тест |
|---|----------|-----------|------|
| E1 | < 10 транзакций | "Маловато данных" без AI вызова | test_roast_insufficient_data |
| E2 | 10-й запрос/мин | 429 + Retry-After: 60 | test_rate_limiter_blocks_11th |
| E3 | 15+ запросов/мин (anti-abuse) | 429 + блок на 1 час | test_rate_limiter_anti_abuse |
| E4 | Claude timeout (> 30с) | YandexGPT fallback, нет ошибки пользователю | test_claude_timeout_fallback |
| E5 | Claude + YandexGPT оба упали | Generic template, нет 500 | test_all_ai_failed_generic |
| E6 | AI ответил на English | Должен быть retry (пока не реализован — language check pending) | - |
| E7 | Free plan (1 ростер/мес) | Upgrade CTA после первого ростера | test_monthly_limit_free_plan |
| E8 | SSE прерван клиентом (закрыл вкладку) | asyncio.CancelledError — graceful, не падает | - |
| E9 | Nginx буферизует SSE | X-Accel-Buffering: no header предотвращает | - |
| E10 | proxyapi.ru недоступен | httpx ConnectError → fallback | test_proxy_unavailable |

## Известные ограничения

- **Language retry:** Детектирование EN ответа и retry не реализованы в v1. Митигация: двойной RU prompt.
- **YandexGPT non-streaming:** Пользователь видит задержку перед появлением текста (не поток)
- **Roast context window:** Max 600 токенов — может обрезать длинные ростеры
- **proxyapi.ru latency:** +200-400ms к TTFT vs прямой Claude API

## Тест-план

Из `docs/test-scenarios.md`:
- SC-ROAST-001: 50 транзакций → streaming roast ✅
- SC-ROAST-002: < 10 транзакций → "insufficient data" ✅
- SC-ROAST-003: Rate limit free plan → upgrade CTA ✅
- SC-ROAST-004: Claude timeout → YandexGPT fallback ✅
- SC-ROAST-005: AI responds in English → retry (pending)

## Мониторинг

- TTFT (time to first token) — alert если > 3с
- Fallback rate — alert если > 20% (Claude проблема)
- Completion rate — продуктовая метрика
- Rate limit hits / уникальный пользователь
