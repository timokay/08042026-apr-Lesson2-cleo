---
name: testing-patterns
description: >
  BDD testing patterns for Клёво extracted from docs/test-scenarios.md Gherkin scenarios.
  Use when writing tests, generating test stubs, or verifying test coverage.
  Trigger: "write tests", "test this", "BDD", "Gherkin", "test coverage", "тесты".
version: "1.0"
maturity: production
---

# Testing Patterns: Клёво

Source: `docs/test-scenarios.md` (18 BDD scenarios), `docs/Refinement.md`

## Available Gherkin Features

| Feature | Scenarios | Key Focus |
|---------|-----------|-----------|
| CSV Upload | 4 | Happy path, unsupported format, no expenses, large file |
| AI Roast Mode | 5 | Happy path, insufficient data, rate limit, AI fallback, language check |
| Parasite Scanner | 3 | Happy path, nothing found, mark-as-keep |
| Share Roast Card | 3 | Generate/share, public access, expired link |
| Upgrade to Plus | 4 | Payment success, payment failure, expiry, unlimited roasts |
| Security | 3 | CSV not stored, cross-user 403, rate limiting |

## Step Mappings (Given/When/Then → Code)

### Given Steps
```typescript
// "Given the user is logged in as [name] with a [plan] plan"
async function givenLoggedInUser(name: string, plan: 'free' | 'plus') {
  // Create test user in Supabase with specific plan
  const { data: { user } } = await supabase.auth.signInWithPassword({
    email: `test-${name.toLowerCase()}@klevo.test`,
    password: 'test-password-123'
  })
  await supabase.from('profiles').upsert({ id: user!.id, plan })
  return user
}

// "Given [user] has [N] transactions loaded"
async function givenUserHasTransactions(userId: string, count: number) {
  const transactions = generateFakeTransactions(count)
  await supabase.from('transactions').insert(
    transactions.map(t => ({ ...t, user_id: userId }))
  )
}

// "Given Claude API is unavailable (mocked)"
function givenClaudeApiUnavailable() {
  vi.mock('../services/claude-client', () => ({
    streamRoast: vi.fn().mockRejectedValue(new Error('timeout'))
  }))
}
```

### When Steps
```typescript
// "When he uploads [filename]"
async function whenUserUploadsFile(filename: string, content: Buffer) {
  return fetch('/api/upload', {
    method: 'POST',
    body: createFormData({ file: new File([content], filename) }),
    headers: { cookie: `session=${testSessionCookie}` }
  })
}

// "When he clicks [button]"
async function whenUserClicksButton(buttonText: string) {
  const button = screen.getByRole('button', { name: buttonText })
  await userEvent.click(button)
}

// "When she makes a GET /api/transactions request with user_id [other]"
async function whenCrossUserRequest(attackerSession: string, victimUserId: string) {
  return fetch(`/api/transactions?user_id=${victimUserId}`, {
    headers: { cookie: `session=${attackerSession}` }
  })
}
```

### Then Steps
```typescript
// "Then he sees [text]"
function thenUserSeesText(text: string) {
  expect(screen.getByText(text)).toBeInTheDocument()
}

// "Then the dashboard shows top-5 spending categories"
function thenShowsTopCategories() {
  expect(screen.getAllByTestId('category-item')).toHaveLength(5)
}

// "Then the system automatically switches to YandexGPT"
async function thenYandexGPTWasUsed() {
  expect(yandexGptMock).toHaveBeenCalled()
  expect(claudeMock).toHaveBeenCalled()  // tried first
}

// "Then he receives 403 Forbidden"
function thenResponseIs403(response: Response) {
  expect(response.status).toBe(403)
}
```

## Test File Naming

```
Unit tests:        *.test.ts (co-located with source)
Integration tests: *.integration.test.ts
E2E tests:         *.e2e.test.ts in e2e/ directory
Python tests:      test_*.py in tests/ directory
```

## Test Templates

### API Route Test (Next.js)
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST } from '@/app/api/upload/route'
import { createMockRequest } from '../test-utils'

describe('POST /api/upload', () => {
  it('happy path: valid T-Bank CSV returns transactions', async () => {
    const csv = loadFixture('tbank_march2025.csv')
    const req = createMockRequest({ method: 'POST', body: { file: csv } })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.transactions).toHaveLength(expect.any(Number))
  })

  it('unsupported format returns 400 with friendly error', async () => {
    const req = createMockRequest({ body: { file: loadFixture('report.docx') } })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Не смогли прочитать файл')
  })
})
```

### Python Service Test (FastAPI)
```python
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from apps.ai_service.main import app

client = TestClient(app)

def test_roast_falls_back_to_yandex_on_claude_timeout():
    """Scenario: AI API timeout/failure with fallback"""
    with patch('services.roast_generator.claude_client.stream') as mock_claude, \
         patch('services.roast_generator.yandex_client.stream') as mock_yandex:
        mock_claude.side_effect = TimeoutError()
        mock_yandex.return_value = AsyncMock(return_value=iter(["Хорошо, "]))
        
        response = client.post("/roast", json={
            "user_id": "test-user",
            "transactions": generate_fake_transactions(50)
        })
        
        assert response.status_code == 200
        assert mock_yandex.called
```

## Coverage Targets (from `docs/Refinement.md`)

| Layer | Target |
|-------|--------|
| Unit (services, algorithms) | ≥ 80% line coverage |
| Integration (API routes) | All happy paths + main error paths |
| E2E | All 6 Gherkin features |
| Security scenarios | 100% (all 3 security scenarios) |

## Key Fixtures Needed

```
tests/fixtures/
├── tbank_march2025.csv        — valid T-Bank CSV (UTF-8), 50 transactions
├── tbank_cp1251.csv           — T-Bank CSV in cp1251 encoding
├── report.docx                — unsupported file type
├── large_2000_rows.csv        — 2000 transaction CSV for limit testing
├── incoming_only.csv          — CSV with only incoming transfers
└── transactions_50.json       — 50 pre-parsed Transaction objects
```
