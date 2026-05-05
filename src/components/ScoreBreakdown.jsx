import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Zap, Calendar, Layers, Wallet, RefreshCw, CheckSquare, Globe, Hash, Award, TrendingUp, Star } from 'lucide-react';
import { SCORE_FACTORS, BASE_SCORE } from '../hooks/useCreditScore';

const FACTORS = [
  { key: 'age', label: SCORE_FACTORS.age.label, max: SCORE_FACTORS.age.max, icon: Clock, desc: 'Days since first transaction', group: 'activity' },
  { key: 'volume', label: SCORE_FACTORS.volume.label, max: SCORE_FACTORS.volume.max, icon: Zap, desc: 'Total transactions processed', group: 'activity' },
  { key: 'consistency', label: SCORE_FACTORS.consistency.label, max: SCORE_FACTORS.consistency.max, icon: Calendar, desc: 'Active months on-chain', group: 'activity' },
  { key: 'diversity', label: SCORE_FACTORS.diversity.label, max: SCORE_FACTORS.diversity.max, icon: Layers, desc: 'Unique protocols used', group: 'activity' },
  { key: 'portfolio', label: SCORE_FACTORS.portfolio.label, max: SCORE_FACTORS.portfolio.max, icon: Wallet, desc: 'Current holdings in USD', group: 'activity' },
  { key: 'repayment', label: SCORE_FACTORS.repayment.label, max: SCORE_FACTORS.repayment.max, icon: RefreshCw, desc: 'On-time repayments on Lendra', group: 'trust' },
  { key: 'xVerification', label: SCORE_FACTORS.xVerification.label, max: SCORE_FACTORS.xVerification.max, icon: CheckSquare, desc: 'Verified X account via OAuth', group: 'trust' },
  { key: 'crossChain', label: SCORE_FACTORS.crossChain.label, max: SCORE_FACTORS.crossChain.max, icon: Globe, desc: 'EVM / BTC wallet credit via Ika', group: 'trust' },
  { key: 'solIdentity', label: SCORE_FACTORS.solIdentity.label, max: SCORE_FACTORS.solIdentity.max, icon: Hash, desc: 'SNS.id .sol domain linked', group: 'trust' },
  { key: 'superteam', label: SCORE_FACTORS.superteam.label, max: SCORE_FACTORS.superteam.max, icon: Award, desc: 'Superteam proof-of-work verified', group: 'trust' },
  { key: 'creditMaturity', label: SCORE_FACTORS.creditMaturity.label, max: SCORE_FACTORS.creditMaturity.max, icon: Star, desc: 'Awarded as you climb levels', group: 'growth' },
  { key: 'borrowGrowth', label: SCORE_FACTORS.borrowGrowth.label, max: SCORE_FACTORS.borrowGrowth.max, icon: TrendingUp, desc: 'Earned by repaying higher loan amounts', group: 'growth' },
];

export default function ScoreBreakdown({ breakdown, walletAgeDays, txCount, monthlyActivity, protocolCount, balanceUsd }) {
  const stats = {
    age: `${walletAgeDays}d`,
    volume: `${txCount} txs`,
    consistency: `${monthlyActivity} mo`,
    diversity: `${protocolCount}`,
    portfolio: `${balanceUsd.toFixed(0)}`,
    repayment: breakdown.repayment > 0 ? `+${breakdown.repayment}` : '—',
    xVerification: breakdown.xVerification > 0 ? 'Verified' : '—',
    crossChain: breakdown.crossChain > 0 ? `+${breakdown.crossChain}` : '—',
    solIdentity: breakdown.solIdentity > 0 ? 'Linked' : '—',
    superteam: breakdown.superteam > 0 ? 'Verified' : '—',
    creditMaturity: breakdown.creditMaturity > 0 ? `+${breakdown.creditMaturity}` : '—',
    borrowGrowth: breakdown.borrowGrowth > 0 ? `+${breakdown.borrowGrowth}` : '—',
  };

  const activityFactors = FACTORS.filter((f) => f.group === 'activity');
  const trustFactors = FACTORS.filter((f) => f.group === 'trust');
  const growthFactors = FACTORS.filter((f) => f.group === 'growth');

  const renderFactor = (factor, i) => {
    const value = breakdown[factor.key] || 0;
    const pct = factor.max > 0 ? (value / factor.max) * 100 : 0;
    const Icon = factor.icon;

    return (
      <motion.div
        key={factor.key}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 * i, duration: 0.4 }}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-brand-accent" />
            <span className="text-sm font-medium text-brand-text">{factor.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-brand-muted">{stats[factor.key]}</span>
            <span className="text-xs font-semibold text-brand-accent">
              +{value}/{factor.max}
            </span>
          </div>
        </div>
        <div className="h-2 bg-brand-border rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: factor.group === 'trust' ? 'linear-gradient(90deg, #81D4FF, #4FA8CC)' : factor.group === 'growth' ? 'linear-gradient(90deg, #FFD881, #E8A820)' : 'linear-gradient(90deg, #EC81FF, #B84FCC)' }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ delay: 0.2 + 0.1 * i, duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <p className="text-xs text-brand-muted mt-1">{factor.desc}</p>
      </motion.div>
    );
  };

  return (
    <div className="bg-brand-card rounded-2xl border border-brand-border p-6">
      <h3 className="text-lg font-bold text-white mb-1">Score Breakdown</h3>
      <p className="text-xs text-brand-muted mb-5">Base: +{BASE_SCORE} | Wallet Activity | Earned Trust Signals</p>

      <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-3">Wallet Activity</p>
      <div className="space-y-4 mb-6">
        {activityFactors.map((f, i) => renderFactor(f, i))}
      </div>

      <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-3">Earned Trust Signals</p>
      <div className="space-y-4 mb-6">
        {trustFactors.map((f, i) => renderFactor(f, i + activityFactors.length))}
      </div>

      <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-3">Growth Bonuses</p>
      <div className="space-y-4">
        {growthFactors.map((f, i) => renderFactor(f, i + activityFactors.length + trustFactors.length))}
      </div>
    </div>
  );
}
