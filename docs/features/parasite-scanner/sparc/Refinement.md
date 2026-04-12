# Refinement: Parasite Scanner

## Edge Cases

| # | Сценарий | Поведение | Тест |
|---|----------|-----------|------|
| E1 | Только 1 списание на мерчанта | Не добавляется в parasites | test_single_charge_not_detected |
| E2 | Паттерн с большим std_dev (квартальная подписка) | Не определяется как подписка | test_irregular_not_detected |
| E3 | Известная подписка (Netflix) → HIGH confidence | confidence="high" | test_known_subscription_high_confidence |
| E4 | Неизвестный recurring (ЖКХ каждые 30 дней) | confidence="medium" | test_unknown_recurring_medium |
| E5 | Последнее списание > 45 дней назад | is_active=False | test_inactive_subscription |
| E6 | Доход (amount > 0) с регулярным паттерном | Игнорируется | test_income_not_detected |
| E7 | 25 найденных подписок | Возвращается только top 20 | test_max_20_returned |
| E8 | Две транзакции с интервалом 3 дня | is_recurring=False (avg=3 < 7) | test_too_frequent_not_detected |
| E9 | Мерчант с длинным именем (> 40 символов) | Нормализуется до 40 символов для группировки | test_long_merchant_grouping |
| E10 | Пустой список транзакций | Возвращается [] | test_empty_input |

## Граничные значения

```
std_dev: 0 (идеально регулярно), 4.99 (just в пороге), 5.0 (уже нет)
avg_interval: 7 (еженедельно), 30 (ежемесячно), 35 (раз в 5 недель max), 36 (нет)
days_since_last: 45 (граница активности)
```

## Тест-план

Из `docs/test-scenarios.md`:
- SC-PARASITE-001: 50 транзакций → найдены подписки ✅
- SC-PARASITE-002: уровни confidence корректны ✅

Реализовано в `tests/test_parasite_detector.py` — 9 тестов.

## Мониторинг

- false_positive_rate (пользователь нажимает "оставить") — собирать как сигнал качества
- avg_parasites_per_user — продуктовая метрика
