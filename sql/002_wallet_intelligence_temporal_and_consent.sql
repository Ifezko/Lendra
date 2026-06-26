-- 002_wallet_intelligence_temporal_and_consent.sql
-- Wallet Intelligence temporal layer (PRD §5.6.8, §7) + consent scaffolding (§11.3.1).
-- Applied to the live project via Supabase MCP on the claude/zealous-cannon-6otc74 branch.
--
-- Guardrails encoded here:
--   * Deep-pass / lifetime fields are DISPLAY-ONLY and must never feed the score
--     (§7.1 stays recency-anchored).
--   * Consent tables are Wave-4 SCAFFOLD ONLY (default-deny gate; no partner UX).
--   * portfolio_snapshots / consent_grants / partner_access_log get RLS enabled
--     with NO policies, so only the service role (server) can read them — raw
--     balance time-series and consent data never leave the backend (§11.3).
--
-- NOTE: the §11.3.1.6 spec table was unavailable when this was authored; the
-- consent_grants / partner_access_log column shapes are inferred and should be
-- reconciled against the spec when provided.

-- §7 / §7.2: tie each persisted score to a frozen scoring-config version and
-- record the scan window so the deep pass can never be mistaken for a score input.
alter table public.wallet_scans
  add column if not exists score_version text,
  add column if not exists scan_window text default '90d';

-- §5.6.8.7 deep pass (wallet creation -> now): cached lifetime/history snapshot.
alter table public.wallet_profiles
  add column if not exists first_tx_at timestamptz,
  add column if not exists history_scanned_at timestamptz,
  add column if not exists history_complete boolean default false,
  add column if not exists lifetime_tx_count integer,
  add column if not exists active_months integer,
  add column if not exists total_months integer,
  add column if not exists unverified_activity_count integer,
  add column if not exists liquidity_floor_usd numeric,
  add column if not exists liquidity_floor_days integer;

-- §5.6.8.3 balance history (server-side only).
create table if not exists public.portfolio_snapshots (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  captured_at timestamptz not null default now(),
  sol_balance numeric,
  usdc_balance numeric,
  usdt_balance numeric,
  total_usd numeric,
  source text default 'scan',            -- 'scan' (fast) | 'deep_pass'
  created_at timestamptz default now()
);
create index if not exists idx_portfolio_snapshots_wallet
  on public.portfolio_snapshots (wallet_address, captured_at desc);
alter table public.portfolio_snapshots enable row level security;

-- ===== §11.3.1 SCAFFOLD ONLY (Wave 4): tables + default-deny gate. =====
create table if not exists public.consent_grants (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  partner_id text not null,
  scopes text[] not null default '{}',
  status text not null default 'active',  -- 'active' | 'revoked' | 'expired'
  granted_at timestamptz default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_consent_grants_lookup
  on public.consent_grants (wallet_address, partner_id, status);
alter table public.consent_grants enable row level security;

create table if not exists public.partner_access_log (
  id uuid primary key default gen_random_uuid(),
  partner_id text,
  wallet_address text,
  grant_id uuid references public.consent_grants(id),
  endpoint text,
  fields_returned text[],
  result text,                            -- 'granted' | 'denied_no_consent' | 'denied_revoked'
  ip text,
  created_at timestamptz default now()
);
create index if not exists idx_partner_access_log_partner
  on public.partner_access_log (partner_id, created_at desc);
alter table public.partner_access_log enable row level security;
