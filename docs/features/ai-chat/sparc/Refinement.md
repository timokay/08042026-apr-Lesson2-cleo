# Refinement: AI Chat

## Edge Cases Matrix

| Сценарий | Входные данные | Ожидаемое поведение | Обработка |
|----------|---------------|---------------------|-----------|
| Нет транзакций | user без CSV | 422 + "Загрузи выписку" | BFF check перед AI call |
| Пустое сообщение | message: "" | 400 VALIDATION_ERROR | Zod schema |
| Сообщение > 1000 символов | message: 1001 chars | 400 VALIDATION_ERROR | Zod schema |
| Ежедневный лимит (free) | 11-е сообщение | 429 + upgrade CTA | Redis counter |
| Redis недоступен | Redis timeout | Деградация: без истории, лимит не проверяется | try/catch в BFF |
| AI timeout > 8s | Claude не отвечает | Fallback YandexGPT | timeout в chat_generator |
| YandexGPT тоже падает | оба AI недоступны | SSE error event, 503 в UI | двойной fallback |
| Одновременные запросы | 2 вкладки, один user | Per-user rate limit блокирует злоупотребление | Redis sliding window |
| XSS в сообщении | `<script>alert(1)</script>` | Текст отображается как plain text | React escaping |
| Инъекция в промпт | `Ignore instructions...` | Передаётся как user content, не меняет system prompt | System prompt изолирован |
| session_id подделан | чужой session_id | Видит чужую историю | **КРИТИЧНО**: session_id должен включать user_id hash |

### Критичный edge case: session_id isolation

session_id генерируется на клиенте (UUID). Злоумышленник может угадать или подобрать чужой session_id и получить историю чата.

**Митигация:** В Redis ключ включает user_id:
```
chat:history:{user_id}:{session_id}
```
BFF всегда подставляет `user.id` из JWT, не из запроса.

## Test Scenarios (Gherkin)

```gherkin
Feature: AI Chat

  Scenario: Успешный ответ с контекстом
    Given я авторизован и загрузил 50 транзакций
    When я отправляю "на что трачу больше всего?"
    Then первый токен приходит в течение 2.5 секунд
    And ответ содержит название топ-категории из моих данных
    And полный ответ отображается в чате

  Scenario: Streaming отображается токен за токеном
    Given я авторизован
    When я отправляю сообщение
    Then я вижу индикатор набора текста сразу
    And буквы появляются постепенно (streaming)
    And input заблокирован до получения done-события

  Scenario: Free план — лимит 10 сообщений
    Given я на free плане и отправил 10 сообщений сегодня
    When я пытаюсь отправить 11-е сообщение
    Then я вижу "Лимит 10 сообщений/день"
    And отображается кнопка "Получить Plus"
    And сообщение не отправляется

  Scenario: Plus план — без ограничений
    Given я на Plus плане
    When я отправляю 15 сообщений подряд
    Then все сообщения обрабатываются без ошибок

  Scenario: Контекст сессии сохраняется
    Given я спросил "почему так много на еде?"
    And AI ответил
    When я спрашиваю "как это сократить?"
    Then AI ссылается на еду из предыдущего ответа

  Scenario: Нет транзакций
    Given я авторизован но не загружал CSV
    When я открываю /chat
    Then я вижу сообщение "Сначала загрузи выписку"
    And кнопку "Загрузить CSV"

  Scenario: Quick reply
    Given я открываю /chat впервые
    Then я вижу 3 кнопки быстрых ответов
    When я нажимаю "💸 На что трачу больше всего?"
    Then отправляется соответствующее сообщение автоматически

  Scenario: AI timeout → YandexGPT fallback
    Given Claude API не отвечает > 8 секунд
    When я отправляю сообщение
    Then ответ приходит от YandexGPT
    And пользователь не видит ошибки (seamless fallback)

  Scenario: Оба AI недоступны
    Given Claude и YandexGPT оба недоступны
    When я отправляю сообщение
    Then я вижу "AI сейчас недоступен, попробуй позже"
    And кнопка "Попробовать снова" отображается
```

## Performance Considerations

- **Context size**: summary вместо raw транзакций → ~500 токенов контекст vs 50K+ для raw данных
- **History window**: max 20 сообщений (10 пар) в контексте → предсказуемый token budget
- **Redis pipeline**: INCR + EXPIRE в одном pipeline → атомарная операция
- **Streaming**: perceived latency решается стримингом, реальная latency < 2.5s для первого токена

## Security Hardening

- session_id в Redis ключе содержит user_id → изоляция истории
- message проходит через Zod validation перед AI call → no prompt injection via length
- System prompt изолирован от user content → структурное разделение
- Суммарный контекст транзакций (не raw) → минимизация PII в промптах
- Daily counter в BFF (не AI Service) → нельзя обойти, минуя BFF
