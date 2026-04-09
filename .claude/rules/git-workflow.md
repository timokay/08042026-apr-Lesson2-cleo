# Git Workflow: Клёво

## Commit Format

```
type(scope): description
```

## Types

| Type | When to Use |
|------|-------------|
| `feat` | New feature or functionality |
| `fix` | Bug fix |
| `refactor` | Code restructuring without behavior change |
| `test` | Adding or updating tests |
| `docs` | Documentation changes |
| `chore` | Build, CI, config, dependency changes |
| `perf` | Performance improvements |
| `style` | Formatting, whitespace (no logic change) |

## Scopes (Monorepo)

| Scope | Package/Service |
|-------|----------------|
| `web` | `apps/web/` — Next.js frontend + BFF |
| `ai-service` | `apps/ai-service/` — Python FastAPI |
| `db` | `packages/db/` — Supabase schema + migrations |
| `ui` | `packages/ui/` — shared React components |
| `types` | `packages/types/` — shared TypeScript types |
| `nginx` | `services/nginx/` — reverse proxy config |
| `redis` | `services/redis/` — cache config |
| `infra` | `docker-compose.yml`, GitHub Actions, CI/CD |
| `feature` | Feature-level docs (in `docs/features/`) |

## Examples

```
feat(web): add CSV upload component with drag-and-drop
feat(ai-service): implement roast generator with SSE streaming
feat(db): add transactions table with RLS policies
fix(ai-service): handle Claude API timeout → YandexGPT fallback
fix(web): resolve cp1251 encoding in T-Bank CSV parser
refactor(web): extract transaction categorizer to shared service
test(ai-service): add unit tests for parasite detector algorithm
docs(feature): SPARC planning for parasite-scanner
docs(feature): validation complete for csv-upload
chore(infra): add GitHub Actions SSH deploy workflow
chore: update docker-compose healthchecks
```

## Rules

1. **Commit after each logical change** — not at the end of a large session
2. **Never combine unrelated changes** in one commit
3. **Imperative mood** — "add" not "added", "fix" not "fixed"
4. **Scope is required** for all monorepo-scoped changes; omit only for project-wide changes
5. **Description limit**: 72 characters for the subject line
6. **Body** (optional): explain WHY not WHAT, separated by blank line from subject
7. **Breaking changes**: add `!` after scope — `feat(db)!: rename user_id to profile_id`

## Branch Strategy

```
main          — production-ready code, protected
feature/[name] — feature branches, short-lived
fix/[name]    — bugfix branches
```

- Branch off `main`, PR back to `main`
- Delete branches after merge

## Feature Lifecycle Commits

When using `/feature [name]`:

```
docs(feature): SPARC planning for [name]
docs(feature): validation complete for [name]
feat([scope]): [description]          ← one per logical unit during implementation
fix([scope]): [description]           ← fixes during review phase
docs(feature): review complete for [name]
```
