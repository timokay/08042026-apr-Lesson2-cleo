# Completion: CSV Upload — Definition of Done

## Чеклист реализации

### Backend (AI service)
- [x] `services/csv_parser.py` — detect_encoding, detect_bank_format, parse_csv
- [x] Поддержка форматов: Т-Банк, Сбер, generic
- [x] Дедупликация и усечение до 1000 строк
- [x] `services/categorizer.py` — rule-based + CATEGORY_PATTERNS
- [x] Возвращает Transaction[], CategorySummary[], Subscription[]
- [x] Ошибки на русском языке (ValueError с human-readable сообщением)

### Backend (Next.js BFF)
- [x] `app/api/upload/route.ts` — POST /api/upload
- [x] Auth check (401 без сессии)
- [x] File size check (413 > 10 МБ)
- [x] Zod validation query params
- [x] Проксирование в AI service
- [x] Persist Transaction[] в Supabase
- [x] Raw CSV НЕ сохраняется (только память)

### Frontend
- [x] `CsvUploadZone.tsx` — drag-and-drop, error states, spinner
- [x] Интеграция с /api/upload
- [x] Показ CategoryPieChart + SubscriptionList после успешной загрузки
- [x] Banner "Показаны первые 1000 транзакций" если truncated

### Database
- [x] `transactions` table с RLS (`user_id = auth.uid()`)
- [x] Индекс: `idx_transactions_user_date`

### Tests
- [x] `tests/test_csv_parser.py` — 10 тестов
- [x] `tests/test_csv_parser_fixtures.py` — 4 fixture-теста
- [x] Fixtures: tbank_march2025.csv, tbank_cp1251.csv, tbank_incoming_only.csv, large_2000_rows.csv
- [ ] `apps/web/__tests__/api/upload.test.ts` — API route unit tests (pending)

### Security
- [x] GET /api/files → 404 (нет эндпоинта хранения файлов)
- [x] user_id берётся из auth.getUser(), не из body
- [x] RLS на transactions

## Метрики готовности

- ✅ Парсинг Т-Банк UTF-8: работает
- ✅ Парсинг Т-Банк cp1251: работает
- ✅ Фильтрация доходов: работает
- ✅ Лимит 1000 строк: работает
- ✅ Дедупликация: работает
- ⏳ E2E тест upload → dashboard: не реализован
