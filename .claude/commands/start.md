---
description: Bootstrap entire Клёво project from documentation. Generates monorepo skeleton, all packages, Docker configs, database schema, core modules, and basic tests. $ARGUMENTS: optional flags --skip-tests, --skip-seed, --dry-run.
---

# /start $ARGUMENTS

## Purpose

One-command project generation from documentation → working monorepo with `docker compose up`.

## Prerequisites

- Documentation in `docs/` directory (SPARC output — all 9 docs present)
- CC toolkit in project root (CLAUDE.md, .claude/)
- Node.js 20+ and pnpm 9+ installed
- Python 3.11+ installed
- Docker + Docker Compose installed
- Git initialized

## Process

### Phase 1: Foundation (sequential — everything depends on this)

1. **Read all project docs** to build full context:
   - `docs/Architecture.md` → monorepo structure, Docker Compose, tech stack
   - `docs/Specification.md` → data model, API endpoints, NFRs
   - `docs/Pseudocode.md` → core algorithms, business logic
   - `docs/Completion.md` → env config, deployment setup
   - `docs/PRD.md` → features, user personas (for README)
   - `docs/Refinement.md` → edge cases, testing strategy
   - `docs/ADR-003-tech-stack.md` → tech stack decisions
   - `docs/ADR-004-monetization-model.md` → pricing model

2. **Generate root configs:**
   - `package.json` — pnpm workspace root with `workspaces: ["apps/*", "packages/*"]`
   - `pnpm-workspace.yaml`
   - `docker-compose.yml` (from Architecture.md — 5 services: web, ai-service, postgres, redis, nginx)
   - `.env.example` (from Completion.md env vars)
   - `.gitignore`
   - `tsconfig.base.json` — shared TypeScript config
   - `turbo.json` — Turborepo pipeline config (build, dev, test, lint)

3. **Git commit:** `chore: project root configuration`

### Phase 2: Packages (parallel via Task tool ⚡)

Launch 5 parallel tasks:

#### Task A: packages/types ⚡

Read and use as source:
- `docs/Pseudocode.md` → TypeScript type definitions (Transaction, CategorySummary, Subscription, RoastContext, UserProfile, PlanTier)
- `docs/Specification.md` → API request/response types

Generate:
- `packages/types/src/index.ts` — all shared types
- `packages/types/src/api.types.ts` — API contract types
- `packages/types/package.json`, `tsconfig.json`

**Commits:** `feat(types): shared TypeScript types from Pseudocode.md`

#### Task B: packages/db ⚡

Read and use as source:
- `docs/Architecture.md` → PostgreSQL schema (profiles, transactions, roasts, savings_goals tables)
- `docs/Specification.md` → NFR security (RLS policies)
- `docs/Refinement.md` → security hardening section

Generate:
- `packages/db/schema/001_init.sql` — all tables with UUID PKs, timestamps, RLS
- `packages/db/schema/002_rls_policies.sql` — Row Level Security for ALL tables
- `packages/db/schema/003_indexes.sql` — performance indexes
- `packages/db/seed/seed.sql` — test data (3 fake users, 50 transactions each)
- `packages/db/package.json`

**Commits:** `feat(db): Supabase schema with RLS policies from Architecture.md`

#### Task C: packages/ui ⚡

Read and use as source:
- `docs/PRD.md` → feature list (CSV upload, roast card, category chart, subscription list)
- `docs/Specification.md` → UI requirements per user story

Generate:
- `packages/ui/src/components/RoastCard.tsx` — roast display with share button
- `packages/ui/src/components/CategoryPieChart.tsx` — Recharts pie chart
- `packages/ui/src/components/SubscriptionList.tsx` — parasite scanner results
- `packages/ui/src/components/CsvUploadZone.tsx` — drag-and-drop upload
- `packages/ui/src/components/UpgradeModal.tsx` — Plus upgrade CTA
- `packages/ui/src/index.ts` — barrel export
- `packages/ui/package.json`, `tsconfig.json`

**Commits:** `feat(ui): shared UI components (Recharts + Tailwind)`

#### Task D: apps/ai-service ⚡

Read and use as source:
- `docs/Pseudocode.md` → Algorithm 1 (CSV Parser), Algorithm 2 (Categorizer), Algorithm 3 (Parasite Detector), Algorithm 4 (Roast Generator)
- `docs/Architecture.md` → FastAPI service design, Redis rate limiting
- `docs/Refinement.md` → edge cases (encoding detection, large files, AI fallback)

Generate:
- `apps/ai-service/main.py` — FastAPI app with CORS, lifespan
- `apps/ai-service/routers/roast_router.py` — POST /roast (SSE streaming)
- `apps/ai-service/routers/analyze_router.py` — POST /analyze (CSV → transactions)
- `apps/ai-service/services/csv_parser.py` — Algorithm 1 (encoding detection, format detection)
- `apps/ai-service/services/categorizer.py` — Algorithm 2 (rule-based + AI batching)
- `apps/ai-service/services/parasite_detector.py` — Algorithm 3 (recurring pattern detection)
- `apps/ai-service/services/roast_generator.py` — Algorithm 4 (Claude SSE + YandexGPT fallback)
- `apps/ai-service/services/rate_limiter.py` — Redis sliding window (10 req/min, 1 roast/month)
- `apps/ai-service/models/schemas.py` — Pydantic request/response models
- `apps/ai-service/requirements.txt` — fastapi, uvicorn, httpx, redis, python-dotenv, pydantic
- `apps/ai-service/Dockerfile`
- `apps/ai-service/tests/test_csv_parser.py` — unit tests for encoding + format detection
- `apps/ai-service/tests/test_parasite_detector.py` — unit tests for recurring pattern detection

**Commits:**
- `feat(ai-service): FastAPI app with CSV parser and categorizer`
- `feat(ai-service): roast generator with Claude SSE + YandexGPT fallback`
- `feat(ai-service): parasite detector algorithm`
- `feat(ai-service): Redis rate limiting (10/min, 1 roast/month)`

#### Task E: apps/web ⚡

Read and use as source:
- `docs/Specification.md` → User Stories US-001–US-007, API contracts
- `docs/Pseudocode.md` → state machine (onboarding → dashboard → roast → share)
- `docs/Architecture.md` → Next.js App Router structure, Supabase Auth
- `docs/Refinement.md` → security (httpOnly cookies, Zod validation)

Generate:
- `apps/web/app/layout.tsx` — root layout with Supabase provider
- `apps/web/app/page.tsx` — landing / onboarding (CSV upload zone)
- `apps/web/app/dashboard/page.tsx` — category chart + parasite scanner + roast CTA
- `apps/web/app/roast/page.tsx` — roast display with streaming SSE
- `apps/web/app/share/[token]/page.tsx` — public share page (no login required)
- `apps/web/app/api/upload/route.ts` — POST: CSV → ai-service, store transactions
- `apps/web/app/api/roast/route.ts` — POST: SSE proxy to ai-service
- `apps/web/app/api/dashboard/route.ts` — GET: transactions + categories + parasites
- `apps/web/lib/supabase/client.ts` — browser client
- `apps/web/lib/supabase/server.ts` — server client with httpOnly cookies
- `apps/web/lib/supabase/middleware.ts` — JWT validation on protected routes
- `apps/web/lib/zod/schemas.ts` — Zod schemas for all API inputs
- `apps/web/middleware.ts` — protect /dashboard, /roast routes
- `apps/web/package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`

**Commits:**
- `feat(web): Next.js app shell with Supabase auth middleware`
- `feat(web): CSV upload + onboarding flow`
- `feat(web): dashboard with category chart and parasite scanner`
- `feat(web): roast page with SSE streaming`
- `feat(web): public share page for roast cards`

### Phase 3: Integration (sequential)

1. **Verify cross-package imports** (shared types used correctly across apps)
2. **Docker build:** `docker compose build`
3. **Start services:** `docker compose up -d`
4. **Database setup:**
   - `docker exec klevo-postgres psql -U postgres -d klevo -f /docker-entrypoint-initdb.d/001_init.sql`
   - `docker exec klevo-postgres psql -U postgres -d klevo -f /docker-entrypoint-initdb.d/002_rls_policies.sql`
   - `docker exec klevo-postgres psql -U postgres -d klevo -f /docker-entrypoint-initdb.d/003_indexes.sql`
   - Seed (unless --skip-seed): `docker exec klevo-postgres psql -U postgres -d klevo -f /docker-entrypoint-initdb.d/seed.sql`
5. **Health check:**
   - `curl http://localhost:3000/api/health` → `{"status":"ok"}`
   - `curl http://localhost:8000/health` → `{"status":"ok"}`
   - `docker compose ps` → all services `healthy`
6. **Run tests:**
   - `pnpm --filter ai-service test` (Python pytest)
   - `pnpm --filter web test` (Jest/Vitest)
7. **Git commit:** `chore: verify docker integration`

### Phase 4: Finalize

1. Generate/update `README.md` with quick start instructions
2. Final git tag: `git tag v0.1.0-scaffold`
3. Report summary: files generated, services running, what needs manual attention

## Output

After /start completes:
```
klevo/
├── apps/
│   ├── web/          (Next.js 15, ~40 files)
│   └── ai-service/   (FastAPI, ~20 files)
├── packages/
│   ├── db/           (SQL schema + migrations)
│   ├── ui/           (5 shared components)
│   └── types/        (shared TS types)
├── services/
│   ├── nginx/nginx.conf
│   └── redis/redis.conf
├── docker-compose.yml
├── .env.example
├── package.json (pnpm workspace)
└── README.md
```

## Flags

- `--skip-tests` — skip test file generation (faster, not recommended)
- `--skip-seed` — skip database seeding
- `--dry-run` — show plan without executing

## Estimated Time

- With parallel tasks: ~15-20 minutes
- Files generated: ~70-80 files
- Commits: ~12-15 commits

## Error Recovery

If a task fails mid-generation:
- All completed phases are committed to git
- Re-run `/start` — it detects existing files and skips completed phases
- Or fix the issue manually and continue

## Swarm Agents Used

| Phase | Agents | Parallelism |
|-------|--------|-------------|
| Phase 1 | Main | Sequential |
| Phase 2 | 5 Task tools | ⚡ Parallel |
| Phase 3 | Main | Sequential |
| Phase 4 | Main | Sequential |
