# Review Report: CSV Upload

**Дата:** 2026-04-12
**Тип:** Code Review (retroactive)

## Статус: APPROVED ✅

## Сильные стороны

1. **Security-first**: raw CSV не сохраняется, user_id из auth middleware, RLS включён
2. **Robustness**: encoding detection без внешних зависимостей, graceful degrade на generic parser
3. **Test coverage**: 14 тестов, fixture-based подход, реальные CSV файлы
4. **Error messages**: все ошибки на русском, user-friendly
5. **Deduplication**: защита от двойного импорта

## Найденные Issues

### Minor
- `MAX_FILE_SIZE` в csv_parser.py (5 МБ) отличается от Next.js route (10 МБ) — нет consistency
  - Рекомендация: вынести в общую env var или поднять AI service до 10 МБ
- `_parse_generic` не логирует detected columns — сложно дебажить незнакомые форматы
  - Рекомендация: `logger.debug("Generic parser: date_col=%s, amount_col=%s", ...)`
- `bank` передаётся как query param — не валидируется Zod строго (принимает любую строку)
  - Рекомендация: `z.enum(["tbank", "sber", "alfa", "auto"])`

### Informational
- `_parse_tbank` использует `.get("MCC") or description[:50]` для merchant — inconsistent
- `parse_date` форматы захардкожены, не константа — minor readability issue

## Риски

- Если Т-Банк изменит структуру CSV — парсер сломается тихо (возвращает [])
  - Mitigation: мониторинг ошибок `parse_csv` в production, алерт при аномальном росте

## Итог

CSV Upload реализован качественно. Все критические требования (безопасность, корректность) выполнены. Minor issues не блокируют.
