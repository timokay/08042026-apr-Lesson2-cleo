# Project: Клёво

## Overview

**Клёво** — AI-финансовый ассистент с характером для российской молодёжи 18-30 лет. Российская адаптация Cleo AI ($280M ARR, 7M пользователей в США). Использует юмористический "ростер расходов" как viral hook и паразит-детектор как onboarding механику.

**Название:** "Клёво" = "Cleo" + молодёжный сленг "клёво = круто". Двойной смысл.

**Репозиторий:** Monorepo (Distributed Monolith) — `apps/` + `packages/`

## Problem & Solution

**Problem:** Российская молодёжь не управляет финансами — не из-за незнания, а из-за того, что существующие инструменты скучные и требуют дисциплины.

**Solution:** Финансовый советник с характером — юмор + немедленная ценность (паразит-детектор + ростер) + вирусная механика (шеринг ростера) = продукт, которым хочется пользоваться.

**Дифференциация:** Единственный "personality-driven" AI финансовый советник в РФ. Western fintech ушёл. Банковские AI (Т-Банк, Сбер) корпоративные и скучные.

## Architecture

```
Distributed Monolith (Monorepo)
├── apps/
│   ├── web/          — Next.js 15 (frontend + BFF)
│   └── ai-service/   — Python FastAPI (AI orchestration)
├── packages/
│   ├── db/           — Supabase schema, RLS policies, migrations
│   ├── ui/           — Shared React components (Tailwind + Recharts)
│   └── types/        — TypeScript types shared across apps
└── services/
    ├── nginx/        — Reverse proxy config
    └── redis/        — Rate limiting, session cache

Infrastructure: Docker Compose → VPS HOSTKEY (Москва, ФЗ-152)
Deploy: docker compose up -d (direct via GitHub Actions SSH)
```

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js 15 (App Router) | SSR + RSC + streaming |
| BFF | Next.js API Routes | Auth, session management |
| AI Service | Python FastAPI | Async, SSE streaming |
| Primary AI | Claude 3.5 Sonnet | Via API proxy (proxyapi.ru) |
| Fallback AI | YandexGPT 3 | Direct access from RU VPS |
| Database | Supabase PostgreSQL | Self-hosted, RLS policies |
| Auth | Supabase Auth | JWT httpOnly cookies |
| Cache | Redis | Rate limiting, session |
| Charts | Recharts | Pie chart, bar chart |
| Styling | Tailwind CSS v4 | |
| Reverse Proxy | Nginx | SSL termination |
| CI/CD | GitHub Actions | SSH deploy |

## Key Algorithms

From `docs/Pseudocode.md`:

```typescript
// Algorithm 1: CSV Parser
parseCSV(file: File): Promise<Transaction[]>
  // Encoding detection (UTF-8/cp1251), bank format detection, deduplication
  // Supports: Т-Банк, Сбер, Альфа-Банк CSV formats

// Algorithm 2: Transaction Categorizer
categorize(transactions: Transaction[]): CategorySummary[]
  // Rule-based patterns (regex) → AI batching (20 txns per call)
  // Categories: Еда, Транспорт, Развлечения, Подписки, Здоровье, Прочее

// Algorithm 3: Parasite Detector
findParasites(transactions: Transaction[]): Subscription[]
  // Recurring pattern detection: std deviation < 5 days, 2+ occurrences
  // Known subscription seed list + pattern matching

// Algorithm 4: Roast Generator (streaming)
generateRoast(context: RoastContext): AsyncGenerator<string>
  // System prompt: "дружелюбная честность" tone
  // Streaming via SSE: POST /api/roast → Server-Sent Events
  // Fallback: Claude → YandexGPT on timeout/error
```

## Security Rules

From `docs/Specification.md` NFRs — see `.claude/rules/security.md` for full rules:

- **Never store raw CSV** — parse in memory, persist only extracted transactions
- **Row Level Security (RLS)** on ALL Supabase tables — user_id isolation mandatory
- **JWT httpOnly cookies** — no localStorage for auth tokens
- **API keys in env vars only** — never in code or git
- **Rate limiting** — 10 AI requests/minute/user via Redis (free plan: 1 roast/month)
- **Input validation** — Zod schemas on all API routes
- **ФЗ-152 compliance** — all data stays on VPS in Russia (HOSTKEY Москва)
- **CSV deletion** — raw file removed from memory after parsing completes

## Parallel Execution Strategy

Use `Task` tool for parallel work on independent modules:
- `apps/web` + `apps/ai-service` — fully independent, always parallel
- `packages/db` — must complete before apps that need schema
- `packages/ui` + `packages/types` — independent, parallel

Swarm agents for validation and review (see Feature Lifecycle below).

## Swarm Agents

Available agents in `.claude/agents/`:
- `@planner` — implementation planning from Pseudocode.md algorithms
- `@code-reviewer` — review against Refinement.md edge cases + security checks
- `@architect` — architectural consistency with Architecture.md + ADRs

## Git Workflow

See `.claude/rules/git-workflow.md`. Semantic commits:
```
feat(web): add CSV upload component
fix(ai-service): handle Claude API timeout → YandexGPT fallback
docs(feature): SPARC planning for parasite-scanner
chore: update docker-compose healthchecks
```

Scopes: `web`, `ai-service`, `db`, `ui`, `types`, `nginx`, `infra`

## Available Agents

| Agent | File | When to Use |
|-------|------|-------------|
| planner | `.claude/agents/planner.md` | Break down features into implementation tasks |
| code-reviewer | `.claude/agents/code-reviewer.md` | Review PRs, security checks, edge case coverage |
| architect | `.claude/agents/architect.md` | ADR decisions, architecture consistency, system design |

## Available Skills

| Skill | Path | Purpose |
|-------|------|---------|
| sparc-prd-mini | `.claude/skills/sparc-prd-mini/` | Full SPARC documentation for new features |
| explore | `.claude/skills/explore/` | Socratic questioning → product brief |
| goap-research-ed25519 | `.claude/skills/goap-research-ed25519/` | GOAP A* research with anti-hallucination |
| problem-solver-enhanced | `.claude/skills/problem-solver-enhanced/` | 9-module TRIZ problem solving |
| requirements-validator | `.claude/skills/requirements-validator/` | INVEST + SMART validation |
| brutal-honesty-review | `.claude/skills/brutal-honesty-review/` | Unbiased code + architecture review |
| project-context | `.claude/skills/project-context/` | Full project context loading |
| coding-standards | `.claude/skills/coding-standards/` | Tech stack conventions |
| testing-patterns | `.claude/skills/testing-patterns/` | BDD patterns from test-scenarios.md |
| feature-navigator | `.claude/skills/feature-navigator/` | Sprint progress + next actions |
| security-patterns | `.claude/skills/security-patterns/` | API key management, encryption patterns |

## Quick Commands

| Command | Purpose |
|---------|---------|
| `/start` | Bootstrap entire project from docs → working monorepo |
| `/feature [name]` | Full 4-phase feature lifecycle (plan → validate → implement → review) |
| `/plan [task]` | Lightweight implementation plan saved to `docs/plans/` |
| `/myinsights [title]` | Capture development insight to knowledge base |
| `/next` | Show sprint progress + top 3 next actions |
| `/go [feature]` | Auto-select and execute correct pipeline for a feature |
| `/run` | Implement full MVP autonomously |
| `/run all` | Implement entire project autonomously |
| `/test [scope]` | Run tests with Gherkin scenario coverage |
| `/deploy` | Deploy to VPS with pre-flight checks |
| `/docs` | Generate bilingual (RU/EN) documentation |

## 🔍 Development Insights (живая база знаний)

Index: [myinsights/1nsights.md](myinsights/1nsights.md) — check here FIRST before debugging.
⚠️ On error → grep the error string in the index → read only the matched detail file.
Capture new findings: `/myinsights [title]`

## 🔄 Feature Development Lifecycle

New features use the 4-phase lifecycle: `/feature [name]`
1. **PLAN** — sparc-prd-mini (with Gate + external skills) → `docs/features/<n>/sparc/`
2. **VALIDATE** — requirements-validator swarm → score ≥70
3. **IMPLEMENT** — parallel agents from validated docs
4. **REVIEW** — brutal-honesty-review swarm → fix all criticals

Available lifecycle skills in `.claude/skills/`:
- `sparc-prd-mini` (orchestrator, delegates to explore, goap-research-ed25519, problem-solver-enhanced)
- `explore` (Socratic questioning → Product Brief)
- `goap-research-ed25519` (GOAP A* + OODA → Research Findings)
- `problem-solver-enhanced` (9 modules + TRIZ → Solution Strategy)
- `requirements-validator`
- `brutal-honesty-review`

## Feature Roadmap

Feature backlog tracked in `.claude/feature-roadmap.json`. Use `/next` to see sprint progress.

```
/next          → show sprint progress + top 3 next actions
/next [id]     → mark feature done, cascade unblock dependencies
/next update   → scan codebase, suggest status updates
```

## Implementation Plans

Plans saved to `docs/plans/` via `/plan` command. Auto-committed on session end (Stop hook).

## Automation Commands

```
/go [feature]  → auto-select pipeline (simple→/plan, standard→/feature) + execute
/run           → implement MVP features (/start → /next → /go loop)
/run all       → implement ALL features until done
/docs          → generate bilingual docs (7 files per language)
/docs rus      → Russian only
/docs update   → update existing docs
```

Command hierarchy: `/run` → `/start` → `/next` → `/go` → `/plan` | `/feature`

## Resources

- Full documentation: `docs/`
- Architecture: `docs/Architecture.md`
- API contracts: `docs/Specification.md`
- Deployment: `docs/Completion.md`
- ADRs: `docs/ADR-*.md`
- BDD scenarios: `docs/test-scenarios.md`
- Validation report: `docs/validation-report.md`
- Executive summary: `docs/Final_Summary.md`
