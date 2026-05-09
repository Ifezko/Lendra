import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Sparkles, Globe, ArrowUpRight, RefreshCw, Award, Hash, CheckCircle } from 'lucide-react';
import { SCORE_FACTORS } from '../hooks/useCreditScore';
import { useXAccount } from '../hooks/useXAccount';

function XIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const BOOSTS = [
  {
    key: 'repayment',
    label: 'Repay Loans On-Time',
    desc: 'Each clean repayment earns trust and unlocks higher loan levels.',
    pts: SCORE_FACTORS.repayment.max,
    icon: RefreshCw,
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-400',
    action: { type: 'link', to: '/borrow', label: 'Borrow now' },
  },
  {
    key: 'xVerification',
    label: 'Verify X Account',
    desc: 'Link your X (Twitter) account to prove identity.',
    pts: SCORE_FACTORS.xVerification.max,
    icon: XIcon,
    iconBg: 'bg-gray-700/30',
    iconColor: 'text-white',
    action: { type: 'x_connect' },
  },
  {
    key: 'crossChain',
    label: 'Cross-Chain Credit (Ika)',
    desc: 'Import EVM / BTC wallet reputation for a cross-chain boost.',
    pts: SCORE_FACTORS.crossChain.max,
    icon: Globe,
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
    action: { type: 'link', to: '/trust-score', label: 'Connect wallets' },
  },
  {
    key: 'solIdentity',
    label: 'Link a .sol Domain',
    desc: 'Claim your on-chain identity via SNS.id.',
    pts: SCORE_FACTORS.solIdentity.max,
    icon: Hash,
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-400',
    action: { type: 'external', href: 'https://sns.id', label: 'Get .sol' },
  },
  {
    key: 'superteam',
    label: 'Superteam Proof-of-Work',
    desc: 'Verified Superteam contributors get an additional trust signal.',
    pts: SCORE_FACTORS.superteam.max,
    icon: Award,
    iconBg: 'bg-yellow-500/10',
    iconColor: 'text-yellow-400',
    action: { type: 'soon' },
  },
];

export default function BoostCard() {
  const xAccount = useXAccount();
  const xIsConnected = xAccount.connected;

  return (
    <motion.div
      className="bg-brand-card rounded-2xl border border-brand-border p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-brand-accent" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Boost Your Score</h3>
          <p className="text-sm text-brand-muted">Trust signals that unlock higher borrowing</p>
        </div>
      </div>

      <div className="space-y-3">
        {BOOSTS.map((boost) => {
          const Icon = boost.icon;
          const isXBoost = boost.action.type === 'x_connect';
          const xDone = isXBoost && xIsConnected;

          const inner = (
            <>
              <div className={`w-10 h-10 rounded-lg ${boost.iconBg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${boost.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-white">{boost.label}</p>
                  <span className="text-xs font-bold text-brand-accent bg-brand-accent/10 px-2 py-0.5 rounded-full">
                    +{boost.pts} pts
                  </span>
                </div>
                <p className="text-xs text-brand-muted mt-0.5">
                  {xDone ? `@${xAccount.username || 'verified'} connected (+${xAccount.verificationScore || 0} pts)` : boost.desc}
                </p>
              </div>
              {boost.action.type === 'soon' ? (
                <span className="text-xs font-medium text-brand-muted bg-brand-border px-2 py-0.5 rounded-full flex-shrink-0">
                  Coming soon
                </span>
              ) : xDone ? (
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
              ) : (
                <ArrowUpRight className="w-4 h-4 text-brand-muted group-hover:text-brand-accent transition-colors flex-shrink-0" />
              )}
            </>
          );

          if (boost.action.type === 'link') {
            return (
              <Link
                key={boost.key}
                to={boost.action.to}
                className="flex items-center gap-3 p-4 rounded-xl border border-brand-border bg-brand-bg/30 hover:bg-brand-cardHover hover:border-brand-accent/30 transition-all group"
              >
                {inner}
              </Link>
            );
          }
          if (boost.action.type === 'external') {
            return (
              <a
                key={boost.key}
                href={boost.action.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-xl border border-brand-border bg-brand-bg/30 hover:bg-brand-cardHover hover:border-brand-accent/30 transition-all group"
              >
                {inner}
              </a>
            );
          }
          if (isXBoost) {
            if (xDone) {
              return (
                <div
                  key={boost.key}
                  className="flex items-center gap-3 p-4 rounded-xl border border-green-500/20 bg-green-500/5 transition-all"
                >
                  {inner}
                </div>
              );
            }
            return (
              <button
                key={boost.key}
                onClick={() => xAccount.startConnect()}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-brand-border bg-brand-bg/30 hover:bg-brand-cardHover hover:border-brand-accent/30 transition-all group text-left"
              >
                {inner}
              </button>
            );
          }
          return (
            <div
              key={boost.key}
              className="flex items-center gap-3 p-4 rounded-xl border border-brand-border bg-brand-bg/30 transition-all"
            >
              {inner}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
