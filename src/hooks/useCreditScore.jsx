import { useState, useCallback, useRef } from 'react';
import { QUICKNODE_RPC, PROXY_API } from '../config';
import {
  upsertWalletProfile,
  insertWalletScan,
  insertEligibilityCheck,
  getRepaymentStats,
  getLatestScan,
  insertScoreChangeEvent,
} from '../lib/db';

async function rpcCall(method, params = []) {
  const response = await fetch(QUICKNODE_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!response.ok) throw new Error(`RPC failed: ${response.status}`);
  const data = await response.json();
  if (data.error) throw new Error(data.error.message || 'RPC error');
  return data.result;
}

async function getSolPrice() {
  try {
    const res = await fetch(
      PROXY_API('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd')
    );
    const data = await res.json();
    return data?.solana?.usd || 0;
  } catch {
    return 0;
  }
}

// ─── Score allocation (base 100, max 1000) ───────────────────────
export const BASE_SCORE = 100;
export const MAX_SCORE = 1000;

export const SCORE_FACTORS = {
  age: { max: 60, label: 'Wallet Age' },
  volume: { max: 60, label: 'Transaction Volume' },
  consistency: { max: 60, label: 'Monthly Consistency' },
  diversity: { max: 70, label: 'Protocol Diversity' },
  portfolio: { max: 40, label: 'Portfolio Value' },
  repayment: { max: 140, label: 'Repayment History' },
  xVerification: { max: 100, label: 'X Verification' },
  crossChain: { max: 90, label: 'Cross-Chain Credit' },
  solIdentity: { max: 40, label: '.sol Identity' },
  superteam: { max: 30, label: 'Superteam PoW' },
  creditMaturity: { max: 110, label: 'Credit Maturity Bonus' },
  borrowGrowth: { max: 100, label: 'Borrow Growth Bonus' },
};

export function getTier(score) {
  if (score >= 725) return { label: 'Diamond', color: '#EC81FF' };
  if (score >= 650) return { label: 'Platinum', color: '#C0C0E0' };
  if (score >= 575) return { label: 'Gold', color: '#FFD881' };
  if (score >= 500) return { label: 'Silver', color: '#81D4FF' };
  if (score >= 430) return { label: 'Bronze', color: '#CD7F32' };
  return { label: 'Starter', color: '#FF8181' };
}

// Fixed loan fee schedule: FEE_SCHEDULE[level][termDays] = fee percentage
export const FEE_SCHEDULE = {
  1: { 7: 9, 14: 15, 30: 25 },   // Starter
  2: { 7: 8, 14: 14, 30: 23 },   // Bronze
  3: { 7: 7, 14: 12, 30: 20 },   // Silver
  4: { 7: 6, 14: 10, 30: 17 },   // Gold
  5: { 7: 5, 14: 8, 30: 14 },    // Platinum
  6: { 7: 4, 14: 6, 30: 10 },    // Diamond
};

export function getLoanFee(level, termDays) {
  const schedule = FEE_SCHEDULE[level] || FEE_SCHEDULE[1];
  return schedule[termDays] || schedule[14];
}

export const LOAN_LEVELS = [
  { level: 1, amount: 10, minScore: 350, repayments: 0, spendGate: 5, label: 'Starter' },
  { level: 2, amount: 25, minScore: 430, repayments: 1, spendGate: 15, label: 'Bronze' },
  { level: 3, amount: 50, minScore: 500, repayments: 2, spendGate: 15, label: 'Silver' },
  { level: 4, amount: 100, minScore: 575, repayments: 3, spendGate: 30, label: 'Gold' },
  { level: 5, amount: 200, minScore: 650, repayments: 4, spendGate: 75, label: 'Platinum', requiresX: true },
  { level: 6, amount: 400, minScore: 725, repayments: 5, spendGate: 200, label: 'Diamond', requiresX: true },
];

export const CREDIT_MATURITY_BONUSES = { 3: 20, 4: 25, 5: 30, 6: 35 };

export function getLoanLevel(score, cleanRepayments = 0, hasXVerification = false) {
  let current = { level: 0, amount: 0, spendGate: 5, label: 'None', next: LOAN_LEVELS[0] };
  for (let i = LOAN_LEVELS.length - 1; i >= 0; i--) {
    const lvl = LOAN_LEVELS[i];
    if (score >= lvl.minScore && cleanRepayments >= lvl.repayments) {
      if (lvl.requiresX && !hasXVerification) continue;
      current = { ...lvl, next: LOAN_LEVELS[i + 1] || null };
      break;
    }
  }
  if (current.level === 0) current.next = LOAN_LEVELS[0];
  return current;
}

/** Returns whether the user meets the spend gate for their current loan level. */
export function meetsSpendGate(loanLevel, spend90d) {
  if (loanLevel.level === 0) return spend90d >= (LOAN_LEVELS[0].spendGate || 5);
  return spend90d >= (loanLevel.spendGate || 5);
}

/** Returns the effective spend gate dollar amount for a given loan level object. */
export function getSpendGateAmount(loanLevel) {
  if (!loanLevel || loanLevel.level === 0) return LOAN_LEVELS[0].spendGate;
  return loanLevel.spendGate || 5;
}

export function calculateRepaymentScore(cleanRepayments, earlyRepayments = 0, lateRepayments = 0, hasDefault = false) {
  if (hasDefault) return 0;
  const base = Math.min(cleanRepayments * 25, 140);
  const earlyBonus = Math.min(earlyRepayments * 5, 20);
  const latePenalty = lateRepayments * 15;
  return Math.max(0, Math.min(140, base + earlyBonus - latePenalty));
}

export function calculateCreditMaturityBonus(level) {
  let total = 0;
  for (const [lvl, bonus] of Object.entries(CREDIT_MATURITY_BONUSES)) {
    if (level >= parseInt(lvl)) total += bonus;
  }
  return Math.min(110, total);
}

export function calculateBorrowGrowthBonus(qualifyingRepayments) {
  return Math.min(100, qualifyingRepayments * 5);
}

export function calculateBond(loanAmount) {
  return Math.round(loanAmount * 0.30 * 100) / 100;
}

export function useCreditScore() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scoreData, setScoreData] = useState(null);
  const previousScanRef = useRef(null);

  const computeScore = useCallback(async (publicKeyStr) => {
    setLoading(true);
    setError(null);
    setScoreData(null);

    try {
      // Fetch repayment stats and previous scan from DB (non-blocking)
      let repStats = null;
      try { repStats = await getRepaymentStats(publicKeyStr); } catch { /* non-critical */ }
      try { previousScanRef.current = await getLatestScan(publicKeyStr); } catch { /* non-critical */ }

      const solPrice = await getSolPrice();

      const balanceResult = await rpcCall('getBalance', [publicKeyStr, { commitment: 'confirmed' }]);
      const balanceLamports = balanceResult?.value ?? 0;
      const balanceSol = balanceLamports / 1e9;
      const balanceUsd = balanceSol * solPrice;

      const signatures = await rpcCall('getSignaturesForAddress', [
        publicKeyStr,
        { limit: 1000, commitment: 'confirmed' },
      ]);
      const txCount = signatures?.length || 0;

      const emptyBreakdown = {
        age: 0, volume: 0, consistency: 0, diversity: 0, portfolio: 0,
        repayment: 0, xVerification: 0, crossChain: 0, solIdentity: 0, superteam: 0,
        creditMaturity: 0, borrowGrowth: 0,
      };

      if (txCount === 0) {
        const result = {
          score: BASE_SCORE, tier: getTier(BASE_SCORE), loanLevel: getLoanLevel(BASE_SCORE, 0),
          walletAgeDays: 0, txCount: 0, monthlyActivity: 0, protocolCount: 0,
          balanceUsd, spend90d: 0, canBorrow: false, cleanRepayments: 0, breakdown: emptyBreakdown,
        };
        setScoreData(result);
        persistScan(publicKeyStr, result, repStats, previousScanRef.current);
        setLoading(false);
        return;
      }

      const oldestTx = signatures[signatures.length - 1];
      const oldestTime = oldestTx?.blockTime ? oldestTx.blockTime * 1000 : Date.now();
      const walletAgeDays = Math.floor((Date.now() - oldestTime) / (1000 * 60 * 60 * 24));

      const monthSet = new Set();
      const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
      let recentTxCount = 0;
      signatures.forEach((sig) => {
        if (sig.blockTime) {
          const d = new Date(sig.blockTime * 1000);
          monthSet.add(`${d.getFullYear()}-${d.getMonth()}`);
          if (sig.blockTime * 1000 >= ninetyDaysAgo) recentTxCount++;
        }
      });
      const monthlyActivity = monthSet.size;
      const estimatedSpend90d = recentTxCount * 0.015 * solPrice;

      const programSet = new Set();
      try {
        const sampleSigs = signatures.slice(0, 50);
        for (let i = 0; i < Math.min(20, sampleSigs.length); i++) {
          const txResult = await rpcCall('getTransaction', [
            sampleSigs[i].signature,
            { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0, commitment: 'confirmed' },
          ]);
          if (txResult?.transaction?.message?.accountKeys) {
            txResult.transaction.message.accountKeys.forEach((key) => {
              const addr = typeof key === 'string' ? key : key?.pubkey;
              if (addr && addr !== publicKeyStr && addr !== '11111111111111111111111111111111') {
                programSet.add(addr);
              }
            });
          }
        }
      } catch (e) { /* fallback */ }

      const protocolCount = Math.min(programSet.size, 50);

      // Activity signals
      const ageScore = Math.min(60, Math.floor((walletAgeDays / 365) * 60));
      const volumeScore = Math.min(60, Math.floor((txCount / 500) * 60));
      const consistencyScore = Math.min(60, Math.floor((monthlyActivity / 12) * 60));
      const diversityScore = Math.min(70, Math.floor((protocolCount / 15) * 70));
      const portfolioScore = Math.min(40, Math.floor((balanceUsd / 5000) * 40));

      // Trust signals from DB repayment stats
      const cleanRepayments = repStats?.clean_repayments || 0;
      const earlyRepayments = repStats?.early_repayments || 0;
      const lateRepayments = repStats?.late_repayments || 0;
      const hasDefault = (repStats?.defaults || 0) > 0;
      const currentLevel = repStats?.current_level || 0;
      const qualifyingReps = repStats?.qualifying_higher_borrow_repayments || 0;

      const repaymentScore = calculateRepaymentScore(cleanRepayments, earlyRepayments, lateRepayments, hasDefault);
      const creditMaturityScore = calculateCreditMaturityBonus(currentLevel);
      const borrowGrowthScore = calculateBorrowGrowthBonus(qualifyingReps);

      // These remain 0 until boosted by external hooks (X verification, cross-chain, etc.)
      const xVerificationScore = 0;
      const crossChainScore = 0;
      const solIdentityScore = 0;
      const superteamScore = 0;

      const totalScore = Math.min(MAX_SCORE, BASE_SCORE +
        ageScore + volumeScore + consistencyScore + diversityScore + portfolioScore +
        repaymentScore + xVerificationScore + crossChainScore + solIdentityScore + superteamScore +
        creditMaturityScore + borrowGrowthScore
      );

      const loanLevel = getLoanLevel(totalScore, cleanRepayments);
      const canBorrow = totalScore >= 350 && meetsSpendGate(loanLevel, estimatedSpend90d);

      const result = {
        score: totalScore, tier: getTier(totalScore),
        loanLevel,
        walletAgeDays, txCount, monthlyActivity, protocolCount,
        balanceUsd, spend90d: estimatedSpend90d, canBorrow, cleanRepayments,
        breakdown: {
          age: ageScore, volume: volumeScore, consistency: consistencyScore,
          diversity: diversityScore, portfolio: portfolioScore,
          repayment: repaymentScore, xVerification: xVerificationScore,
          crossChain: crossChainScore, solIdentity: solIdentityScore, superteam: superteamScore,
          creditMaturity: creditMaturityScore, borrowGrowth: borrowGrowthScore,
        },
      };

      setScoreData(result);
      // Persist to Supabase (fire-and-forget)
      persistScan(publicKeyStr, result, repStats, previousScanRef.current);
    } catch (err) {
      console.error('Credit score computation error:', err);
      setError(err.message || 'Failed to compute credit score');
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, scoreData, computeScore };
}

// ─── Persist scan results to Supabase (non-blocking) ────────────
async function persistScan(wallet, result, repStats, prevScan) {
  try {
    const { score, tier, loanLevel, walletAgeDays, txCount, monthlyActivity,
      protocolCount, balanceUsd, spend90d, canBorrow, breakdown } = result;

    const scanRow = {
      wallet_address: wallet,
      score,
      max_score: MAX_SCORE,
      tier: tier.label,
      loan_level: loanLevel.level,
      level_name: loanLevel.label,
      eligible: canBorrow,
      eligibility_status: canBorrow ? 'eligible' : 'not_eligible',
      base_score: BASE_SCORE,
      wallet_age_points: breakdown.age,
      transaction_volume_points: breakdown.volume,
      monthly_consistency_points: breakdown.consistency,
      protocol_diversity_points: breakdown.diversity,
      portfolio_value_points: breakdown.portfolio,
      repayment_history_points: breakdown.repayment,
      x_verification_points: breakdown.xVerification,
      cross_chain_credit_points: breakdown.crossChain,
      sol_identity_points: breakdown.solIdentity,
      superteam_pow_points: breakdown.superteam,
      credit_maturity_points: breakdown.creditMaturity,
      borrow_growth_points: breakdown.borrowGrowth,
      wallet_age_days: walletAgeDays,
      total_transactions: txCount,
      avg_monthly_transactions: monthlyActivity > 0 ? Math.round(txCount / monthlyActivity) : 0,
      unique_protocols: protocolCount,
      recent_spend_90d: Math.round(spend90d * 100) / 100,
      portfolio_value_usd: Math.round(balanceUsd * 100) / 100,
    };

    const scan = await insertWalletScan(scanRow);

    // Eligibility check
    if (scan) {
      insertEligibilityCheck({
        wallet_address: wallet,
        scan_id: scan.id,
        score_passed: score >= 350,
        spend_gate_passed: spend90d >= (loanLevel.spendGate || 5),
        active_loan_gate_passed: true,
        repayment_requirement_passed: (repStats?.clean_repayments || 0) >= (loanLevel.repayments || 0),
        level_requirement_passed: true,
        eligible_level: loanLevel.level,
        eligible_level_name: loanLevel.label,
        eligible_amount: loanLevel.amount,
        borrow_asset: 'USDC',
      }).catch(() => {});
    }

    // Upsert wallet profile
    upsertWalletProfile(wallet).catch(() => {});

    // Track score change if previous scan exists
    if (prevScan && prevScan.score !== score) {
      insertScoreChangeEvent({
        wallet_address: wallet,
        previous_score: prevScan.score,
        new_score: score,
        score_delta: score - prevScan.score,
        previous_level: prevScan.loan_level,
        new_level: loanLevel.level,
        previous_eligible: prevScan.eligible,
        new_eligible: canBorrow,
        reason: 'wallet_scan',
        trigger_event: 'compute_score',
      }).catch(() => {});
    }
  } catch (err) {
    console.warn('[persistScan] error:', err.message || err);
  }
}
