import { useState, useCallback, useRef } from 'react';
import { API_BASE_URL } from '../config';

// ??? Score allocation (base 100, max 1000) ???????????????????????
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
  const inFlightRef = useRef(null);

  const computeScore = useCallback(async (publicKeyStr) => {
    if (!publicKeyStr) return;
    // Collapse duplicate/concurrent scans for the same wallet (avoids RPC 429s).
    if (inFlightRef.current === publicKeyStr) return;
    inFlightRef.current = publicKeyStr;
    setLoading(true);
    setError(null);
    setScoreData(null);

    try {
      // Call the server-side scan endpoint - handles RPC, scoring, and DB persistence
      const scanUrl = API_BASE_URL
        ? `${API_BASE_URL}/api/score/scan`
        : '/api/score/scan';

      const response = await fetch(scanUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: publicKeyStr }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Wallet scan failed (${response.status})`);
      }

      const json = await response.json();
      if (!json.ok || !json.data) {
        throw new Error(json.error || 'Scan returned no data');
      }

      setScoreData(json.data);
    } catch (err) {
      console.error('Credit score computation error:', err);
      setError(err.message || 'Failed to compute credit score');
    } finally {
      setLoading(false);
      inFlightRef.current = null;
    }
  }, []);

  return { loading, error, scoreData, computeScore };
}


