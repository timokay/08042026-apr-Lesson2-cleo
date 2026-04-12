# Refinement: CSV Upload

## Edge Cases

| # | Сценарий | Поведение | Тест |
|---|----------|-----------|------|
| E1 | Файл не CSV (.docx, .pdf) | 400 "Не смогли прочитать файл" | test_csv_parser.py::test_unsupported_format |
| E2 | CSV только с входящими переводами (amount ≥ 0) | 422 "Не нашли транзакций" | test_csv_parser.py::test_incoming_only |
| E3 | 2000 строк в CSV | Только первые 1000, banner | test_csv_parser.py::test_truncation_at_1000 |
| E4 | cp1251 encoding | Правильный парсинг русского текста | test_csv_parser.py::test_encoding_cp1251 |
| E5 | Дублирующиеся строки | Дедупликация, одна запись | test_csv_parser.py::test_deduplication |
| E6 | Файл > 10 МБ | 413 "Максимум 10 МБ" | test_upload_route: file_too_large |
| E7 | Файл > 5 МБ, < 10 МБ | 400 от AI service → 400 с сообщением | test_upload_route: ai_size_limit |
| E8 | AI service недоступен | 503 "AI сервис недоступен" | test_upload_route: ai_service_down |
| E9 | Нет JWT сессии | 401 UNAUTHORIZED | test_upload_route: no_auth |
| E10 | Пустой CSV (заголовки без данных) | 422 "Не нашли транзакций" | test_csv_parser.py::test_empty_csv |

## Известные ограничения

- **cp1251 + разделитель `,`**: Редкий кейс (Сбер web иногда) — протестировать отдельно
- **NaN в сумме**: `parse_amount` возвращает None, строка пропускается (silent skip)
- **Часовые пояса**: Даты хранятся без timezone (только DATE, не TIMESTAMP)
- **MCC-коды**: Т-Банк иногда возвращает MCC вместо названия мерчанта — это нормально, категоризатор работает по MCC тоже

## Тест-план (связь с test-scenarios.md)

Сценарии из `docs/test-scenarios.md`:
- SC-CSV-001: Happy path — T-Bank CSV → 200 ✅
- SC-CSV-002: .docx файл → 400 ✅
- SC-CSV-003: Only incoming → "нет расходов" ✅
- SC-CSV-004: 2000 строк → 1000 + banner ✅

## Мониторинг

- Логировать `bank_format`, `encoding`, `rows_count`, `truncated` для аналитики
- Alert если error_rate > 5% (парсинг провальный)
