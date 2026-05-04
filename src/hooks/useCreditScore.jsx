import { useState, useCallback } from 'react';
import { QUICKNODE_RPC, PROXY_API } from '../config';

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

// ─── Score allocation (base 200, max 870) ───────────────────────
export const BASE_SCORE = 200;
export const MAX_SCORE = 870;

export const SCORE_FACTORS = {
  age: { max: 60, label: 'Wallet Age' },
  volume: { max: 60, label: 'Transaction Volume' },
  consistency: { max: 60, label: 'Monthly Consistency' },
  diversity: { max: 70, label: 'Protocol Diversity' },
  portfolio: { max: 40, label: 'Portfolio Value' },
  repayment: { max: 140, label: 'Repayment History' },
  xVerification: { max: 80, label: 'X Verification' },
  crossChain: { max: 90, label: 'Cross-Chain Credit' },
  solIdentity: { max: 40, label: '.sol Identity' },
  superteam: { max: 30, label: 'Superteam PoW' },
};

export function getTier(score) {
  if (score >= 750) return { label: 'Elite', color: '#EC81FF', emoji: '👑' };
  if (score >= 650) return { label: 'Excellent', color: '#EC81FF', emoji: '🌟' };
  if (score >= 500) return { label: 'Good', color: '#81D4FF', emoji: '✅' };
  if (score >= 350) return { label: 'Fair', color: '#FFD881', emoji: '⚠️' };
  return { label: 'Poor', color: '#FF8181', emoji: '🔴' };
}

export const LOAN_LEVELS = [
  { level: 1, amount: 10, minScore: 350, repayments: 0, label: 'Starter' },
  { level: 2, amount: 25, minScore: 430, repayments: 1, label: 'Bronze' },
  { level: 3, amount: 50, minScore: 500, repayments: 2, label: 'Silver' },
  { level: 4, amount: 100, minScore: 575, repayments: 3, label: 'Gold' },
  { level: 5, amount: 200, minScore: 650, repayments: 4, label: 'Platinum' },
  { level: 6, amount: 400, minScore: 725, repayments: 5, label: 'Diamond' },
];

export function getLoanLevel(score, cleanRepayments = 0) {
  let current = { level: 0, amount: 0, label: 'None', next: LOAN_LEVELS[0] };
  for (let i = LOAN_LEVELS.length - 1; i >= 0; i--) {
    const lvl = LOAN_LEVELS[i];
    if (score >= lvl.minScore && cleanRepayments >= lvl.repayments) {
      current = { ...lvl, next: LOAN_LEVELS[i + 1] || null };
      break;
    }
  }
  if (current.level === 0) current.next = LOAN_LEVELS[0];
  return current;
}

export function calculateBond(loanAmount) {
  return Math.round(loanAmount * 0.30 * 100) / 100;
}

export function useCreditScore() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scoreData, setScoreData] = useState(null);

  const computeScore = useCallback(async (publicKeyStr) => {
    setLoading(true);
    setError(null);
    setScoreData(null);

    try {
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
      };

      if (txCount === 0) {
        setScoreData({
          score: BASE_SCORE, tier: getTier(BASE_SCORE), loanLevel: getLoanLevel(BASE_SCORE, 0),
          walletAgeDays: 0, txCount: 0, monthlyActivity: 0, protocolCount: 0,
          balanceUsd, spend90d: 0, canBorrow: false, cleanRepayments: 0, breakdown: emptyBreakdown,
        });
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

      // Trust signals — defaults; boosted by external hooks
      const repaymentScore = 0;
      const xVerificationScore = 0;
      const crossChainScore = 0;
      const solIdentityScore = 0;
      const superteamScore = 0;

      const totalScore = Math.min(MAX_SCORE, BASE_SCORE +
        ageScore + volumeScore + consistencyScore + diversityScore + portfolioScore +
        repaymentScore + xVerificationScore + crossChainScore + solIdentityScore + superteamScore
      );

      const cleanRepayments = 0;
      const canBorrow = totalScore >= 350 && estimatedSpend90d >= 50;

      setScoreData({
        score: totalScore, tier: getTier(totalScore),
        loanLevel: getLoanLevel(totalScore, cleanRepayments),
        walletAgeDays, txCount, monthlyActivity, protocolCount,
        balanceUsd, spend90d: estimatedSpend90d, canBorrow, cleanRepayments,
        breakdown: {
          age: ageScore, volume: volumeScore, consistency: consistencyScore,
          diversity: diversityScore, portfolio: portfolioScore,
          repayment: repaymentScore, xVerification: xVerificationScore,
          crossChain: crossChainScore, solIdentity: solIdentityScore, superteam: superteamScore,
        },
      });
    } catch (err) {
      console.error('Credit score computation error:', err);
      setError(err.message || 'Failed to compute credit score');
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, scoreData, computeScore };
}
