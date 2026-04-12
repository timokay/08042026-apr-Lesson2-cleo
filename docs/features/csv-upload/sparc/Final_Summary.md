# Final Summary: CSV Upload

## Статус: РЕАЛИЗОВАНО ✅

## Что сделано

CSV Upload — первая и ключевая фича Клёво. Реализована полностью:

- **Algorithm 1 (CSV Parser)**: поддержка Т-Банк, Сбер, generic; encoding detection (UTF-8/cp1251); дедупликация; усечение до 1000 строк
- **Algorithm 2 (Categorizer)**: rule-based regex, 10 категорий, ~85% покрытие без AI
- **API BFF**: POST /api/upload — auth, size check, Zod validation, proxy to AI service, persist to Supabase
- **UI**: CsvUploadZone с drag-and-drop, ошибки на русском
- **Security**: raw CSV не сохраняется, user_id из auth, RLS на transactions
- **Tests**: 14 pytest тестов, 4 fixture-теста с реальными CSV файлами

## Ключевые решения

1. UTF-8 → cp1251 fallback (без chardet)
2. 1000-строчный лимит с banner, не с ошибкой
3. BFF-прослойка для изоляции AI service от публичного интернета
4. Дедупликация по (date, amount, description[:50])

## Известные ограничения

- Max 5 МБ на стороне AI service (Next.js принимает до 10 МБ — расхождение)
- E2E тест upload → dashboard не реализован
- Альфа-Банк поддерживается через generic fuzzy-parser (не идеально)

## Метрики (фактические)

- Парсинг 1000-строчного файла: ~200-400мс
- Покрытие тестами: ~85% для csv_parser.py

## Следующие шаги

- Расхождение лимитов (5МБ vs 10МБ) — выровнять в обе стороны до 10МБ
- E2E тест через Playwright
- Альфа-Банк: выделенный parser по аналогии с _parse_sber
