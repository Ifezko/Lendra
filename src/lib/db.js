// ─── Lendra Supabase Data Layer ─────────────────────────────────────
// Thin helpers for persisting wallet data to the live database.
// Uses the base (anon) supabase client — all tables have public RLS policies.

import { supabase } from './supabase';

// ── wallet_profiles ─────────────────────────────────────────────────

export async function upsertWalletProfile(wallet, updates = {}) {
  const { data, error } = await supabase
    .from('wallet_profiles')
    .upsert(
      { wallet_address: wallet, ...updates, updated_at: new Date().toISOString() },
      { onConflict: 'wallet_address' }
    )
    .select()
    .single();
  if (error) console.warn('[db] upsertWalletProfile error:', error.message);
  return data;
}

export async function getWalletProfile(wallet) {
  const { data, error } = await supabase
    .from('wallet_profiles')
    .select('*')
    .eq('wallet_address', wallet)
    .maybeSingle();
  if (error) console.warn('[db] getWalletProfile error:', error.message);
  return data;
}

// ── wallet_scans ────────────────────────────────────────────────────

export async function insertWalletScan(scanRow) {
  const { data, error } = await supabase
    .from('wallet_scans')
    .insert(scanRow)
    .select()
    .single();
  if (error) console.warn('[db] insertWalletScan error:', error.message);
  return data;
}

export async function getLatestScan(wallet) {
  const { data, error } = await supabase
    .from('wallet_scans')
    .select('*')
    .eq('wallet_address', wallet)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) console.warn('[db] getLatestScan error:', error.message);
  return data;
}

// ── eligibility_checks ──────────────────────────────────────────────

export async function insertEligibilityCheck(row) {
  const { data, error } = await supabase
    .from('eligibility_checks')
    .insert(row)
    .select()
    .single();
  if (error) console.warn('[db] insertEligibilityCheck error:', error.message);
  return data;
}

// ── loans ───────────────────────────────────────────────────────────

export async function getActiveLoan(wallet) {
  const { data, error } = await supabase
    .from('loans')
    .select('*')
    .eq('wallet_address', wallet)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) console.warn('[db] getActiveLoan error:', error.message);
  return data;
}

export async function createLoan(loanRow) {
  const { data, error } = await supabase
    .from('loans')
    .insert(loanRow)
    .select()
    .single();
  if (error) {
    console.warn('[db] createLoan error:', error.message);
    throw new Error(error.message);
  }
  return data;
}

export async function updateLoan(loanId, updates) {
  const { data, error } = await supabase
    .from('loans')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', loanId)
    .select()
    .single();
  if (error) console.warn('[db] updateLoan error:', error.message);
  return data;
}

export async function getLoanHistory(wallet) {
  const { data, error } = await supabase
    .from('loans')
    .select('*')
    .eq('wallet_address', wallet)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) console.warn('[db] getLoanHistory error:', error.message);
  return data || [];
}

// ── loan_events ─────────────────────────────────────────────────────

export async function insertLoanEvent(row) {
  const { data, error } = await supabase
    .from('loan_events')
    .insert(row)
    .select()
    .single();
  if (error) console.warn('[db] insertLoanEvent error:', error.message);
  return data;
}

// ── bond_events ─────────────────────────────────────────────────────

export async function insertBondEvent(row) {
  const { data, error } = await supabase
    .from('bond_events')
    .insert(row)
    .select()
    .single();
  if (error) console.warn('[db] insertBondEvent error:', error.message);
  return data;
}

export async function updateBondEvent(bondId, updates) {
  const { data, error } = await supabase
    .from('bond_events')
    .update(updates)
    .eq('id', bondId)
    .select()
    .single();
  if (error) console.warn('[db] updateBondEvent error:', error.message);
  return data;
}

// ── repayments ──────────────────────────────────────────────────────

export async function insertRepayment(row) {
  const { data, error } = await supabase
    .from('repayments')
    .insert(row)
    .select()
    .single();
  if (error) console.warn('[db] insertRepayment error:', error.message);
  return data;
}

// ── repayment_stats ─────────────────────────────────────────────────

export async function getRepaymentStats(wallet) {
  const { data, error } = await supabase
    .from('repayment_stats')
    .select('*')
    .eq('wallet_address', wallet)
    .maybeSingle();
  if (error) console.warn('[db] getRepaymentStats error:', error.message);
  return data;
}

export async function upsertRepaymentStats(wallet, updates) {
  const { data, error } = await supabase
    .from('repayment_stats')
    .upsert(
      { wallet_address: wallet, ...updates, updated_at: new Date().toISOString() },
      { onConflict: 'wallet_address' }
    )
    .select()
    .single();
  if (error) console.warn('[db] upsertRepaymentStats error:', error.message);
  return data;
}

// ── notification_events ─────────────────────────────────────────────

export async function getNotifications(wallet, limit = 50) {
  const { data, error } = await supabase
    .from('notification_events')
    .select('*')
    .eq('wallet_address', wallet)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) console.warn('[db] getNotifications error:', error.message);
  return data || [];
}

export async function insertNotification(row) {
  const { data, error } = await supabase
    .from('notification_events')
    .insert(row)
    .select()
    .single();
  if (error) console.warn('[db] insertNotification error:', error.message);
  return data;
}

export async function updateNotification(id, updates) {
  const { error } = await supabase
    .from('notification_events')
    .update(updates)
    .eq('id', id);
  if (error) console.warn('[db] updateNotification error:', error.message);
}

// ── score_change_events ─────────────────────────────────────────────

export async function insertScoreChangeEvent(row) {
  const { data, error } = await supabase
    .from('score_change_events')
    .insert(row)
    .select()
    .single();
  if (error) console.warn('[db] insertScoreChangeEvent error:', error.message);
  return data;
}

// ── partner_events ──────────────────────────────────────────────────

export async function insertPartnerEvent(row) {
  const { data, error } = await supabase
    .from('partner_events')
    .insert(row)
    .select()
    .single();
  if (error) console.warn('[db] insertPartnerEvent error:', error.message);
  return data;
}

export async function getPartnerEvents(wallet, partner) {
  const { data, error } = await supabase
    .from('partner_events')
    .select('*')
    .eq('wallet_address', wallet)
    .eq('partner', partner)
    .order('created_at', { ascending: false });
  if (error) console.warn('[db] getPartnerEvents error:', error.message);
  return data || [];
}

// ── social_credit_cards ─────────────────────────────────────────────

export async function insertSocialCard(row) {
  const { data, error } = await supabase
    .from('social_credit_cards')
    .insert(row)
    .select()
    .single();
  if (error) console.warn('[db] insertSocialCard error:', error.message);
  return data;
}

// ── qvac_events ─────────────────────────────────────────────────────

export async function insertQvacEvent(row) {
  const { data, error } = await supabase
    .from('qvac_events')
    .insert(row)
    .select()
    .single();
  if (error) console.warn('[db] insertQvacEvent error:', error.message);
  return data;
}
