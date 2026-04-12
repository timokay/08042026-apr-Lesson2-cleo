# Specification: AI Chat

## User Stories

### US-060: Open Chat
```
As a logged-in user,
I want to open a chat with the AI advisor,
So that I can start asking questions about my spending.

Acceptance Criteria:
Given I am logged in and have uploaded transactions
When I navigate to /chat
Then I see a welcome message
And 3 quick reply suggestion buttons are visible
And the chat input is focused

Given I am logged in but have NOT uploaded any transactions
When I navigate to /chat
Then I see "Сначала загрузи выписку" message
And a button linking to the CSV upload page

Given I am NOT logged in
When I navigate to /chat
Then I am redirected to /auth/login
```

### US-061: Send Message (Streaming)
```
As a logged-in user,
I want to send a text message to the AI,
So that I can get a personalized financial answer.

Acceptance Criteria:
Given I am on /chat with transactions loaded
When I type a message and press Enter or Send
Then the typing indicator appears immediately (< 200ms)
And the first response token arrives within 2.5 seconds (p95)
And response text accumulates visibly until done event

Given the AI response is complete (done event received)
Then the full message appears in chat history
And the input field is re-enabled

Given POST /api/chat returns 503
Then I see "AI сейчас недоступен, попробуй позже"
And a "Попробовать снова" button appears
```

### US-062: Free Plan Limit
```
As a free plan user,
I want to understand my daily message limit,
So that I can plan when to upgrade.

Acceptance Criteria:
Given I am on free plan and have sent 10 messages today
When I try to send the 11th message
Then POST /api/chat returns 429 with code "DAILY_LIMIT"
And I see "Лимит {FREE_DAILY_LIMIT} сообщений/день. Upgrade до Plus для безлимита"
And a button "Получить Plus" linking to /upgrade is shown
And the message is NOT sent to AI (no backend AI call made)

Given I am on free plan and it is 00:00 UTC (new calendar day)
When I send a message
Then POST /api/chat returns 200 (counter has reset)

Given I am on Plus plan
When I send 50 messages in one day
Then all messages receive AI responses (no 429 errors)
```

### US-063: Financial Context Awareness
```
Depends on: parasite-scanner feature (parasites available via /analyze endpoint)

As a user,
I want the AI to know my spending data,
So that answers are relevant to MY finances (not generic).

Acceptance Criteria:
Given my top category is "Еда и рестораны" (42% of spend)
When I send any message
Then the POST /chat request body contains:
  context.top_categories[0].name = "Еда и рестораны"
  context.top_categories[0].percent = 42

Given I have 3 active subscriptions detected by parasite scanner
When I send any message
Then the POST /chat request body contains:
  context.parasites.length >= 1
  context.parasites[0].name = <name of subscription>
  context.parasites[0].amount_per_month > 0

Note: testing verifies context is correctly transmitted to AI Service,
not the semantic content of the AI's response (evaluated via manual QA).
```

### US-064: Quick Reply Buttons
```
As a user opening the chat for the first time,
I want to see suggested questions,
So that I don't have to think what to ask.

Acceptance Criteria:
Given I open /chat
Then I see 3 quick reply buttons:
  "🔥 Поджарь мои расходы"
  "💸 На что трачу больше всего?"
  "🐛 Какие подписки лишние?"
When I click one
Then it sends the corresponding message
```

### US-065: Chat History in Session
```
As a user in an active chat session,
I want the AI to remember what we discussed,
So that I don't repeat myself.

Acceptance Criteria:
Given I sent message "почему так много на еде?"
And the AI responded
When I send a second message "как сократить эти расходы?"
Then the POST /chat request body contains history array with:
  history[0].role = "user"
  history[0].content = "почему так много на еде?"
  history[1].role = "assistant"
  history[1].content = <previous AI response>

Given I have sent 25 messages in a session (> 10 pairs)
When I send the 26th message
Then the POST /chat request body contains history.length <= 20
  (oldest messages are dropped, only last 10 pairs retained)

Given I close the browser tab (new session_id on reopen)
When I send a message in the new session
Then the POST /chat request body contains history = []

Given a session has been inactive for > 1 hour
When I send a new message in the same session
Then the POST /chat request body contains history = []
  (Redis TTL has expired)
```

## API Contract

### POST /api/chat (Next.js BFF)
```
Auth: Required (JWT cookie)

Request:
{
  message: string        // max 1000 chars
  session_id: string     // UUID, generated client-side per tab
}

Response: SSE stream
event: token
data: {"text": "..."}

event: done
data: {"message_id": "uuid"}

Response (errors):
429: { error: { code: "DAILY_LIMIT", message: "...", upgrade_url: "/upgrade" } }
401: { error: { code: "UNAUTHORIZED" } }
400: { error: { code: "VALIDATION_ERROR" } }
422: { error: { code: "NO_TRANSACTIONS", message: "Сначала загрузи выписку" } }
```

### POST /chat (AI Service internal)
```
Request:
{
  user_id: string
  session_id: string
  message: string
  history: [{ role: "user"|"assistant", content: string }]  // last 10 pairs
  context: {
    total_spent: number
    top_categories: [{ name, percent, total }]   // top 5
    parasites: [{ name, amount_per_month }]      // top 3
    period: "last_month"
  }
  plan: "free" | "plus"
}

Response: SSE stream (same format as /roast)
```

## Data Model

### chat_messages (DB — Plus plan persistence)
```sql
CREATE TABLE chat_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id    TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content       TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| UNAUTHORIZED | 401 | Не авторизован |
| DAILY_LIMIT | 429 | 10 сообщений/день (free) |
| RATE_LIMIT | 429 | 20 req/min |
| NO_TRANSACTIONS | 422 | Нет транзакций для контекста |
| VALIDATION_ERROR | 400 | message пустой или > 1000 символов |
| INTERNAL_ERROR | 503 | AI сервис недоступен |

## NFRs

- First token: < 2.5s (p95)
- Daily limit reset: в 00:00 UTC
- Session history: last 10 message pairs (20 items total)
- Max message length: 1000 символов
- Redis session TTL: 1 час
- chat_messages retention: 90 дней (GDPR-аналог для ФЗ-152)
