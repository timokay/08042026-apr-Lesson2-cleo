# Refinement: Клёво
**Версия:** 1.0 | **Дата:** 2026-04-08

---

## Edge Cases Matrix

| Сценарий | Вход | Ожидаемый результат | Обработка |
|----------|------|---------------------|-----------|
| CSV без транзакций | Пустой файл | "Файл пустой — загрузи выписку с тратами" | Validation error |
| CSV только с доходами | Только зачисления | "Не нашли расходов. Загрузи выписку трат" | Show info message |
| Все траты в одной категории | 100% "Другое" | Dashboard показывает "Другое 100%" | Допустимо; AI prompt добавляет "категории неизвестны" |
| Транзакции из будущего | Дата > сегодня | Отфильтровать | Server-side filter |
| Очень маленькие суммы | < 1₽ | Включать в анализ | Без исключений |
| Огромный CSV | > 5000 строк | Обрабатывать первые 3000 | Truncation с уведомлением |
| LLM вернул пустой ответ | — | Retry (1 раз), fallback template | Silent retry |
| LLM вернул нероссийский текст | Ответ на английском | Повторный запрос с "Отвечай на русском!" | Prompt guard |
| Пользователь не имеет трат | 0 транзакций | "Добавь транзакции для ростера" | Guard clause |
| Concurrent upload (два файла) | Два CSV | Очередь: обработать последовательно | Job queue |
| Бесплатный пользователь исчерпал лимит | 4й ростер/мес | Paywall | Rate limit check |
| Plus истёк | expired_at < now | Downgrade to free + email уведомление | Cron job check |
| Share link к удалённому ростеру | is_public=false или deleted | 404 "Ростер не найден или удалён" | 404 page |
| Специальные символы в тратах | Emoji, HTML | Sanitize, не ломать UI | Input sanitization |
| Очень длинное описание | >500 символов | Truncate до 100 символов | DB constraint |

---

## Testing Strategy

### Unit Tests

**Priority: HIGH**

| Модуль | Тест | Coverage |
|--------|------|:--------:|
| CSV Parser | Парсинг Т-Банк формата | ✅ |
| CSV Parser | Парсинг Сбербанк формата | ✅ |
| CSV Parser | Невалидный файл → Error | ✅ |
| CSV Parser | Файл > 5MB → Error | ✅ |
| Parasite Detector | Регулярные списания → subscription | ✅ |
| Parasite Detector | Нерегулярные → not subscription | ✅ |
| Categorizer | Netflix → subscriptions | ✅ |
| Categorizer | Яндекс Еда → food_delivery | ✅ |
| Roast Generator | Prompt contains top category | ✅ |
| Share Card | Token uniqueness | ✅ |

**Target unit test coverage: 80%**

### Integration Tests

| Тест | Описание |
|------|----------|
| Upload → Dashboard flow | CSV upload → categories appear on dashboard |
| Roast generation | Transaction data → roast text from AI |
| Parasite detection | Known subscriptions detected correctly |
| Share link | Create roast → public link → access without auth |
| Rate limiting | Free user > 1 roast/month → 429 error |
| Payment flow | Stripe/Robokassa webhook → plan upgrade |

**Инструмент:** Playwright для E2E, Jest/Pytest для unit

### BDD Test Scenarios (Gherkin)

```gherkin
Feature: AI Roaster — Core Flow

Scenario: Happy path — первый ростер
  Given Максим загрузил CSV с 50 транзакциями за последний месяц
  When он нажимает "Поджарь мои расходы"
  Then в течение 5 секунд он видит начало стриминга ростера
  And ростер содержит название его топовой категории трат
  And ростер заканчивается 2 советами по экономии
  And он видит кнопку "Поделиться"

Scenario: Ошибка парсинга CSV
  Given Максим пытается загрузить Word документ (.docx)
  When он нажимает "Загрузить"
  Then он видит сообщение "Не смогли прочитать файл"
  And получает ссылку на инструкцию по скачиванию CSV из Т-Банка
  And файл не сохраняется на сервере

Scenario: Лимит бесплатного тарифа
  Given Алина использует бесплатный тариф
  And она уже получила 1 ростер в этом месяце
  When она нажимает "Поджарь мои расходы" второй раз
  Then она видит paywall "Ты уже использовала свой ростер этого месяца"
  And видит предложение апгрейда Клёво Plus за 299₽/мес

Feature: Parasite Scanner

Scenario: Happy path — найдены паразиты
  Given Алина загрузила выписку с 3 регулярными подписками
  When система сканирует транзакции
  Then она видит список: Netflix (590₽/мес), Canva (499₽/мес), Headspace (299₽/мес)
  And общая сумма "Паразиты: ₽1,388/мес" выделена жирным
  And у каждой подписки есть кнопки "Оставить" и "Отписаться"

Scenario: Паразиты не найдены
  Given Дмитрий загрузил выписку без регулярных подписок
  When система сканирует транзакции
  Then он видит "Молодец! Лишних подписок не обнаружено ✅"

Feature: Share

Scenario: Шеринг ростера
  Given Максим получил свой ростер
  When он нажимает "Поделиться"
  Then генерируется карточка с цитатой из ростера и логотипом Клёво
  And создаётся публичный URL вида klevo.app/share/[token]
  And по этому URL любой пользователь видит ростер без авторизации
  And на публичной странице есть CTA "Проверь свои расходы → klevo.app"
```

---

## Performance Optimizations

| Область | Оптимизация | Влияние |
|---------|-------------|:-------:|
| AI запросы | Streaming SSE (не ждать полного ответа) | UX: кажется быстрее |
| CSV parsing | Worker thread (не блокировать main thread) | Performance |
| Category images | Lazy loading + WebP формат | LCP |
| Dashboard charts | Recharts с виртуализацией для > 100 точек | Memory |
| Database | Индексы: `user_id`, `transaction_date`, `category` | Query speed |
| API responses | Edge caching для публичных страниц (/share/[token]) | TTFB |
| AI prompts | Prompt caching (Anthropic feature) для system prompts | Cost |
| CSV categorization | Batch AI calls (20 транзакций за один запрос) | Cost |

---

## Security Hardening

| Мера | Реализация |
|------|-----------|
| Rate limiting | Nginx: 10 req/s per IP; Redis: 10 AI req/min per user |
| Input validation | Zod схемы для всех API inputs |
| File upload | Magic bytes check (не только расширение) |
| SQL injection | Supabase parameterized queries (no raw SQL) |
| XSS | Next.js CSP headers + dangerouslySetInnerHTML запрещён |
| CSRF | SameSite=Strict cookies |
| Secrets exposure | No env vars in client bundles (NEXT_PUBLIC_ prefix only) |
| Audit logging | Все AI запросы логируются с user_id + timestamp |
| Data minimization | CSV не сохраняется, только extracted transactions |
| JWT expiry | Access token: 1 час; Refresh: 30 дней |

---

## Technical Debt Items

| Item | Priority | Когда решить |
|------|:--------:|-------------|
| Добавить TypeScript strict mode | Medium | v1 |
| Миграция с Supabase managed → self-hosted | High | До публичного запуска (ФЗ-152) |
| Добавить E2E тесты для payment flow | High | До монетизации |
| Prometheus метрики для AI service | Medium | v1 |
| Очистка старых CSV temp files | Low | v1 |
| i18n (для потенциального расширения) | Low | v2 |
