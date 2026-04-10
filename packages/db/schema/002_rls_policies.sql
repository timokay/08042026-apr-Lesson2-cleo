-- ============================================================
-- Клёво — Row Level Security Policies
-- Source: docs/Architecture.md, docs/Refinement.md
-- ALL tables MUST have RLS enabled — security requirement
-- ============================================================

-- ============================================================
-- profiles
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read and update only their own profile
CREATE POLICY select_profiles_own_user ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY update_profiles_own_user ON profiles
  FOR UPDATE USING (id = auth.uid());

-- ============================================================
-- transactions
-- ============================================================
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Users can only access their own transactions
CREATE POLICY select_transactions_own_user ON transactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY insert_transactions_own_user ON transactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY delete_transactions_own_user ON transactions
  FOR DELETE USING (user_id = auth.uid());

-- No UPDATE on transactions — immutable once stored

-- ============================================================
-- roasts
-- ============================================================
ALTER TABLE roasts ENABLE ROW LEVEL SECURITY;

-- Users can read their own roasts OR any public roast (for share pages)
CREATE POLICY select_roasts_own_or_public ON roasts
  FOR SELECT USING (user_id = auth.uid() OR is_public = TRUE);

CREATE POLICY insert_roasts_own_user ON roasts
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY update_roasts_own_user ON roasts
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY delete_roasts_own_user ON roasts
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- savings_goals
-- ============================================================
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_savings_goals_own_user ON savings_goals
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY insert_savings_goals_own_user ON savings_goals
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY update_savings_goals_own_user ON savings_goals
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY delete_savings_goals_own_user ON savings_goals
  FOR DELETE USING (user_id = auth.uid());
