# Specification: Клёво
**Версия:** 1.0 | **Дата:** 2026-04-08

---

## 1. User Stories (MVP)

### Epic 1: Паразит-Детектор (Acquisition Hook)

#### US-001: Загрузка CSV выписки
```gherkin
As a Максим (18-30, новый пользователь),
I want to upload my bank statement CSV,
So that I can see where my money goes without connecting my bank account.

Acceptance Criteria:
Given I am on the onboarding page
When I upload a valid CSV file from T-Bank/Sberbank/Alfabank
Then I see "Анализируем..." индикатор (< 3 сек)
  And I am redirected to the dashboard with parsed transactions

Given I upload an unsupported file format
When the system cannot parse the file
Then I see a clear error "Не смогли прочитать файл. Попробуй CSV из Т-Банка"
  And a download instruction for the correct format

Given I upload a CSV with transactions
Then transactions older than 1 year are marked as "архив" and excluded from analysis
```

#### US-002: Паразит-сканер
```gherkin
As Алина (22, студентка),
I want to see a list of forgotten subscriptions,
So that I can save money immediately by cancelling them.

Acceptance Criteria:
Given I have uploaded my transactions (or connected a bank)
When I click "Найти паразитов"
Then within 5 seconds I see a list of detected recurring charges
  And each entry shows: название, сумма/мес, дата последнего списания
  And the total "уходит в паразитов" is prominently displayed
  And I can mark each as "оставить" or "отписаться"

Given no recurring charges are found
When scan completes
Then I see "Молодец! Лишних подписок нет" with a checkmark emoji
```

### Epic 2: Честный Ростер (Core AHA)

#### US-003: Первый ростер
```gherkin
As Максим,
I want to receive an AI roast of my spending,
So that I understand my patterns in a fun, memorable way.

Acceptance Criteria:
Given I have uploaded my transactions
When I click "Поджарь мои расходы"
Then within 5 seconds I see the roast starting to stream in the chat UI
  And the roast is personalized (mentions actual categories and amounts)
  And the tone is humorous but not mean-spirited
  And the roast ends with 2-3 actionable tips
  And I see a "Поделиться" button after the roast completes

Given I have less than 5 transactions
When I request a roast
Then I see "Маловато данных для полноценного ростера — добавь больше трат!"
```

#### US-004: Топ-5 категорий трат
```gherkin
As Максим,
I want to see my top 5 spending categories as a chart,
So that I understand where most money goes.

Acceptance Criteria:
Given I have uploaded transactions
When I view the dashboard
Then I see a pie chart with top 5 categories
  And each category shows: название, сумма₽, процент от общих трат
  And clicking a category shows individual transactions in it
  And chart is colored with distinct, readable colors
```

#### US-005: AI Chat — вопросы о тратах
```gherkin
As Максим,
I want to ask AI questions about my spending,
So that I get personalized advice beyond the roast.

Acceptance Criteria:
Given I am in the chat interface
When I type "Почему у меня кончаются деньги?"
Then AI responds within 3 seconds (streaming)
  And the answer references my actual spending data
  And Free users get 3 AI responses per month
  And Plus users get unlimited responses

Given a free user has used their 3 monthly AI responses
When they try to send another message
Then they see "Ты исчерпал 3 бесплатных вопроса. Апгрейдись до Клёво Plus"
  And a one-click upgrade CTA
```

### Epic 3: Шеринг (Viral Referral)

#### US-006: Генерация шеринг-карточки
```gherkin
As Максим,
I want to share my roast as an image,
So that my friends can laugh and discover the app.

Acceptance Criteria:
Given I have received a roast
When I click "Поделиться"
Then I see a preview of a sharable image (branded Клёво card)
  And the image contains: funny quote from roast + my spending stat + app CTA
  And personal data (name, exact amounts) are NOT shown by default
  And I can choose to download the image or copy a shareable link
  And the link opens a public page showing the roast card + app download CTA
```

### Epic 4: Монетизация (Revenue)

#### US-007: Upgrade to Plus
```gherkin
As Максим,
I want to upgrade to Клёво Plus,
So that I can get unlimited roasts and automate savings.

Acceptance Criteria:
Given I am on the free plan
When I see the paywall (after first roast or when limits hit)
Then I see the Plus plan features clearly listed
  And the price is shown as 299₽/мес
  And I can complete payment via bank card (Robokassa/ЮКасса)
  And after payment I immediately access Plus features
  And I receive a confirmation in email/Telegram
```

---

## 2. Feature Matrix

| Feature | MVP | v1 | v2 | Plan |
|---------|:---:|:--:|:--:|------|
| CSV Upload | ✅ | ✅ | ✅ | Free |
| Паразит-сканер | ✅ | ✅ | ✅ | Free (1x/мес) |
| Топ-5 категорий | ✅ | ✅ | ✅ | Free |
| AI Ростер | ✅ | ✅ | ✅ | Free (1x/мес), Plus (unlimited) |
| AI Чат | ✅ | ✅ | ✅ | Free (3/мес), Plus (unlimited) |
| Шеринг карточки | ✅ | ✅ | ✅ | Free |
| Банковская интеграция | ❌ | ✅ | ✅ | Plus |
| Автосбережения | ❌ | ✅ | ✅ | Plus |
| Финансовые цели | ❌ | ✅ | ✅ | Plus |
| История 12 мес. | ❌ | ✅ | ✅ | Plus |
| Streak/геймификация | ❌ | ✅ | ✅ | Free |
| Cash flow прогноз | ❌ | ❌ | ✅ | Pro |
| Инвест. советы | ❌ | ❌ | ✅ | Pro |
| Telegram Mini App | ❌ | ❌ | ✅ | Free |

---

## 3. Non-Functional Requirements (детально)

### 3.1 Performance Requirements

| Scenario | Target | Critical |
|----------|--------|:--------:|
| CSV parsing (< 500 строк) | < 3s | ✅ |
| First roast token появляется | < 2s | ✅ |
| Full roast completion | < 15s | ✅ |
| Dashboard load | < 1.5s LCP | ✅ |
| AI chat first token | < 1.5s | ✅ |
| Share card generation | < 3s | ❌ |
| API rate limit | 10 AI req/min (free) | ✅ |

### 3.2 Security Requirements

| Requirement | Implementation |
|-------------|---------------|
| Данные в РФ | VPS HOSTKEY (Москва) |
| Encryption at rest | Supabase + disk encryption |
| Encryption in transit | TLS 1.3 |
| Auth | Supabase JWT + httpOnly cookies |
| Rate limiting | Redis + Nginx |
| Input validation | Zod (TS) + Pydantic (Python) |
| CSV sandboxing | Обработка только в памяти, не на диске |
| API keys | Server-side only, env vars |
| SQL injection prevention | Supabase ORM parameterized queries |
| XSS prevention | Next.js встроенная защита + CSP headers |

### 3.3 Accessibility
- WCAG 2.1 Level AA
- Keyboard navigation для основных flows
- Чёрный режим (dark mode) — молодёжная аудитория

---

## 4. API Contracts (краткие)

### POST /api/analyze
```typescript
// Request
{
  file: File,  // CSV
  user_id: string
}
// Response
{
  transactions: Transaction[],
  categories: CategorySummary[],
  parasites: Subscription[],
  period: { start: string, end: string },
  total_spent: number
}
```

### POST /api/roast (streaming)
```typescript
// Request
{
  user_id: string,
  period: 'last_month' | 'last_3_months' | 'all'
}
// Response: text/event-stream
// data: {"token": "Значит,"}
// data: {"token": " ты"}
// data: {"done": true, "roast_id": "uuid"}
```

### POST /api/parasites
```typescript
// Request
{
  transactions: Transaction[]
}
// Response
{
  parasites: Array<{
    name: string,
    amount_per_month: number,
    last_charge_date: string,
    confidence: number  // 0-1
  }>,
  total_monthly_waste: number
}
```

---

## 5. Error Handling Strategy

| Тип ошибки | User Message | Action |
|-----------|-------------|--------|
| CSV parse failure | "Не смогли прочитать файл. Скачай формат из Т-Банка: [ссылка]" | Показать инструкцию |
| LLM timeout (>15s) | "AI задумался… Попробуем ещё раз?" | Автоматический retry |
| LLM primary failure | Fallback на YandexGPT (без уведомления пользователя) | Silent failover |
| Payment failure | "Платёж не прошёл. Попробуй другую карту" | Retry + support link |
| Auth expired | Redirect to /login с "session_expired" toast | Refresh token |
| Rate limit | "Подожди минуту — AI отдыхает :)" | 60s countdown timer |
