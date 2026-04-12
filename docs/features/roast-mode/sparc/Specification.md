# Specification: Roast Mode

## User Stories

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| US-020 | Как пользователь, хочу видеть ростер в реальном времени (streaming) | SSE поток, текст появляется по токену |
| US-021 | Как пользователь, хочу ответ строго на русском | retry если AI ответил на другом языке |
| US-022 | Как пользователь, хочу fallback если Claude недоступен | YandexGPT ответит без ошибки пользователю |
| US-023 | Как пользователь, хочу видеть лимит (free plan) | 429 + upgrade CTA, не техническая ошибка |

## API Контракты

### POST /api/roast (Next.js BFF)

**Request:**
```json
{ "period": "2025-03" }
```

**Auth:** JWT cookie, 401 если нет

**Response:** `Content-Type: text/event-stream`
```
data: {"type":"token","text":"Слушай"}
data: {"type":"token","text":", ты потратил"}
data: {"type":"done","roast_id":"uuid"}
```

**Коды ошибок:**
| HTTP | Когда |
|------|-------|
| 401 | Нет сессии |
| 429 | Rate limit (+ `Retry-After: 60`) |
| 422 | < 10 транзакций для периода |
| 503 | Все AI backends недоступны |

### POST /roast (AI service, внутренний)

**Request:**
```json
{
  "period": "2025-03",
  "total_spent": 35820.50,
  "categories": [...CategorySummary[]],
  "parasites": [...Subscription[]],
  "transaction_count": 47
}
```

**Response:** `text/event-stream`
```
data: {"type":"token","text":"..."}
data: {"type":"done"}
```

## Rate Limiting

- **Sliding window:** 10 запросов / 60 сек / user_id (Redis)
- **Monthly:** 1 ростер / месяц / user_id (free plan)
- **Anti-abuse:** 15+ запросов / 60 сек → блок на 1 час
- **Response:** 429 с `Retry-After: 60`

## SSE Protocol

Каждый chunk:
```
data: {json}\n\n
```
(обязательно `\n\n` в конце — критично для nginx)

Done event:
```
data: {"type":"done","roast_id":"<uuid>"}\n\n
```

## System Prompt

```
Ты — Клёво. Юмористичный, дружелюбный финансовый советник.
Стиль: лучший друг с правдой. Молодёжный русский (без матов). 300 слов.
Структура: ударная фраза → ростер (2-3 абзаца) → 2 совета.
ВАЖНО: ТОЛЬКО на русском языке.
```
