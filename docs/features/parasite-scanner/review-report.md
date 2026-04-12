# Review Report: Parasite Scanner

**Дата:** 2026-04-12

## Статус: APPROVED ✅

## Сильные стороны

1. **Чистый алгоритм**: 0 внешних зависимостей, pure Python stdlib
2. **Хорошая тестируемость**: детерминированный алгоритм → легко писать assert
3. **Правильная обработка граничных случаев**: len(txns) < 2, пустые intervals
4. **Осторожная нормализация**: merchant[:40] предотвращает memory issues
5. **is_active flag**: пользователи видят "уснувшие" подписки

## Issues

### Minor
- `statistics.stdev([x])` с 1 элементом бросает `StatisticsError` — в коде обходится `if len(intervals) > 1 else 0`, но стоит добавить comment
- `mode()` для display_name не используется stdlib — кастомная реализация через `max(..., key=lambda n: sum(...))` — работает, но verbose
- KNOWN_SUBSCRIPTIONS — hardcoded в модуле, не в config — сложнее обновлять

### Informational
- `is_active = days_since_last <= 45` — магическое число 45, стоит сделать константой `INACTIVITY_THRESHOLD_DAYS = 45`
- `parasites[:20]` — тоже магическое число, константа `MAX_PARASITES = 20`

## Риски

- precision деградирует при коротких периодах (< 2 месяца данных)
  - Mitigation: min_transactions_for_reliable = 4 (2× цикла), предупреждение пользователю
- Merchant normalization[:40] может объединять разные мерчанты с похожим началом имени
  - Unlikely для реальных данных, нет action нужен

## Итог

Чистый, тестируемый, production-ready код. Minor issues не блокируют. Рекомендую добавить константы для magic numbers.
