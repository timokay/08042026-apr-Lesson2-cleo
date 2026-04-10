-- ============================================================
-- Клёво — Initial Schema
-- Source: docs/Architecture.md, docs/Pseudocode.md
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- profiles
-- Extends auth.users from Supabase Auth
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    TEXT,
  plan            TEXT NOT NULL DEFAULT 'free'
                    CHECK (plan IN ('free', 'plus', 'pro')),
  plan_expires_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount           DECIMAL(12,2) NOT NULL,  -- negative = expense
  currency         TEXT NOT NULL DEFAULT 'RUB',
  category         TEXT NOT NULL DEFAULT 'other'
                     CHECK (category IN (
                       'food_delivery','restaurants','subscriptions',
                       'transport','groceries','shopping',
                       'utilities','entertainment','savings','other'
                     )),
  description      TEXT NOT NULL DEFAULT '',
  merchant         TEXT NOT NULL DEFAULT '',
  transaction_date DATE NOT NULL,
  source           TEXT NOT NULL DEFAULT 'csv'
                     CHECK (source IN ('csv','manual','bank_api','sms')),
  is_subscription  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- roasts
-- ============================================================
CREATE TABLE IF NOT EXISTS roasts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  summary      TEXT,
  period_start DATE,
  period_end   DATE,
  share_token  TEXT UNIQUE,
  is_public    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- savings_goals (v1 feature)
-- ============================================================
CREATE TABLE IF NOT EXISTS savings_goals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  target_amount  DECIMAL(12,2) NOT NULL,
  current_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  deadline       DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
