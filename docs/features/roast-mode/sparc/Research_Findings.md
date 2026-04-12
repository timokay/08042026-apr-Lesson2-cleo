# Research Findings: Roast Mode

## Вирусная механика финансовых продуктов

- Cleo (US): roast feature → 40% пользователей делились скриншотами (внутренние данные 2022)
- "Финансовый стыд" + юмор = высокое вовлечение. Shame без юмора = churn.
- Персонализация (конкретные числа и категории) увеличивает share rate в 3× vs generic text

## AI Tone Research

- "Дружелюбная честность" (friendly honesty) — оптимальный тон для фин. советника
- Молодёжь 18–30 реагирует лучше на peer-voice (как друг), не на эксперт-voice
- Эмодзи: 1–2 на ответ — воспринимается positively; > 5 = выглядит неискренне

## Streaming UX (React)

- TTFT (time to first token) < 2.5с — пользователь воспринимает как responsive
- TTFT > 3с — 25% пользователей закрывают вкладку (Nielsen Norman, 2023)
- Blinking cursor animation во время streaming — снижает воспринимаемую latency

## Claude API через proxyapi.ru

- proxyapi.ru — российский прокси для Anthropic API
- Latency overhead: +200–400ms (Москва–Москва роут)
- Rate limits: аналогичны прямому Claude API (tier-based)
- Availability SLA: ~99.5% (не публичный, наблюдение сообщества)

## YandexGPT 3 как fallback

- API: `https://llm.api.cloud.yandex.net/foundationModels/v1/completion`
- Нет streaming на основном endpoint (только polling или SSE с 2024-Q4)
- Качество ответов на русском: сопоставимо с Claude-3-Haiku для коротких текстов
- Rate limits: 50 RPM по умолчанию (строже Claude)
- Необходим exponential backoff при 429: 1s → 2s → 4s

## Конкуренты

| Продукт | Roast feature | Streaming | RU |
|---------|--------------|-----------|-----|
| Cleo (US) | ✅ | Нет | Нет |
| Monarch Money | Нет | — | Нет |
| Дзен-мани | Нет | — | ✅ |
| **Клёво** | ✅ | ✅ | ✅ |

Клёво — единственный RU-продукт с personality-driven AI ростером.
