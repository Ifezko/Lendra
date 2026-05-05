import React from 'react';
import { motion } from 'framer-motion';
import { Lock, DollarSign, Layers, Hash, RefreshCw, Globe } from 'lucide-react';
import { SCORE_FACTORS } from '../hooks/useCreditScore';

function XIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const STEPS = [
  {
    icon: DollarSign,
    title: 'Spend at least $30 on-chain in the last 90 days',
    desc: 'Swap tokens, mint NFTs, or use DeFi protocols to build spending history.',
    pts: null,
    required: true,
  },
  {
    icon: Layers,
    title: 'Interact with more Solana protocols',
    desc: 'Use Jupiter, Raydium, Marinade, Tensor, or other popular dApps.',
    pts: `Up to +${SCORE_FACTORS.diversity.max} pts`,
    required: false,
  },
  {
    icon: Hash,
    title: 'Register a .sol domain via SNS.id',
    desc: 'Claim your on-chain identity to earn trust signals.',
    pts: `+${SCORE_FACTORS.solIdentity.max} pts`,
    required: false,
  },
  {
    icon: XIcon,
    title: 'Verify your X account',
    desc: 'Link your social presence to verify your wallet identity.',
    pts: `+${SCORE_FACTORS.xVerification.max} pts`,
    required: false,
  },
  {
    icon: RefreshCw,
    title: 'Build repayment history',
    desc: 'Borrow and repay on time. Each clean repayment increases your score and loan level.',
    pts: `Up to +${SCORE_FACTORS.repayment.max} pts`,
    required: false,
  },
  {
    icon: Globe,
    title: 'Import cross-chain credit via Ika',
    desc: 'Connect EVM / BTC wallets to carry your reputation forward.',
    pts: `Up to +${SCORE_FACTORS.crossChain.max} pts`,
    required: false,
  },
];

export default function UnlockGuidance({ spend90d, score }) {
  const needsSpend = spend90d < 30;
  const needsScore = score < 350;

  return (
    <motion.div
      className="bg-brand-card rounded-2xl border border-brand-border p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
          <Lock className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Borrowing Locked</h3>
          <p className="text-sm text-brand-muted">
            {needsScore && needsSpend
              ? 'Score below 350 and insufficient on-chain spend'
              : needsScore
              ? 'Score needs to be at least 350'
              : 'Need at least $30 in on-chain spend (last 90 days)'}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isCompleted =
            (step.required && !needsSpend) ||
            false;

          return (
            <motion.div
              key={i}
              className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                isCompleted
                  ? 'border-green-500/20 bg-green-500/5'
                  : 'border-brand-border bg-brand-bg/50 hover:bg-brand-cardHover'
              }`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * i }}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  isCompleted ? 'bg-green-500/20' : 'bg-brand-accent/10'
                }`}
              >
                <Icon className={`w-4 h-4 ${isCompleted ? 'text-green-400' : 'text-brand-accent'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm font-semibold ${isCompleted ? 'text-green-300' : 'text-white'}`}>
                    {step.title}
                  </p>
                  {step.pts && (
                    <span className="text-xs font-bold text-brand-accent whitespace-nowrap">{step.pts}</span>
                  )}
                  {step.required && (
                    <span className="text-xs font-bold text-red-400 whitespace-nowrap">Required</span>
                  )}
                </div>
                <p className="text-xs text-brand-muted mt-0.5">{step.desc}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-5 p-3 rounded-xl bg-brand-accent/5 border border-brand-accent/20">
        <p className="text-xs text-brand-muted text-center">
          Current 90-day spend: <span className="font-bold text-brand-accent">${spend90d.toFixed(2)}</span>
          {needsSpend && (
            <span className="text-red-400"> — need ${(30 - spend90d).toFixed(2)} more</span>
          )}
        </p>
      </div>
    </motion.div>
  );
}
