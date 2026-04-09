---
description: Deploy Клёво to VPS HOSTKEY with pre-flight checks.
  Supports dev (auto), staging (checks), and prod (manual confirmation).
  $ARGUMENTS: optional — environment name or "--dry-run"
---

# /deploy $ARGUMENTS

## Environments

| Env | Trigger | Confirmation |
|-----|---------|-------------|
| `dev` | default / `dev` | Auto |
| `staging` | `staging` | Pre-flight checks required |
| `prod` | `prod` | Manual confirmation required |

## Pre-flight Checklist (from `docs/Completion.md`)

Before any deployment, verify:

### Code Quality
- [ ] All tests pass: `pnpm test && pytest tests/`
- [ ] No TypeScript errors: `pnpm typecheck`
- [ ] No lint errors: `pnpm lint`
- [ ] No Python type errors: `mypy apps/ai-service/`

### Security
- [ ] No secrets in code: `git diff HEAD | grep -E "sk-ant|api_key|password" | grep -v ".env.example"`
- [ ] `.env` is NOT committed: `git status | grep -v ".env.example" | grep ".env"`
- [ ] All RLS policies present: check `packages/db/schema/002_rls_policies.sql`
- [ ] `HTTPS` configured in Nginx config

### Infrastructure
- [ ] `docker-compose.yml` is valid: `docker compose config`
- [ ] All environment variables documented in `.env.example`
- [ ] Health check endpoints working locally

### ФЗ-152 Compliance
- [ ] No external analytics with PII configured
- [ ] Supabase self-hosted on Russian VPS (not cloud)
- [ ] Data residency: all services configured for Moscow VPS

## Deployment Process

### Step 1: Build & Test Locally

```bash
# Build all images
docker compose build

# Run tests one final time
pnpm test && cd apps/ai-service && pytest tests/

# Check all services start
docker compose up -d
docker compose ps  # all should be "healthy"
```

### Step 2: Pre-flight Check

Run all items from the checklist above.
Stop deployment if ANY item fails — fix first.

### Step 3: Deploy to VPS

```bash
# Via GitHub Actions (recommended):
git push origin main
# → .github/workflows/deploy.yml triggers automatically

# Or manually via SSH (from Completion.md):
ssh deploy@<VPS_IP> "cd /opt/klevo && git pull && docker compose up -d --build"
```

### Step 4: Post-deploy Verification

```bash
# Health checks
curl https://klevo.app/api/health     # → {"status":"ok"}
curl https://klevo.app/api/ai/health  # → {"status":"ok"}

# Database
docker exec klevo-postgres pg_isready

# Quick smoke tests
curl -X POST https://klevo.app/api/upload -H "Content-Type: application/json"
# → should return 401 (not 500) — auth working
```

### Step 5: Monitor (first 15 min)

Check Grafana dashboard (see `docs/Completion.md` for dashboard URLs):
- Response times < 500ms (p95)
- Error rate < 1%
- AI first token < 2.5s
- No 500 errors

## Rollback

If deployment fails:

```bash
# SSH to VPS
ssh deploy@<VPS_IP>

# Roll back to previous image
cd /opt/klevo
git log --oneline -5
git checkout <previous-commit>
docker compose up -d --build

# Or use Docker image tags if available
docker compose down
docker pull klevo/web:previous-tag
docker compose up -d
```

## Environment Variables

All required vars listed in `.env.example`. For production VPS, these must be set in `/opt/klevo/.env`.

Critical vars to verify before prod deploy:
```
CLAUDE_API_KEY          — must be valid (test: curl proxyapi.ru)
YANDEX_GPT_API_KEY     — must be valid (fallback for Claude)
SUPABASE_URL            — must point to self-hosted instance (not supabase.com)
JWT_SECRET              — must be strong (≥32 chars)
```

## Flags

- `--dry-run` — show deployment plan and pre-flight results without executing
