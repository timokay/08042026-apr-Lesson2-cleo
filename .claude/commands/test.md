---
description: Run tests for Клёво with Gherkin scenario coverage.
  Supports feature-specific testing from docs/test-scenarios.md BDD scenarios.
  $ARGUMENTS: optional — feature name, "all", or "coverage"
---

# /test $ARGUMENTS

## Available Gherkin Features (from `docs/test-scenarios.md`)

| Feature | Scenarios | Command |
|---------|-----------|---------|
| CSV Upload | 4 | `/test csv-upload` |
| AI Roast Mode | 5 | `/test roast` |
| Parasite Scanner | 3 | `/test parasites` |
| Share Roast Card | 3 | `/test share` |
| Upgrade to Plus | 4 | `/test upgrade` |
| Security | 3 | `/test security` |

## Process

### /test (default — run all)

```bash
# TypeScript / Next.js (apps/web, packages/*)
pnpm test

# Python / FastAPI (apps/ai-service)
cd apps/ai-service && python -m pytest tests/ -v

# Or with coverage
pnpm test:coverage
cd apps/ai-service && python -m pytest tests/ --cov=. --cov-report=term-missing
```

Show summary:
```
📊 Test Results:
   TypeScript: [N] passed, [M] failed, [K] skipped
   Python:     [N] passed, [M] failed, [K] skipped
   Coverage:   web: XX%, ai-service: XX%
```

### /test [feature]

1. Read the relevant scenarios from `docs/test-scenarios.md`
2. Map scenarios to test files
3. Run only matching tests:

```bash
# Example: /test roast
pnpm test --filter="roast"
pytest tests/test_roast_generator.py -v
```

### /test generate [feature]

Generate test stubs from Gherkin scenarios in `docs/test-scenarios.md`:

1. Read the feature's scenarios from the file
2. Use `.claude/skills/testing-patterns/SKILL.md` for step mappings
3. Generate test file with `describe/it` structure matching each scenario
4. Save to appropriate test directory:
   - Next.js tests → `apps/web/__tests__/[feature].test.ts`
   - Python tests → `apps/ai-service/tests/test_[feature].py`

### /test coverage

Run full test suite with coverage report:

```bash
pnpm test:coverage
cd apps/ai-service && pytest --cov=. --cov-report=html --cov-report=term

echo "Coverage Targets:"
echo "  Unit tests (services): ≥ 80% line coverage"
echo "  Security scenarios: 100% required"
```

## Coverage Requirements

From `docs/Refinement.md`:

| Layer | Minimum Coverage |
|-------|----------------|
| Core algorithms (CSV, categorizer, parasites, roast) | ≥ 80% |
| API routes (Next.js) | All happy paths + main error paths |
| Security scenarios | 100% — all 3 scenarios must pass |
| E2E (all 6 features) | At least 1 E2E per feature |

## Test File Locations

```
apps/web/
├── __tests__/           — unit + integration tests
│   ├── api/             — API route tests
│   └── components/      — component tests
└── e2e/                 — end-to-end tests

apps/ai-service/
└── tests/
    ├── test_csv_parser.py
    ├── test_categorizer.py
    ├── test_parasite_detector.py
    ├── test_roast_generator.py
    └── test_rate_limiter.py
```
