# Testing Rules: Клёво

Source: `docs/Refinement.md` testing strategy, `docs/test-scenarios.md` Gherkin scenarios

## Test Structure

```
apps/web/
├── __tests__/                    — unit + integration tests (Vitest)
│   ├── api/                      — API route tests
│   └── components/               — React component tests
└── e2e/                          — Playwright E2E tests

apps/ai-service/
└── tests/                        — pytest unit + integration tests
    ├── test_csv_parser.py
    ├── test_categorizer.py
    ├── test_parasite_detector.py
    ├── test_roast_generator.py
    └── test_rate_limiter.py
```

## Test Frameworks

| Layer | Framework | Command |
|-------|-----------|---------|
| TypeScript unit | Vitest | `pnpm test` |
| TypeScript E2E | Playwright | `pnpm test:e2e` |
| Python unit | pytest | `pytest apps/ai-service/tests/` |
| Coverage | Vitest + pytest-cov | `pnpm test:coverage` |

## Coverage Requirements

| Component | Minimum | Why |
|-----------|---------|-----|
| Core algorithms (csv_parser, categorizer, parasite_detector, roast_generator) | 80% | Core business logic |
| API routes (all Next.js routes) | Happy path + main errors | User-facing |
| Security scenarios (all 3 from test-scenarios.md) | 100% | Financial data |
| Rate limiting logic | 100% | Cost control |

## Test Naming Convention

```typescript
// TypeScript: describe/it
describe('POST /api/upload', () => {
  it('returns 200 with transactions for valid T-Bank CSV', ...)
  it('returns 400 with friendly error for unsupported format', ...)
  it('returns 413 when file exceeds 10 MB', ...)
})
```

```python
# Python: test_feature_scenario
def test_csv_parser_handles_cp1251_encoding():
    ...
def test_parasite_detector_finds_recurring_subscriptions():
    ...
def test_rate_limiter_blocks_11th_request_per_minute():
    ...
```

## Mandatory Test Cases (from `docs/test-scenarios.md`)

These scenarios MUST have corresponding tests:

### CSV Upload
- ✅ Happy path: valid T-Bank CSV → transactions stored, categories shown
- ✅ Unsupported format (.docx) → 400 with "Не смогли прочитать файл"
- ✅ CSV with only incoming transfers → "no expenses" message, no storage
- ✅ 2000-row CSV → only first 1000 processed, banner shown

### AI Roast Mode
- ✅ Happy path: 50 transactions → streaming roast with tips
- ✅ <10 transactions → "insufficient data", no AI call
- ✅ Rate limit reached (free plan) → upgrade CTA shown, no AI call
- ✅ Claude timeout → automatic YandexGPT fallback, no error to user
- ✅ AI responds in English → language detection → retry in Russian

### Security
- ✅ Raw CSV not stored after parsing (GET /api/files → 404)
- ✅ Cross-user access returns 403 (RLS)
- ✅ 15+ AI requests/minute from one user → 429 with Retry-After header

## Test Data (Fixtures)

```
tests/fixtures/
├── tbank_march2025.csv        — valid T-Bank CSV (UTF-8), 50 transactions
├── tbank_cp1251.csv           — T-Bank CSV in cp1251 encoding
├── tbank_incoming_only.csv    — CSV with only incoming transfers
├── large_2000_rows.csv        — 2000 transaction CSV
├── report.docx                — unsupported file type
└── transactions_50.json       — 50 pre-parsed Transaction objects
```

## What NOT to Test

- External API responses (Claude, YandexGPT) — mock these
- Supabase cloud internals — mock the client
- Infrastructure (Docker, Nginx) — not unit tests
- UI pixel-perfect rendering — not worth the maintenance cost

## Rules

1. **Test behavior, not implementation** — test what code does, not how
2. **Mock external APIs** — never call real Claude/YandexGPT in unit tests
3. **Don't test what Supabase guarantees** — trust RLS works, test that you enable it
4. **Fixtures over magic** — use explicit fixture files, not inline data generation
5. **Security scenarios are not optional** — 100% coverage required for all 3
6. **Always test the AI fallback** — Claude → YandexGPT path must be explicitly tested
