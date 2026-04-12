-- ============================================================
-- Клёво — Chat Messages Schema (Plus plan persistence)
-- Source: docs/features/ai-chat/sparc/Specification.md
-- ============================================================

CREATE TABLE IF NOT EXISTS chat_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id    TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content       TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can read their own messages
CREATE POLICY select_chat_messages_own_user ON chat_messages
  FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own messages
CREATE POLICY insert_chat_messages_own_user ON chat_messages
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- DELETE for GDPR-like data retention (service role only — no user policy)
-- Messages are immutable once created (no UPDATE policy)

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id
  ON chat_messages (user_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id
  ON chat_messages (session_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at
  ON chat_messages (created_at DESC);
