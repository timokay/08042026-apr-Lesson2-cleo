# Completion: Parasite Scanner — Definition of Done

## Чеклист

### Backend (AI service)
- [x] `services/parasite_detector.py` — find_parasites(), весь алгоритм
- [x] KNOWN_SUBSCRIPTIONS seed list (~30 сервисов)
- [x] Confidence levels: HIGH / MEDIUM
- [x] is_active detection (45-day threshold)
- [x] monthly amount normalization
- [x] top-20 limit

### Integration
- [x] Вызывается в POST /analyze (вместе с csv_parser + categorizer)
- [x] Включён в UploadResponseBody.parasites
- [x] Передаётся в Next.js /api/upload response

### Frontend
- [x] `SubscriptionList.tsx` — отображение подписок
- [x] Confidence badge (HIGH/MEDIUM/LOW)
- [x] is_active badge "Неактивная"
- [x] Total monthly waste
- [x] Keep/Cancel кнопки (UI only, не меняет данные)

### Tests
- [x] `tests/test_parasite_detector.py` — 9 тестов
- [x] Покрыты: happy path, confidence levels, is_active, edge cases

### Security
- [x] Работает только на transaction_ids пользователя (никакой cross-user доступ)
- [x] Никаких внешних запросов (чисто алгоритм)

## Метрики готовности

- ✅ Алгоритм детерминирован и тестируем
- ✅ Confidence levels работают
- ✅ 9 тестов зелёные
- ⏳ Production A/B тест precision/recall — не проводился
