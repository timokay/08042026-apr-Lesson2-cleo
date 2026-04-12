# Review Report: Upgrade to Plus

**Дата:** 2026-04-12
**Метод:** Brutal Honesty Review (Linus + Security modes)
**Итог:** 3 issues found → 3 fixed

---

## Issues Found & Fixed

### CRITICAL: Race condition guard broken (webhook)
**File:** `apps/web/app/api/payments/webhook/route.ts:75`

**Problem:** `.update()` without `{ count: 'exact' }` returns `count: null` in Supabase JS v2.
`null === 0` is false in JavaScript — so the guard `if (count === 0)` never triggered.
Two concurrent webhook requests would both proceed to upgrade the profile.

**Fix:** Added `{ count: 'exact' }` option to the Supabase update call.
```typescript
.update({ status: 'paid', ... }, { count: 'exact' })
```

---

### HIGH: Monthly quota consumed before AI call succeeds (rate_limiter)
**File:** `apps/ai-service/services/rate_limiter.py:67`

**Problem:** `check_monthly_roast()` incremented the Redis counter unconditionally
before the AI call started. If Claude timed out or YandexGPT fallback failed,
the free user's only monthly roast was already burned. Terrible UX.

**Fix:** Split into `check_monthly_roast()` (read-only) + `consume_monthly_roast()` (write-only).
Router calls check first, then `consume_monthly_roast` is called inside the SSE generator
on the first successful token yield. If AI fails before first token — quota not consumed.

---

### HIGH: useSearchParams without Suspense (upgrade page)
**File:** `apps/web/app/upgrade/page.tsx`

**Problem:** Next.js 15 requires `useSearchParams()` to be wrapped in a `<Suspense>`
boundary. Without it, the entire page de-opts from static rendering and triggers
a build warning/error in production.

**Fix:** Extracted page content into `UpgradeContent` component, wrapped in `<Suspense>`.

---

## Security Checklist

| Check | Status | Notes |
|-------|--------|-------|
| Webhook signature verified before DB | ✅ | MD5 with Password2, before any side effects |
| No JWT on webhook endpoint | ✅ | Correct — Robokassa doesn't support it |
| IDOR check (user_id mismatch) | ✅ | txn.user_id === shp_user_id verified |
| Amount tamper check | ✅ | `Math.abs(received - expected) > 0.01` |
| Service role key only server-side | ✅ | Used only in webhook + create-invoice |
| RLS on payment_transactions | ✅ | SELECT policy for own user |
| shp_user_id included in both signatures | ✅ | Prevents replay across users |
| Race condition guard | ✅ FIXED | Was broken (count: null), now correct |

## Architecture Check

| Check | Status |
|-------|--------|
| Plan enforcement in AI service, not BFF | ✅ |
| BFF fetches plan, passes to AI service | ✅ |
| No Supabase credentials in AI service | ✅ |
| Monthly limit consumed after success | ✅ FIXED |
| Robokassa response format `OK{InvoiceId}` | ✅ |
| Idempotency on duplicate webhooks | ✅ FIXED |

## Статус: PASSED ✅

3/3 issues fixed. No open criticals or highs.
