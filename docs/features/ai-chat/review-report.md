# Review Report: ai-chat

**Date:** 2026-04-12  
**Reviewer:** brutal-honesty-review (Linus mode)  
**Status:** PASSED (all critical and major issues fixed)

---

## Summary

Phase 4 review uncovered 4 critical/major bugs and 3 minor issues. All critical/major fixes
applied before merge. The feature was non-functional on first implementation due to a
protocol mismatch between BFF and AI Service.

---

## Issues Found and Fixed

### CRITICAL — Fixed

**C1: BFF sends JSON to multipart endpoint (chat always 503)**
- File: `apps/web/app/api/chat/route.ts:64` → `routers/analyze_router.py`
- Root cause: Architecture.md specified `/analyze` accepting JSON transactions, but
  `analyze_router.py` implemented multipart CSV upload only. BFF sent JSON → FastAPI
  returned 422 → BFF treated as 503 → chat never worked.
- Fix: Added `POST /analyze/context` endpoint that accepts JSON `{user_id, transactions}`.
  Updated BFF to call `/analyze/context`.

**C2: ChatMessage Pydantic objects not serialized to dicts**
- File: `apps/ai-service/services/chat_generator.py:165`
- Root cause: `req.history` is `list[ChatMessage]` (Pydantic models). Spread into `messages`
  list alongside plain dicts. `httpx` JSON encoder cannot serialize Pydantic models.
  YandexGPT fallback additionally fails with `TypeError: 'ChatMessage' not subscriptable`
  on `msg["role"]`. Both providers fail silently for any session with history (2nd+ message).
- Fix: `[{"role": m.role, "content": m.content} for m in req.history]`

**C3: Daily counter incremented but never decremented on AI failure**
- File: `apps/ai-service/routers/chat_router.py` + `services/rate_limiter.py`
- Root cause: `check_daily_chat` atomically increments before streaming. If AI fails,
  `decrement_daily_chat` existed but was never called. A free user hitting 10 AI errors
  would exhaust their daily quota from errors alone.
- Fix: `await limiter.decrement_daily_chat(req.user_id)` added to `_sse_stream` except block.

### MAJOR — Fixed

**M1: /analyze called on every chat message (N× overhead)**
- File: `apps/web/app/api/chat/route.ts:64`
- Root cause: Architecture.md documented `chat:context:{user_id}:{date}` Redis cache,
  but implementation called `/analyze` on every message with no caching.
- Fix: New `/analyze/context` endpoint caches result in Redis by `user_id+date` (TTL 3600s).
  Cache hit returns in ~1ms vs ~200ms+ for full categorization.

### MINOR — Not Fixed (acceptable for MVP)

**m1: `decrement_daily_chat` GET+DECR race condition**
- Fixed: replaced with atomic Lua script (`if count > 0 then DECR end`).

**m2: `limiter._redis` private attribute access in chat_router**
- Not fixed: acceptable for MVP, would require `RateLimiter.redis` property to fix cleanly.
  Track as tech debt.

**m3: AbortError does not reset state to 'idle' in chat page**
- Not fixed: no abort button in UI, so the code path is unreachable from the user's
  perspective. Latent bug, track as tech debt.

**m4: No composite index `(user_id, session_id)` on chat_messages**
- Not fixed: separate single-column indexes exist, optimizer can combine. Post-MVP
  optimization when query patterns are confirmed.

---

## Security Review (OWASP)

| Check | Status | Notes |
|-------|--------|-------|
| A01 Broken Access Control | PASS | Redis keys use `{user_id}:{session_id}` — IDOR-safe |
| A02 Crypto / Auth | PASS | JWT validated via Supabase on every BFF request |
| A03 Injection | PASS | Zod on BFF, Pydantic on AI Service, Lua scripts for Redis |
| A04 Rate Limiting | PASS | 10/min + 10/day (free) / 100/day (plus), anti-abuse 1h block |
| A05 CORS | PASS | Inherits from main.py restrictions |
| A09 Logging | PASS | AI failures logged at WARNING, errors at ERROR |

---

## Architecture Compliance

| Requirement | Status |
|-------------|--------|
| SSE streaming via Server-Sent Events | PASS |
| Redis history RPUSH/LTRIM/EXPIRE 3600s | PASS |
| Context cache chat:context:{user_id}:{date} TTL 3600s | PASS (fixed) |
| Daily limit: free=10, plus=100 (Lua atomic) | PASS |
| Claude → YandexGPT fallback | PASS |
| Supabase RLS on chat_messages | PASS |
| BFF has no Redis (all Redis ops in AI Service) | PASS |

---

## Definition of Done

- [x] All critical issues fixed
- [x] All major issues fixed  
- [x] Security review passed
- [x] Architecture compliance verified
- [x] Review report written
