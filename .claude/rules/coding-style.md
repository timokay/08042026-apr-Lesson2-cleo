# Coding Style: Клёво

Source: `docs/Architecture.md` tech stack, `docs/Pseudocode.md`

## TypeScript (apps/web, packages/*)

### File Naming
- Components: `PascalCase.tsx` (e.g., `RoastCard.tsx`)
- Hooks: `use-kebab-case.ts` (e.g., `use-csv-upload.ts`)
- Utilities/services: `kebab-case.ts` (e.g., `csv-parser.ts`)
- Types: `kebab-case.types.ts` (e.g., `transaction.types.ts`)
- API routes: `route.ts` (Next.js App Router convention)

### Variable & Function Naming
- Variables and functions: `camelCase`
- React components: `PascalCase`
- Types and interfaces: `PascalCase` (e.g., `Transaction`, `RoastContext`)
- Constants: `UPPER_SNAKE_CASE` for module-level, `camelCase` for local
- Enum values: `PascalCase`

### Import Ordering
1. Node built-ins (`path`, `fs`)
2. External packages (`react`, `next`, `@supabase/supabase-js`)
3. Internal packages (`@klevo/types`, `@klevo/ui`)
4. Relative imports (`../lib/csv-parser`)

Separate each group with a blank line.

### React / Next.js Conventions
- Use App Router (`app/` directory), not Pages Router
- Server Components by default; add `'use client'` only when needed (interactivity, hooks)
- API routes in `app/api/[route]/route.ts`
- Streaming responses via `new Response(stream)` with `Content-Type: text/event-stream`
- Zod validation on ALL API route inputs before processing

### TypeScript Rules
- Strict mode enabled (`strict: true` in tsconfig)
- No `any` — use `unknown` and narrow with type guards
- Prefer `type` over `interface` for data shapes; use `interface` for extension contracts
- Async functions return `Promise<T>`, streaming generators return `AsyncGenerator<string>`

---

## Python (apps/ai-service)

### File Naming
- Modules: `snake_case.py` (e.g., `roast_generator.py`, `csv_parser.py`)
- FastAPI routers: `[resource]_router.py` (e.g., `roast_router.py`)
- Services: `[domain]_service.py`

### Naming Conventions
- Functions and variables: `snake_case`
- Classes: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Private methods/attributes: `_leading_underscore`

### FastAPI Patterns
- Use `async def` for all route handlers (FastAPI is async-first)
- SSE streaming: yield `data: {json}\n\n` chunks via `StreamingResponse`
- Pydantic models for request/response validation (replaces Zod on the Python side)
- Dependency injection via `Depends()` for auth, rate limiting, DB clients
- `HTTPException` for error responses with appropriate status codes

### Python-Specific Rules
- Use `httpx.AsyncClient` (not `requests`) for async HTTP calls to Claude/YandexGPT
- Environment variables via `python-dotenv` + `os.getenv()`, never hardcoded
- Type hints on all function signatures (`def fn(x: str) -> list[Transaction]:`)

---

## CSS / Tailwind

- Tailwind CSS v4 utility classes — no custom CSS unless unavoidable
- Class ordering: layout → sizing → spacing → typography → color → state
- Component variants via `cva` (class-variance-authority)
- Dark mode: `dark:` prefix classes; Клёво uses dark-first design

---

## Database (packages/db — Supabase PostgreSQL)

- Table names: `snake_case` plural (e.g., `transactions`, `roast_sessions`)
- Column names: `snake_case`
- Foreign keys: `[referenced_table_singular]_id` (e.g., `user_id`, `roast_id`)
- Every table MUST have `created_at TIMESTAMPTZ DEFAULT now()` and `id UUID DEFAULT gen_random_uuid()`
- RLS policy names: `[action]_[table]_[condition]` (e.g., `select_transactions_own_user`)

---

## Known Gotchas

### TypeScript / JavaScript
- `\w` in regex does NOT match Cyrillic characters. Use `\p{L}` with `/u` flag or explicit
  character classes for Russian text matching (e.g., in merchant name categorization).
- Direct type casting `req as CustomType` fails with TS2352. Use double-cast via `unknown`:
  `(req as unknown as CustomType)`. Better: use generic Next.js route handlers.
- `jest.fn(async () => value)` doesn't satisfy `jest.Mocked<T>` in strict mode.
  Use `jest.fn().mockResolvedValue(value)` instead.
- Next.js 15 App Router: `cookies()` and `headers()` are async — always `await cookies()`.
- Supabase RLS is applied automatically only when using the anon/user client, NOT the
  service-role client. Never use service-role key in browser or user-facing routes.

### Python / FastAPI
- `asyncio.run()` inside an already-running event loop (e.g., inside FastAPI route) throws
  `RuntimeError: This event loop is already running`. Use `await` directly instead.
- `httpx.AsyncClient` must be used as a context manager or manually closed, otherwise
  connections leak. Prefer lifespan dependency injection for shared clients.
- FastAPI `StreamingResponse` with `media_type="text/event-stream"` requires `\n\n` at the
  end of each SSE chunk — a single `\n` silently breaks the stream on some clients.

### Infrastructure / Docker
- Services with rate limiters (Redis sliding window) MUST be singletons. Per-request
  Redis connections bypass rate limit counters and exhaust the connection pool.
- `SET LOCAL` in PostgreSQL only affects the current transaction on the current connection.
  For Supabase RLS user context, use `set_config('request.jwt.claims', ...)` instead.
- Supabase self-hosted requires explicit `anon` and `service_role` JWT secrets in env.
  Missing `SUPABASE_JWT_SECRET` causes silent auth failures (tokens validate but RLS breaks).

### Russian-Market Specifics
- T-Bank (Т-Банк) CSV exports use `cp1251` encoding on Windows, `utf-8` on web export.
  Always detect encoding before parsing — do NOT assume utf-8.
- YandexGPT API rate limits are stricter than Claude's. Implement exponential backoff
  starting at 1 second, max 3 retries before returning the fallback response.
- Claude API via proxyapi.ru adds ~200-400ms latency vs direct. Adjust SSE timeout thresholds
  accordingly (target: first token < 2.5s, not 2s).
