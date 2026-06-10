-- ============================================================
-- FollowTheHill — Supabase Database Migration
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Enable UUID extension (enabled by default in Supabase, but just in case)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Helper: auto-update updated_at ───────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TABLE: members
-- Federal MPs — sourced from openparliament.ca / ourcommons.ca
-- ============================================================

CREATE TABLE IF NOT EXISTS members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,           -- e.g. "mark-carney"
  name            TEXT NOT NULL,
  party           TEXT NOT NULL,
  riding          TEXT NOT NULL,
  province        TEXT NOT NULL,                  -- 2-letter province code
  photo_url       TEXT,
  email           TEXT,
  website         TEXT,
  parliament_url  TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  parliament_num  INTEGER,                        -- e.g. 45
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_members_party      ON members(party);
CREATE INDEX idx_members_province   ON members(province);
CREATE INDEX idx_members_is_active  ON members(is_active);
CREATE INDEX idx_members_name       ON members USING gin(to_tsvector('english', name));

CREATE TRIGGER members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE: votes
-- Parliamentary votes — sourced from openparliament.ca
-- ============================================================

CREATE TABLE IF NOT EXISTS votes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_number         INTEGER NOT NULL,
  parliament_num      INTEGER NOT NULL,
  session_num         INTEGER NOT NULL,
  date                DATE NOT NULL,
  bill_number         TEXT,                       -- e.g. "C-31", NULL if a motion
  description         TEXT NOT NULL,
  result              TEXT NOT NULL CHECK (result IN ('passed', 'failed')),
  yeas                INTEGER NOT NULL DEFAULT 0,
  nays                INTEGER NOT NULL DEFAULT 0,
  paired              INTEGER NOT NULL DEFAULT 0,
  open_parliament_url TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(vote_number, parliament_num, session_num)
);

CREATE INDEX idx_votes_date          ON votes(date DESC);
CREATE INDEX idx_votes_bill          ON votes(bill_number) WHERE bill_number IS NOT NULL;
CREATE INDEX idx_votes_parliament    ON votes(parliament_num, session_num);
CREATE INDEX idx_votes_result        ON votes(result);
CREATE INDEX idx_votes_description   ON votes USING gin(to_tsvector('english', description));

-- ============================================================
-- TABLE: member_votes
-- How each MP voted on each vote (junction table)
-- ============================================================

CREATE TABLE IF NOT EXISTS member_votes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  vote_id     UUID NOT NULL REFERENCES votes(id) ON DELETE CASCADE,
  decision    TEXT NOT NULL CHECK (decision IN ('yea', 'nay', 'paired', 'absent')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(member_id, vote_id)
);

CREATE INDEX idx_member_votes_member   ON member_votes(member_id);
CREATE INDEX idx_member_votes_vote     ON member_votes(vote_id);
CREATE INDEX idx_member_votes_decision ON member_votes(decision);

-- ============================================================
-- TABLE: donations
-- Political contributions — sourced from Elections Canada CSVs
-- ============================================================

CREATE TABLE IF NOT EXISTS donations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_name    TEXT NOT NULL,
  contributor_type    TEXT,                       -- "individual", "corporation", etc.
  recipient_type      TEXT NOT NULL,              -- "party", "candidate", "association", "leadership"
  recipient_name      TEXT NOT NULL,
  member_id           UUID REFERENCES members(id) ON DELETE SET NULL, -- linked if name-matched
  party               TEXT,
  amount              NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  year                INTEGER NOT NULL CHECK (year >= 2004),
  riding              TEXT,
  province            TEXT,
  source              TEXT NOT NULL DEFAULT 'elections_canada',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_donations_member      ON donations(member_id) WHERE member_id IS NOT NULL;
CREATE INDEX idx_donations_year        ON donations(year DESC);
CREATE INDEX idx_donations_party       ON donations(party) WHERE party IS NOT NULL;
CREATE INDEX idx_donations_amount      ON donations(amount DESC);
CREATE INDEX idx_donations_contributor ON donations USING gin(to_tsvector('english', contributor_name));
CREATE INDEX idx_donations_recipient   ON donations USING gin(to_tsvector('english', recipient_name));

-- ============================================================
-- TABLE: users
-- App users — extends Supabase auth.users
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id                      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                   TEXT UNIQUE NOT NULL,
  stripe_customer_id      TEXT UNIQUE,
  subscription_status     TEXT NOT NULL DEFAULT 'free'
    CHECK (subscription_status IN ('free', 'active', 'past_due', 'canceled')),
  subscription_id         TEXT,
  plan_id                 TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_stripe_customer ON users(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX idx_users_subscription    ON users(subscription_status);

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE: support_transactions
-- Buy me a coffee one-time Stripe payments
-- ============================================================

CREATE TABLE IF NOT EXISTS support_transactions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  amount                   INTEGER NOT NULL CHECK (amount > 0), -- in cents
  currency                 TEXT NOT NULL DEFAULT 'cad',
  user_id                  UUID REFERENCES users(id) ON DELETE SET NULL, -- nullable (anon ok)
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ROW-LEVEL SECURITY (RLS)
-- ============================================================

-- Public tables: anyone can read, nobody can write via client
ALTER TABLE members              ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_votes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_transactions ENABLE ROW LEVEL SECURITY;

-- members: public read
CREATE POLICY "members_public_read"
  ON members FOR SELECT
  USING (true);

-- votes: public read
CREATE POLICY "votes_public_read"
  ON votes FOR SELECT
  USING (true);

-- member_votes: public read
CREATE POLICY "member_votes_public_read"
  ON member_votes FOR SELECT
  USING (true);

-- donations: public read
CREATE POLICY "donations_public_read"
  ON donations FOR SELECT
  USING (true);

-- users: authenticated users can read/update only their own row
CREATE POLICY "users_select_own"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- users: insert on sign-up (handled by service role in auth webhook)
CREATE POLICY "users_insert_own"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- support_transactions: users can see their own
CREATE POLICY "support_transactions_select_own"
  ON support_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================
-- USEFUL VIEWS
-- ============================================================

-- Member vote stats (% with party, total votes) — used for AI and profile pages
CREATE OR REPLACE VIEW member_vote_stats AS
SELECT
  m.id                                AS member_id,
  m.slug,
  m.name,
  m.party,
  COUNT(mv.id)                        AS total_votes,
  COUNT(CASE WHEN mv.decision = 'yea'    THEN 1 END) AS yea_count,
  COUNT(CASE WHEN mv.decision = 'nay'    THEN 1 END) AS nay_count,
  COUNT(CASE WHEN mv.decision = 'paired' THEN 1 END) AS paired_count,
  COUNT(CASE WHEN mv.decision = 'absent' THEN 1 END) AS absent_count
FROM members m
LEFT JOIN member_votes mv ON mv.member_id = m.id
GROUP BY m.id, m.slug, m.name, m.party;

-- Donation totals per member
CREATE OR REPLACE VIEW member_donation_totals AS
SELECT
  member_id,
  COUNT(*)                AS donation_count,
  SUM(amount)             AS total_amount,
  AVG(amount)             AS avg_amount,
  MAX(amount)             AS max_donation,
  MIN(year)               AS first_year,
  MAX(year)               AS last_year
FROM donations
WHERE member_id IS NOT NULL
GROUP BY member_id;

-- ============================================================
-- FUNCTION: Create user profile on signup
-- Called via Supabase Auth webhook or trigger
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: auto-create users row when auth.users row is created
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
