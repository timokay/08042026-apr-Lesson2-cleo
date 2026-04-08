# BDD Test Scenarios: Клёво
**Дата:** 2026-04-08 | **Версия:** 1.0

---

## Feature: CSV Upload and Analysis

```gherkin
Feature: CSV Upload and Transaction Analysis

Background:
  Given the user is logged in as "Максим" with a free plan
  And the user is on the onboarding page

Scenario: Happy path — T-Bank CSV upload
  When he uploads "tbank_statement_march2025.csv"
  Then he sees a loading indicator "Анализируем..."
  And within 3 seconds he is redirected to the dashboard
  And the dashboard shows top-5 spending categories
  And the total amount matches the CSV sum

Scenario: Unsupported file format
  When he uploads "report.docx"
  Then he sees error "Не смогли прочитать файл"
  And he sees a link "Как скачать CSV из Т-Банка"
  And no data is stored in the database

Scenario: CSV with no expense transactions
  When he uploads a CSV with only incoming transfers
  Then he sees "Не нашли расходов. Загрузи выписку трат"
  And no categories are shown

Scenario: Very large CSV (>1000 rows)
  When he uploads a CSV with 2000 transactions
  Then he sees "Обрабатываем 2000 транзакций..."
  And the first 1000 most recent are processed
  And a banner shows "Показаны последние 1000 транзакций"
```

---

## Feature: AI Roast Mode

```gherkin
Feature: AI Roast Mode

Scenario: Happy path — first roast generation
  Given Максим has 50 transactions loaded for last month
  When he clicks "Поджарь мои расходы"
  Then within 2 seconds the first tokens of the roast appear (streaming)
  And the roast mentions his top spending category by name and amount
  And the tone is humorous but not offensive
  And the roast ends with exactly 2 actionable saving tips
  And after completion he sees a "Поделиться" button

Scenario: Roast on insufficient data
  Given Максим has only 3 transactions loaded
  When he clicks "Поджарь мои расходы"
  Then he sees "Маловато данных — добавь больше трат для полноценного ростера!"
  And no AI request is made (cost optimization)

Scenario: Rate limit reached (free plan)
  Given Алина has already received 1 roast this month
  When she clicks "Поджарь мои расходы"
  Then she sees "Ты уже использовала свой ростер этого месяца"
  And she sees an upgrade CTA "Клёво Plus — 299₽/мес"
  And no AI request is made

Scenario: AI API timeout/failure with fallback
  Given Claude API is unavailable (mocked)
  When Максим requests a roast
  Then the system automatically switches to YandexGPT
  And Максим sees a roast (may be slightly shorter)
  And no error is shown to the user

Scenario: Roast language validation
  Given Claude API returns an English response (mocked)
  When the AI service receives the response
  Then the system detects non-Russian language
  And retries the request with "Отвечай только на русском языке"
  And the final roast is in Russian
```

---

## Feature: Parasite Scanner

```gherkin
Feature: Subscription Parasite Scanner

Scenario: Happy path — multiple parasites found
  Given Алина has uploaded a CSV containing:
    | Netflix    | 590₽  | monthly |
    | Canva Pro  | 499₽  | monthly |
    | Headspace  | 299₽  | monthly |
  When she clicks "Найти паразитов"
  Then within 5 seconds she sees all 3 subscriptions listed
  And the total "Паразиты: ₽1,388/мес" is prominently displayed
  And each subscription has "Оставить" and "Отписаться" buttons
  And subscriptions are sorted by monthly amount (highest first)

Scenario: No parasites found
  Given Дмитрий has uploaded a CSV with no recurring charges
  When he clicks "Найти паразитов"
  Then he sees "Молодец! Лишних подписок не обнаружено ✅"
  And he sees a motivational message

Scenario: User marks subscription as "keep"
  Given a parasite scan has found 3 subscriptions
  When Максим clicks "Оставить" on Netflix
  Then Netflix is removed from the "parasites" list
  And it's marked as "known subscription" (won't appear next scan)
  And the total recalculates without Netflix
```

---

## Feature: Share Roast Card

```gherkin
Feature: Share Roast Card (Viral Mechanism)

Scenario: Generate and share roast card
  Given Максим has received a roast
  When he clicks "Поделиться"
  Then a preview card is generated within 3 seconds
  And the card shows: a funny quote from the roast, spending stat, Клёво branding
  And the card does NOT show his real name or exact account details
  And he can choose "Скачать PNG" or "Скопировать ссылку"
  And clicking "Скопировать ссылку" copies a URL like "klevo.app/share/abc123"

Scenario: Access public share page without login
  Given a roast share link exists at klevo.app/share/abc123
  When anyone visits the URL (no login required)
  Then they see the roast card with the funny content
  And they see a CTA "Проверь свои расходы → Попробовать Клёво"
  And clicking CTA redirects to signup with ref=abc123

Scenario: Expired or deleted share link
  Given a share link was deleted by the user
  When someone visits klevo.app/share/old-token
  Then they see a 404 page "Ростер не найден или был удалён"
  And they see a CTA to try Клёво themselves
```

---

## Feature: Monetization — Upgrade to Plus

```gherkin
Feature: Upgrade to Клёво Plus

Scenario: Paywall after first roast (optimal timing)
  Given Максим has just received his first roast
  When he sees the paywall CTA "Хочешь план от AI?"
  And he clicks "Апгрейдиться до Plus 299₽/мес"
  Then he sees the Plus features list
  And he can complete payment via Robokassa
  And after successful payment:
    - His plan updates to "plus" immediately
    - He receives email/Telegram confirmation
    - He can request unlimited roasts

Scenario: Failed payment
  Given Максим is on the payment page (mocked failure)
  When payment fails
  Then he sees "Платёж не прошёл. Попробуй другую карту"
  And his plan remains "free"
  And he can retry

Scenario: Plus plan expiry
  Given Алина's Plus plan expires at midnight
  When she logs in the next day
  Then she sees a notification "Твой Plus истёк"
  And she is downgraded to free plan
  And her free plan limits are enforced
  And she sees a renewal CTA

Scenario: Plus user has unlimited roasts
  Given Алина has Plus plan
  And she has already received 5 roasts this month
  When she requests the 6th roast
  Then the roast is generated without any paywall
  And no rate limit message appears
```

---

## Feature: Security

```gherkin
Feature: Data Security

Scenario: CSV is not stored on server
  Given Максим uploads a CSV
  When the parsing is complete
  Then only the extracted transactions are stored in the database
  And the raw CSV file is deleted from memory/temp storage
  And a GET /api/files endpoint returns 404 (no file storage)

Scenario: Unauthorized access to another user's data
  Given Максим is authenticated with user_id "maxim-uuid"
  When he makes a GET /api/transactions request with user_id "alina-uuid"
  Then he receives 403 Forbidden
  And Алина's transactions are not returned (Row Level Security)

Scenario: Rate limiting prevents AI abuse
  Given a malicious user makes 15 AI requests in 1 minute
  When the 11th request arrives
  Then they receive 429 Too Many Requests
  And response contains "Retry-After: 60" header
```
