# Security Rules: Клёво

Source: `docs/Specification.md` NFRs, `docs/Architecture.md`, `docs/Refinement.md`

## Data Privacy

- **Never store raw CSV files** — parse CSV in memory only; persist only extracted `Transaction[]` objects
- **Raw file deletion** — after parsing completes, explicitly clear the file buffer from memory; assert `GET /api/files` returns 404 (no file storage endpoint)
- **Transaction data isolation** — every DB query MUST include `WHERE user_id = auth.uid()` or equivalent RLS policy; never return another user's data
- **PII minimization** — store only what's needed: merchant name, amount, date, category; no account numbers, no card data

## Authentication & Authorization

- **JWT httpOnly cookies** — never store auth tokens in `localStorage` or `sessionStorage`; use Supabase Auth with httpOnly cookie strategy
- **Row Level Security (RLS)** — ALL Supabase tables MUST have RLS enabled; no table without a policy is acceptable
- **Session validation** — validate JWT on every protected API route; use Supabase middleware in Next.js
- **403 on cross-user access** — if user_id in request doesn't match auth.uid(), return 403 Forbidden immediately

## API Key Management

See `.claude/rules/secrets-management.md` for full protocol.

- **Environment variables only** — Claude API key, YandexGPT API key, Supabase service role key MUST be in `.env` only; never hardcoded
- **Never commit secrets** — `.env` must be in `.gitignore`; use `.env.example` with placeholder values
- **Server-side only** — AI API keys used only in `apps/ai-service/` (Python FastAPI), never exposed to browser
- **Key rotation** — if a key is accidentally committed, rotate it immediately; treat the old key as compromised

## Input Validation

- **Zod schemas** on ALL Next.js API routes — validate request body shape before processing
- **File type check** — CSV upload: validate MIME type AND parse first line; reject non-CSV silently with user-friendly error
- **File size limit** — max 10 MB for CSV upload; return 413 with "Файл слишком большой"
- **Sanitize AI prompts** — user-visible data injected into LLM prompts must be truncated to max length; no prompt injection vectors via transaction descriptions
- **SQL injection** — use Supabase client with parameterized queries only; never raw SQL string interpolation

## Rate Limiting

- **AI request rate** — max 10 AI requests per minute per user (Redis sliding window); return 429 with `Retry-After: 60`
- **Free plan limit** — 1 roast per month per user; check before making AI call (cost optimization)
- **Anti-abuse** — if 15+ AI requests in 1 minute from same user_id → flag and block for 1 hour

## Transport Security

- **HTTPS only** — Nginx must redirect HTTP → HTTPS; no plaintext traffic in production
- **CORS** — restrict to `klevo.app` domain; no wildcard `*` in production
- **CSP headers** — set Content-Security-Policy to prevent XSS; configured in Nginx

## ФЗ-152 Compliance

- **Data residency** — all personal data (transactions, profiles) stored on VPS HOSTKEY in Москва, Russia only
- **No external data transfer** — transaction data must NOT be sent to external analytics (no Mixpanel/Amplitude with PII); use server-side events or anonymized IDs
- **Self-hosted Supabase** — use self-hosted Supabase instance on RU VPS; never use cloud Supabase (US region)

## Dependency Security

- **Audit before adding** — run `npm audit` / `pip audit` before adding new dependencies
- **Pin versions** — use exact versions in production; avoid `^` or `~` for security-critical packages
- **No abandoned packages** — check last publish date; prefer actively maintained alternatives

## Known Security Anti-Patterns (DO NOT DO)

```typescript
// ❌ WRONG — localStorage for auth
localStorage.setItem('token', jwt)

// ❌ WRONG — raw file storage
await fs.writeFile('/tmp/upload.csv', buffer)

// ❌ WRONG — missing user_id check
const txns = await supabase.from('transactions').select('*')

// ❌ WRONG — API key in code
const client = new Anthropic({ apiKey: 'sk-ant-...' })

// ✅ CORRECT — server-side env var
const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })

// ✅ CORRECT — RLS enforced query
const txns = await supabase.from('transactions').select('*')
// RLS policy: WHERE user_id = auth.uid() applied automatically
```
