# Specification: AI Chat

## User Stories

### US-060: Open Chat
```
As a logged-in user with transactions,
I want to open a chat with the AI advisor,
So that I can ask questions about my spending.

Acceptance Criteria:
Given I am logged in and have uploaded transactions
When I navigate to /chat
Then I see a welcome message and 3 quick reply buttons
And the chat input is focused

Given I am NOT logged in
When I navigate to /chat
Then I am redirected to the login page
```

### US-061: Send Message (Streaming)
```
As a logged-in user,
I want to send a text message to the AI,
So that I can get a personalized financial answer.

Acceptance Criteria:
Given I am on /chat with transactions loaded
When I type a message and press Enter or Send
Then the AI starts responding within 2.5 seconds (first token)
And the response streams token-by-token
And I can see the typing indicator while waiting

Given the AI response is complete
Then it appears as a full message in the chat
And the input is re-enabled for the next message
```

### US-062: Free Plan Limit
```
As a free plan user,
I want to understand my daily message limit,
So that I can plan when to upgrade.

Acceptance Criteria:
Given I am on free plan and have sent 10 messages today
When I try to send the 11th message
Then I see "Лимит 10 сообщений/день. Upgrade до Plus для безлимита"
And a button "Получить Plus" is shown

Given I am on Plus plan
Then no daily limit is applied
```

### US-063: Financial Context Awareness
```
As a user,
I want the AI to know my spending data,
So that answers are relevant to MY finances (not generic).

Acceptance Criteria:
Given my top category is "Еда и рестораны" (42% of spend)
When I ask "на что я больше всего трачу?"
Then the AI mentions food specifically (not generic advice)

Given I have 3 active subscriptions
When I ask "есть ли у меня лишние подписки?"
Then the AI lists my actual subscriptions from the parasite scanner
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
Given I asked "почему так много на еде?"
And the AI answered
When I follow up with "как сократить эти расходы?"
Then the AI references the food topic from previous message

Given I close and reopen the tab (new session)
Then the chat history is cleared (session-scoped)
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
