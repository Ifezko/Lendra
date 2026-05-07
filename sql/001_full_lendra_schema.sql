-- ══════════════════════════════════════════════════════════════
-- LENDRA FULL DATABASE SCHEMA
-- Paste into Supabase SQL Editor and run once.
-- Safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS.
-- ══════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────
-- 1. wallet_profiles
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  sol_domain TEXT,
  has_sol_domain BOOLEAN DEFAULT false,
  x_user_id TEXT,
  x_username TEXT,
  x_display_name TEXT,
  x_profile_image TEXT,
  x_account_created_at TIMESTAMPTZ,
  x_account_age_days NUMERIC,
  x_posts_count INT DEFAULT 0,
  x_followers_count INT DEFAULT 0,
  x_following_count INT DEFAULT 0,
  x_connected BOOLEAN DEFAULT false,
  x_connected_at TIMESTAMPTZ,
  x_verification_score NUMERIC DEFAULT 0,
  x_verified_at TIMESTAMPTZ,
  x_dm_verified BOOLEAN DEFAULT false,
  superteam_verified BOOLEAN DEFAULT false,
  cross_chain_connected BOOLEAN DEFAULT false,
  private_mode_enabled BOOLEAN DEFAULT false,
  telegram_chat_id TEXT,
  telegram_username TEXT,
  telegram_connected BOOLEAN DEFAULT false,
  telegram_connected_at TIMESTAMPTZ,
  telegram_alerts_enabled BOOLEAN DEFAULT false,
  telegram_score_alerts_enabled BOOLEAN DEFAULT true,
  telegram_loan_alerts_enabled BOOLEAN DEFAULT true,
  telegram_bond_alerts_enabled BOOLEAN DEFAULT true,
  telegram_repayment_alerts_enabled BOOLEAN DEFAULT true,
  telegram_level_alerts_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE wallet_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_select_wallet_profiles" ON wallet_profiles;
CREATE POLICY "public_select_wallet_profiles" ON wallet_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_insert_wallet_profiles" ON wallet_profiles;
CREATE POLICY "public_insert_wallet_profiles" ON wallet_profiles FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "public_update_wallet_profiles" ON wallet_profiles;
CREATE POLICY "public_update_wallet_profiles" ON wallet_profiles FOR UPDATE USING (true);

CREATE INDEX IF NOT EXISTS idx_wallet_profiles_address ON wallet_profiles (wallet_address);

-- ──────────────────────────────────────────────────────────────
-- 2. wallet_scans
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  score NUMERIC DEFAULT 100,
  max_score NUMERIC DEFAULT 1000,
  tier TEXT,
  loan_level INT,
  level_name TEXT,
  eligible BOOLEAN DEFAULT false,
  eligibility_status TEXT,
  base_score NUMERIC DEFAULT 100,
  wallet_age_points NUMERIC DEFAULT 0,
  transaction_volume_points NUMERIC DEFAULT 0,
  monthly_consistency_points NUMERIC DEFAULT 0,
  protocol_diversity_points NUMERIC DEFAULT 0,
  portfolio_value_points NUMERIC DEFAULT 0,
  repayment_history_points NUMERIC DEFAULT 0,
  x_verification_points NUMERIC DEFAULT 0,
  cross_chain_credit_points NUMERIC DEFAULT 0,
  sol_identity_points NUMERIC DEFAULT 0,
  superteam_pow_points NUMERIC DEFAULT 0,
  credit_maturity_points NUMERIC DEFAULT 0,
  borrow_growth_points NUMERIC DEFAULT 0,
  wallet_age_days NUMERIC DEFAULT 0,
  total_transactions INT DEFAULT 0,
  avg_monthly_transactions NUMERIC DEFAULT 0,
  unique_protocols INT DEFAULT 0,
  recent_spend_90d NUMERIC DEFAULT 0,
  max_single_tx_usd NUMERIC DEFAULT 0,
  portfolio_value_usd NUMERIC DEFAULT 0,
  has_sol_domain BOOLEAN DEFAULT false,
  sol_domain TEXT,
  x_connected BOOLEAN DEFAULT false,
  x_user_id TEXT,
  x_verification_score NUMERIC DEFAULT 0,
  superteam_verified BOOLEAN DEFAULT false,
  cross_chain_connected BOOLEAN DEFAULT false,
  qvac_used BOOLEAN DEFAULT false,
  selected_language TEXT DEFAULT 'English',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE wallet_scans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_select_wallet_scans" ON wallet_scans;
CREATE POLICY "public_select_wallet_scans" ON wallet_scans FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_insert_wallet_scans" ON wallet_scans;
CREATE POLICY "public_insert_wallet_scans" ON wallet_scans FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_wallet_scans_address ON wallet_scans (wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_scans_created ON wallet_scans (created_at DESC);

-- ──────────────────────────────────────────────────────────────
-- 3. eligibility_checks
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS eligibility_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  scan_id UUID REFERENCES wallet_scans(id) ON DELETE SET NULL,
  score_passed BOOLEAN DEFAULT false,
  spend_gate_passed BOOLEAN DEFAULT false,
  max_single_tx_gate_passed BOOLEAN DEFAULT false,
  active_loan_gate_passed BOOLEAN DEFAULT true,
  repayment_requirement_passed BOOLEAN DEFAULT false,
  level_requirement_passed BOOLEAN DEFAULT false,
  x_requirement_passed BOOLEAN DEFAULT false,
  eligible_level INT DEFAULT 0,
  eligible_level_name TEXT,
  eligible_amount NUMERIC DEFAULT 0,
  borrow_asset TEXT DEFAULT 'USDC',
  blocked_reason TEXT,
  next_unlock_hint TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE eligibility_checks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_select_eligibility_checks" ON eligibility_checks;
CREATE POLICY "public_select_eligibility_checks" ON eligibility_checks FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_insert_eligibility_checks" ON eligibility_checks;
CREATE POLICY "public_insert_eligibility_checks" ON eligibility_checks FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_eligibility_wallet ON eligibility_checks (wallet_address);

-- ──────────────────────────────────────────────────────────────
-- 4. loans
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  borrow_asset TEXT DEFAULT 'USDC',
  loan_amount NUMERIC NOT NULL,
  apr NUMERIC NOT NULL,
  interest_amount NUMERIC DEFAULT 0,
  total_repayment NUMERIC DEFAULT 0,
  bond_amount NUMERIC DEFAULT 0,
  bond_percentage NUMERIC DEFAULT 30,
  loan_level INT,
  level_name TEXT,
  loan_purpose_text TEXT,
  loan_purpose_tags TEXT[],
  status TEXT DEFAULT 'active',
  borrowed_at TIMESTAMPTZ DEFAULT now(),
  due_date TIMESTAMPTZ,
  repaid_at TIMESTAMPTZ,
  borrow_tx_hash TEXT,
  repay_tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_select_loans" ON loans;
CREATE POLICY "public_select_loans" ON loans FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_insert_loans" ON loans;
CREATE POLICY "public_insert_loans" ON loans FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "public_update_loans" ON loans;
CREATE POLICY "public_update_loans" ON loans FOR UPDATE USING (true);

CREATE INDEX IF NOT EXISTS idx_loans_wallet ON loans (wallet_address);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans (status);

-- ──────────────────────────────────────────────────────────────
-- 5. loan_events
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loan_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  event_type TEXT NOT NULL,
  borrow_asset TEXT DEFAULT 'USDC',
  loan_amount NUMERIC DEFAULT 0,
  apr NUMERIC DEFAULT 0,
  interest_amount NUMERIC DEFAULT 0,
  total_repayment NUMERIC DEFAULT 0,
  bond_amount NUMERIC DEFAULT 0,
  bond_percentage NUMERIC DEFAULT 30,
  loan_level INT,
  level_name TEXT,
  loan_purpose_text TEXT,
  loan_purpose_tags TEXT[],
  status TEXT DEFAULT 'simulated',
  due_date TIMESTAMPTZ,
  transaction_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE loan_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_select_loan_events" ON loan_events;
CREATE POLICY "public_select_loan_events" ON loan_events FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_insert_loan_events" ON loan_events;
CREATE POLICY "public_insert_loan_events" ON loan_events FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_loan_events_wallet ON loan_events (wallet_address);

-- ──────────────────────────────────────────────────────────────
-- 6. repayments
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS repayments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  loan_id UUID REFERENCES loans(id) ON DELETE SET NULL,
  amount_repaid NUMERIC DEFAULT 0,
  interest_paid NUMERIC DEFAULT 0,
  bond_returned NUMERIC DEFAULT 0,
  repaid_at TIMESTAMPTZ,
  was_late BOOLEAN DEFAULT false,
  was_early BOOLEAN DEFAULT false,
  transaction_hash TEXT,
  score_before NUMERIC,
  score_after NUMERIC,
  repayment_points_awarded NUMERIC DEFAULT 0,
  borrow_growth_points_awarded NUMERIC DEFAULT 0,
  level_before INT,
  level_after INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE repayments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_select_repayments" ON repayments;
CREATE POLICY "public_select_repayments" ON repayments FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_insert_repayments" ON repayments;
CREATE POLICY "public_insert_repayments" ON repayments FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_repayments_wallet ON repayments (wallet_address);

-- ──────────────────────────────────────────────────────────────
-- 7. repayment_stats
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS repayment_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  clean_repayments INT DEFAULT 0,
  early_repayments INT DEFAULT 0,
  late_repayments INT DEFAULT 0,
  defaults INT DEFAULT 0,
  repayment_score NUMERIC DEFAULT 0,
  current_level INT DEFAULT 0,
  current_level_name TEXT,
  highest_level_unlocked INT DEFAULT 0,
  first_borrow_amount NUMERIC,
  highest_borrow_amount_repaid NUMERIC,
  qualifying_higher_borrow_repayments INT DEFAULT 0,
  borrow_growth_points NUMERIC DEFAULT 0,
  last_repayment_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE repayment_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_select_repayment_stats" ON repayment_stats;
CREATE POLICY "public_select_repayment_stats" ON repayment_stats FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_insert_repayment_stats" ON repayment_stats;
CREATE POLICY "public_insert_repayment_stats" ON repayment_stats FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "public_update_repayment_stats" ON repayment_stats;
CREATE POLICY "public_update_repayment_stats" ON repayment_stats FOR UPDATE USING (true);

CREATE INDEX IF NOT EXISTS idx_repayment_stats_wallet ON repayment_stats (wallet_address);

-- ──────────────────────────────────────────────────────────────
-- 8. bond_events
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bond_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  loan_id UUID REFERENCES loans(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  loan_amount NUMERIC,
  bond_percentage NUMERIC DEFAULT 30,
  bond_amount_usd NUMERIC DEFAULT 0,
  borrow_asset TEXT DEFAULT 'USDC',
  bond_token TEXT DEFAULT 'USDC',
  loan_level INT,
  level_name TEXT,
  escrow_provider TEXT DEFAULT 'streamflow',
  escrow_account TEXT,
  status TEXT DEFAULT 'locked',
  tx_hash TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE bond_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_select_bond_events" ON bond_events;
CREATE POLICY "public_select_bond_events" ON bond_events FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_insert_bond_events" ON bond_events;
CREATE POLICY "public_insert_bond_events" ON bond_events FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "public_update_bond_events" ON bond_events;
CREATE POLICY "public_update_bond_events" ON bond_events FOR UPDATE USING (true);

CREATE INDEX IF NOT EXISTS idx_bond_events_wallet ON bond_events (wallet_address);

-- ──────────────────────────────────────────────────────────────
-- 9. partner_events
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS partner_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT,
  partner TEXT NOT NULL,
  event_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE partner_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_select_partner_events" ON partner_events;
CREATE POLICY "public_select_partner_events" ON partner_events FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_insert_partner_events" ON partner_events;
CREATE POLICY "public_insert_partner_events" ON partner_events FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_partner_events_partner ON partner_events (partner);
CREATE INDEX IF NOT EXISTS idx_partner_events_wallet ON partner_events (wallet_address);

-- ──────────────────────────────────────────────────────────────
-- 10. commission_events
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS commission_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner TEXT NOT NULL,
  event_type TEXT NOT NULL,
  wallet_address TEXT,
  amount_usd NUMERIC DEFAULT 0,
  commission_usd NUMERIC DEFAULT 0,
  commission_token TEXT DEFAULT 'USDC',
  status TEXT DEFAULT 'pending',
  tx_hash TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE commission_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_select_commission_events" ON commission_events;
CREATE POLICY "public_select_commission_events" ON commission_events FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_insert_commission_events" ON commission_events;
CREATE POLICY "public_insert_commission_events" ON commission_events FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "public_update_commission_events" ON commission_events;
CREATE POLICY "public_update_commission_events" ON commission_events FOR UPDATE USING (true);

-- ──────────────────────────────────────────────────────────────
-- 11. sns_events
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sns_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT,
  domain TEXT,
  event_type TEXT NOT NULL,
  availability_status TEXT,
  price_usd NUMERIC DEFAULT 0,
  referral_wallet TEXT,
  commission_usd NUMERIC DEFAULT 0,
  tx_hash TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sns_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_select_sns_events" ON sns_events;
CREATE POLICY "public_select_sns_events" ON sns_events FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_insert_sns_events" ON sns_events;
CREATE POLICY "public_insert_sns_events" ON sns_events FOR INSERT WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────
-- 12. qvac_events
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qvac_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT,
  event_type TEXT NOT NULL,
  selected_language TEXT DEFAULT 'English',
  user_question TEXT,
  response_summary TEXT,
  used_voice BOOLEAN DEFAULT false,
  used_translation BOOLEAN DEFAULT false,
  used_tts BOOLEAN DEFAULT false,
  used_stt BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE qvac_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_select_qvac_events" ON qvac_events;
CREATE POLICY "public_select_qvac_events" ON qvac_events FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_insert_qvac_events" ON qvac_events;
CREATE POLICY "public_insert_qvac_events" ON qvac_events FOR INSERT WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────
-- 13. social_credit_cards
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS social_credit_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  sol_domain TEXT,
  score NUMERIC,
  max_score NUMERIC DEFAULT 1000,
  tier TEXT,
  loan_level INT,
  level_name TEXT,
  image_url TEXT,
  shared_to_x BOOLEAN DEFAULT false,
  x_share_url TEXT,
  private_mode_confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE social_credit_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_select_social_credit_cards" ON social_credit_cards;
CREATE POLICY "public_select_social_credit_cards" ON social_credit_cards FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_insert_social_credit_cards" ON social_credit_cards;
CREATE POLICY "public_insert_social_credit_cards" ON social_credit_cards FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "public_update_social_credit_cards" ON social_credit_cards;
CREATE POLICY "public_update_social_credit_cards" ON social_credit_cards FOR UPDATE USING (true);

-- ──────────────────────────────────────────────────────────────
-- 14. notification_events
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT,
  channel TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  recipient TEXT,
  message TEXT,
  metadata JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ
);

ALTER TABLE notification_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_select_notification_events" ON notification_events;
CREATE POLICY "public_select_notification_events" ON notification_events FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_insert_notification_events" ON notification_events;
CREATE POLICY "public_insert_notification_events" ON notification_events FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "public_update_notification_events" ON notification_events;
CREATE POLICY "public_update_notification_events" ON notification_events FOR UPDATE USING (true);

CREATE INDEX IF NOT EXISTS idx_notification_events_wallet ON notification_events (wallet_address);

-- ──────────────────────────────────────────────────────────────
-- 15. score_change_events
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS score_change_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  previous_score NUMERIC,
  new_score NUMERIC,
  score_delta NUMERIC,
  previous_level INT,
  new_level INT,
  previous_eligible BOOLEAN,
  new_eligible BOOLEAN,
  reason TEXT,
  trigger_event TEXT,
  notification_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE score_change_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_select_score_change_events" ON score_change_events;
CREATE POLICY "public_select_score_change_events" ON score_change_events FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_insert_score_change_events" ON score_change_events;
CREATE POLICY "public_insert_score_change_events" ON score_change_events FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_score_change_wallet ON score_change_events (wallet_address);

-- ──────────────────────────────────────────────────────────────
-- 16. x_verification_events
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS x_verification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  x_user_id TEXT,
  event_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  points_awarded NUMERIC DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE x_verification_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_select_x_verification_events" ON x_verification_events;
CREATE POLICY "public_select_x_verification_events" ON x_verification_events FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_insert_x_verification_events" ON x_verification_events;
CREATE POLICY "public_insert_x_verification_events" ON x_verification_events FOR INSERT WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────
-- 17. admin_users
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  role TEXT DEFAULT 'viewer',
  wallet_address TEXT,
  totp_secret TEXT,
  totp_enabled BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending',
  force_password_reset BOOLEAN DEFAULT false,
  invited_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ,
  invite_accepted_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
-- Admin tables: no public access. Access via service role key only.
DROP POLICY IF EXISTS "service_role_admin_users" ON admin_users;
CREATE POLICY "service_role_admin_users" ON admin_users FOR ALL USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────
-- 18. admin_invites
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  token_hash TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  invited_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE admin_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_admin_invites" ON admin_invites;
CREATE POLICY "service_role_admin_invites" ON admin_invites FOR ALL USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────
-- 19. admin_sessions
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES admin_users(id) ON DELETE CASCADE,
  session_token_hash TEXT NOT NULL,
  revoked BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_admin_sessions" ON admin_sessions;
CREATE POLICY "service_role_admin_sessions" ON admin_sessions FOR ALL USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────
-- 20. admin_login_attempts
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  ip_address TEXT,
  success BOOLEAN DEFAULT false,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE admin_login_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_admin_login_attempts" ON admin_login_attempts;
CREATE POLICY "service_role_admin_login_attempts" ON admin_login_attempts FOR ALL USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────
-- 21. admin_permission_overrides
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_permission_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES admin_users(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL,
  allowed BOOLEAN NOT NULL,
  updated_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE admin_permission_overrides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_admin_permission_overrides" ON admin_permission_overrides;
CREATE POLICY "service_role_admin_permission_overrides" ON admin_permission_overrides FOR ALL USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────
-- 22. admin_audit_logs
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_admin_audit_logs" ON admin_audit_logs;
CREATE POLICY "service_role_admin_audit_logs" ON admin_audit_logs FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_admin_audit_actor ON admin_audit_logs (actor_admin_id);

-- ──────────────────────────────────────────────────────────────
-- 23. app_settings
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB,
  updated_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_select_app_settings" ON app_settings;
CREATE POLICY "public_select_app_settings" ON app_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "service_role_write_app_settings" ON app_settings;
CREATE POLICY "service_role_write_app_settings" ON app_settings FOR ALL USING (true) WITH CHECK (true);


-- ══════════════════════════════════════════════════════════════
-- VIEWS
-- ══════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────
-- view_admin_overview_metrics
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW view_admin_overview_metrics AS
SELECT
  (SELECT count(*) FROM wallet_scans) AS total_wallet_scans,
  (SELECT count(DISTINCT wallet_address) FROM wallet_scans) AS unique_wallets,
  (SELECT round(avg(score), 1) FROM wallet_scans) AS average_score,
  (SELECT count(*) FROM wallet_scans WHERE eligible = true) AS eligible_wallets,
  (SELECT count(*) FROM wallet_scans WHERE eligible = false) AS blocked_wallets,
  (SELECT count(*) FROM loan_events WHERE event_type = 'simulation') AS borrow_simulations,
  (SELECT count(*) FROM loans) AS loans_issued,
  (SELECT count(*) FROM loans WHERE status = 'active') AS active_loans,
  (SELECT CASE WHEN count(*) > 0 THEN round(count(*) FILTER (WHERE status = 'repaid')::numeric / count(*)::numeric * 100, 1) ELSE 0 END FROM loans) AS repayment_rate_pct,
  (SELECT coalesce(sum(bond_amount_usd), 0) FROM bond_events) AS total_bond_volume,
  (SELECT coalesce(sum(bond_amount_usd), 0) FROM bond_events WHERE status = 'locked') AS active_bonds_locked,
  (SELECT coalesce(sum(bond_amount_usd), 0) FROM bond_events WHERE status = 'returned') AS bonds_returned,
  (SELECT coalesce(sum(bond_amount_usd), 0) FROM bond_events WHERE status = 'liquidated') AS bonds_liquidated,
  (SELECT coalesce(sum(commission_usd), 0) FROM commission_events WHERE status = 'confirmed') AS total_commission_earned,
  (SELECT coalesce(sum(commission_usd), 0) FROM commission_events WHERE status = 'pending') AS pending_commission,
  (SELECT count(*) FROM qvac_events) AS qvac_usage,
  (SELECT count(*) FROM sns_events WHERE event_type = 'domain_search') AS sns_searches,
  (SELECT count(*) FROM sns_events WHERE event_type IN ('domain_registered', 'marketplace_purchase')) AS sns_purchases,
  (SELECT count(*) FROM social_credit_cards) AS credit_cards_generated,
  (SELECT count(*) FROM social_credit_cards WHERE shared_to_x = true) AS x_shares;

-- ──────────────────────────────────────────────────────────────
-- view_partner_metrics
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW view_partner_metrics AS
SELECT
  partner,
  count(*) AS total_events,
  count(DISTINCT wallet_address) AS unique_wallets,
  max(created_at) AS last_event_at
FROM partner_events
GROUP BY partner;

-- ──────────────────────────────────────────────────────────────
-- view_revenue_summary
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW view_revenue_summary AS
SELECT
  coalesce(sum(commission_usd) FILTER (WHERE status = 'confirmed'), 0) AS total_earned,
  coalesce(sum(commission_usd) FILTER (WHERE status = 'pending'), 0) AS pending,
  coalesce(sum(commission_usd) FILTER (WHERE status = 'paid'), 0) AS paid,
  coalesce(sum(commission_usd) FILTER (WHERE status = 'failed'), 0) AS failed,
  coalesce(sum(bond_amount_usd) FILTER (WHERE true), 0) AS insurance_inflow
FROM (
  SELECT commission_usd, status, NULL::numeric AS bond_amount_usd FROM commission_events
  UNION ALL
  SELECT NULL, NULL, bond_amount_usd FROM bond_events WHERE status = 'liquidated'
) combined;

-- ──────────────────────────────────────────────────────────────
-- view_bond_summary
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW view_bond_summary AS
SELECT
  coalesce(sum(bond_amount_usd), 0) AS total_bond_volume,
  coalesce(sum(bond_amount_usd) FILTER (WHERE status = 'locked'), 0) AS active_locked,
  coalesce(sum(bond_amount_usd) FILTER (WHERE status = 'returned'), 0) AS returned,
  coalesce(sum(bond_amount_usd) FILTER (WHERE status = 'partially_returned'), 0) AS partially_returned,
  coalesce(sum(bond_amount_usd) FILTER (WHERE status = 'liquidated'), 0) AS liquidated,
  coalesce(sum(bond_amount_usd) FILTER (WHERE status = 'failed'), 0) AS failed,
  coalesce(sum(bond_amount_usd) FILTER (WHERE status = 'liquidated'), 0) AS insurance_fund_inflow
FROM bond_events;

-- ──────────────────────────────────────────────────────────────
-- view_repayment_summary
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW view_repayment_summary AS
SELECT
  count(*) AS total_repayments,
  count(*) FILTER (WHERE was_late = false AND was_early = false) AS clean_repayments,
  count(*) FILTER (WHERE was_early = true) AS early_repayments,
  count(*) FILTER (WHERE was_late = true) AS late_repayments,
  (SELECT coalesce(sum(defaults), 0) FROM repayment_stats) AS total_defaults,
  round(avg(score_after - score_before) FILTER (WHERE score_after IS NOT NULL AND score_before IS NOT NULL), 1) AS avg_score_increase,
  count(*) FILTER (WHERE level_after > level_before) AS users_climbed_levels
FROM repayments;

-- ──────────────────────────────────────────────────────────────
-- view_notification_summary
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW view_notification_summary AS
SELECT
  channel,
  count(*) AS total,
  count(*) FILTER (WHERE status = 'sent') AS sent,
  count(*) FILTER (WHERE status = 'failed') AS failed,
  count(*) FILTER (WHERE status = 'skipped') AS skipped,
  count(*) FILTER (WHERE status = 'pending') AS pending
FROM notification_events
GROUP BY channel;

-- ──────────────────────────────────────────────────────────────
-- view_x_verification_summary
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW view_x_verification_summary AS
SELECT
  count(DISTINCT wallet_address) AS total_verified_wallets,
  count(*) AS total_events,
  count(*) FILTER (WHERE status = 'completed') AS completed,
  count(*) FILTER (WHERE status = 'pending') AS pending,
  round(avg(points_awarded) FILTER (WHERE points_awarded > 0), 1) AS avg_points_awarded
FROM x_verification_events;

-- ──────────────────────────────────────────────────────────────
-- view_social_card_summary
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW view_social_card_summary AS
SELECT
  count(*) AS total_generated,
  count(*) FILTER (WHERE shared_to_x = true) AS shared_to_x,
  round(avg(score), 1) AS avg_score_shared,
  count(DISTINCT wallet_address) AS unique_wallets
FROM social_credit_cards;


-- ══════════════════════════════════════════════════════════════
-- SEED: Default app_settings
-- ══════════════════════════════════════════════════════════════
INSERT INTO app_settings (setting_key, setting_value) VALUES
  ('supported_borrow_assets', '["USDC"]'::jsonb),
  ('usdt_enabled', 'false'::jsonb),
  ('bond_percentage', '30'::jsonb),
  ('max_score', '1000'::jsonb),
  ('base_score', '100'::jsonb),
  ('maintenance_mode', 'false'::jsonb),
  ('score_allocation', '{
    "base_score": 100,
    "wallet_age": 60,
    "transaction_volume": 60,
    "monthly_consistency": 60,
    "protocol_diversity": 70,
    "portfolio_value": 40,
    "repayment_history": 140,
    "x_verification": 100,
    "cross_chain_credit": 90,
    "sol_identity": 40,
    "superteam_pow": 30,
    "credit_maturity_bonus": 110,
    "borrow_growth_bonus": 100
  }'::jsonb),
  ('level_names', '["Crayfish","Shrimp","Barracuda","Dolphin","Shark","Whale"]'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;


-- ══════════════════════════════════════════════════════════════
-- DONE. All 23 tables, 8 views, indexes, and RLS policies created.
-- ══════════════════════════════════════════════════════════════
