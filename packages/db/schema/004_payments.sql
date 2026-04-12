-- ============================================================
-- Клёво — Payments Schema
-- Source: docs/features/upgrade-plus/sparc/Specification.md
-- ============================================================

-- ============================================================
-- payment_transactions
-- Audit trail for Robokassa payments
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_transactions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invoice_id            TEXT NOT NULL UNIQUE,  -- idempotency key
  amount                DECIMAL(10,2) NOT NULL,
  status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  raw_robokassa_response TEXT,                 -- OutSum from webhook for audit
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at               TIMESTAMPTZ
);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Users can read their own payment history
CREATE POLICY select_payment_transactions_own_user ON payment_transactions
  FOR SELECT USING (user_id = auth.uid());

-- INSERT and UPDATE done via service_role_key in API routes
-- (webhook handler needs service_role to bypass RLS intentionally)

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id
  ON payment_transactions (user_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_invoice_id
  ON payment_transactions (invoice_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_status
  ON payment_transactions (status)
  WHERE status = 'pending';
