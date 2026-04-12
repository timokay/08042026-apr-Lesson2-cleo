# Specification: CSV Upload

## User Stories

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| US-001 | Как пользователь, хочу загрузить CSV из Т-Банка и увидеть расходы | Транзакции появляются в dashboard, категоризированы |
| US-002 | Как пользователь, хочу получить ошибку если файл не CSV | 400 с "Не смогли прочитать файл" |
| US-003 | Как пользователь, хочу что только первые 1000 строк обработаны | Banner "Показаны первые 1000 транзакций" |
| US-004 | Как пользователь, хочу что все расходы сохранены, но файл не хранится | GET /api/files → 404 |

## API Контракт

### POST /api/upload

**Request:** `multipart/form-data`
```
file: File (CSV)
bank: "tbank" | "sber" | "alfa" | "auto"  (query param, default: "auto")
```

**Auth:** JWT cookie (Supabase), 401 если нет сессии

**Response 200:**
```json
{
  "transactions_count": 47,
  "period": { "start": "2025-01-01", "end": "2025-03-31" },
  "categories": [
    { "category": "food_delivery", "total": 12340.50, "count": 23, "percent": 34.5 }
  ],
  "parasites": [
    { "name": "Яндекс Плюс", "amount_per_month": 299.0, "confidence": "high" }
  ]
}
```

**Коды ошибок:**

| HTTP | Code | Когда |
|------|------|-------|
| 401 | UNAUTHORIZED | Нет сессии |
| 400 | PARSE_ERROR | Не CSV, неверный формат |
| 413 | FILE_TOO_LARGE | Файл > 10 МБ |
| 400 | VALIDATION_ERROR | Неверные query params |
| 503 | INTERNAL_ERROR | AI service недоступен |

### AI Service: POST /analyze

**Request:** `multipart/form-data`
```
file: File (CSV)
user_id: string (UUID)
bank: string
```

**Response 200:**
```json
{
  "transactions": [...],
  "categories": [...],
  "parasites": [...],
  "period": { "start": "...", "end": "..." },
  "total_spent": 35820.50
}
```

**AI service errors (5 МБ лимит):**
```json
{ "detail": { "code": "FILE_TOO_LARGE", "message": "Файл слишком большой. Максимум 5 МБ" } }
```

## Ограничения

- Файл: max 10 МБ (Next.js route), max 5 МБ (AI service для парсинга)
- Строки: max 1000 транзакций (усечение без ошибки)
- Кодировки: UTF-8, cp1251
- Разделители: `;` (Т-Банк, Сбер), `,` (generic)
- Хранение: НИКОГДА не сохранять raw CSV файл — только Transaction[]
