# Secrets Management: Клёво

Applies because `has_external_apis = true` (Claude API via proxyapi.ru, YandexGPT API).

## API Keys in This Project

| Secret | Used In | Never Expose To |
|--------|---------|----------------|
| `CLAUDE_API_KEY` | `apps/ai-service/` only | Browser, Next.js client |
| `YANDEX_GPT_API_KEY` | `apps/ai-service/` only | Browser, Next.js client |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side only | Browser, any public route |
| `SUPABASE_ANON_KEY` | Next.js client (safe to expose) | — |
| `JWT_SECRET` | Supabase Auth | Any log, any response body |

## Storage Rules

1. **`.env` only** — all secrets in `.env` at project root, never in source files
2. **`.env` in `.gitignore`** — must be listed; verify before every commit: `git diff --cached .gitignore`
3. **`.env.example`** — maintain a template with placeholder values:
   ```
   CLAUDE_API_KEY=sk-ant-...
   YANDEX_GPT_API_KEY=...
   SUPABASE_URL=http://localhost:54321
   SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   JWT_SECRET=your-super-secret-jwt-secret
   REDIS_URL=redis://redis:6379
   PROXY_API_URL=https://api.proxyapi.ru/anthropic
   ```
4. **Docker Compose** — pass via `env_file: .env`, not hardcoded in `environment:` block

## Code Patterns

```python
# ✅ Python FastAPI — correct
import os
from dotenv import load_dotenv
load_dotenv()

CLAUDE_API_KEY = os.getenv("CLAUDE_API_KEY")
if not CLAUDE_API_KEY:
    raise RuntimeError("CLAUDE_API_KEY not set")
```

```typescript
// ✅ Next.js server-side — correct (API route)
const apiKey = process.env.CLAUDE_API_KEY  // server-only
if (!apiKey) throw new Error('CLAUDE_API_KEY not configured')

// ❌ WRONG — never use NEXT_PUBLIC_ prefix for secrets
const apiKey = process.env.NEXT_PUBLIC_CLAUDE_API_KEY  // exposed to browser!
```

## Key Rotation Protocol

If a key is accidentally committed to git:
1. **Immediately invalidate** the old key at the provider (Anthropic console / Yandex Cloud)
2. **Generate a new key** and update `.env`
3. **Remove from git history** if needed: `git filter-branch` or BFG Repo Cleaner
4. **Notify team** — treat the old key as fully compromised from the moment of commit
5. **Audit logs** — check provider logs for any unauthorized usage during exposure window

## Pre-commit Checklist

Before every commit, verify:
- `git diff --cached | grep -E "(sk-ant|api_key|secret)" | grep -v example` → should be empty
- `.env` is in `.gitignore`
- No API keys in `docker-compose.yml` `environment:` section (use `env_file` instead)
- No hardcoded credentials in test files

## CI/CD (GitHub Actions)

Store secrets in GitHub Repository Secrets (Settings → Secrets → Actions):
- `CLAUDE_API_KEY`
- `YANDEX_GPT_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VPS_SSH_KEY` (deploy key)

Reference in workflow:
```yaml
env:
  CLAUDE_API_KEY: ${{ secrets.CLAUDE_API_KEY }}
```

Never echo secrets or log them in workflow steps.
