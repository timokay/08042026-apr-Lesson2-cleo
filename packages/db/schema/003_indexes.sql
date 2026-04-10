-- ============================================================
-- Клёво — Performance Indexes
-- ============================================================

-- transactions: most queries filter by user_id + date range
CREATE INDEX IF NOT EXISTS idx_transactions_user_id
  ON transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date
  ON transactions(user_id, transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_user_category
  ON transactions(user_id, category);

CREATE INDEX IF NOT EXISTS idx_transactions_is_subscription
  ON transactions(user_id, is_subscription)
  WHERE is_subscription = TRUE;

-- roasts: lookup by share_token (public share pages, no auth needed)
CREATE INDEX IF NOT EXISTS idx_roasts_share_token
  ON roasts(share_token)
  WHERE share_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_roasts_user_created
  ON roasts(user_id, created_at DESC);

-- profiles: no extra indexes needed (PK = UUID lookup only)
