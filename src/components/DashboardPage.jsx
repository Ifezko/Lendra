import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  BarChart3, ArrowDownToLine, Shield, CheckCircle, XCircle,
  Brain, Share2, Globe, ChevronRight, Zap, Clock, TrendingUp, Lock, Activity,
} from 'lucide-react';
import ScoreRing from './ScoreRing';
import { useAppContext } from '../App';
import { SCORE_FACTORS, BASE_SCORE, LOAN_LEVELS, calculateBond, meetsSpendGate, getSpendGateAmount } from '../hooks/useCreditScore';
import QuickActions from './QuickActions';

function Card({ children, className = '' }) {
  return (
    <div className={`bg-brand-card rounded-2xl border border-brand-border p-5 ${className}`}>
      {children}
    </div>
  );
}

function GateBadge({ passed, label }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
      passed ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5'
    }`}>
      {passed ? (
        <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
      ) : (
        <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
      )}
      <span className={`text-xs font-medium ${passed ? 'text-green-300' : 'text-red-300'}`}>
        {label}
      </span>
    </div>
  );
}

export default function DashboardPage({ scoreData }) {
  const ctx = useAppContext();
  const activeLoan = ctx?.loan?.activeLoan;
  const ika = ctx?.ika;

  if (!scoreData) {
    return (
      <div className="max-w-5xl mx-auto px-4 pt-12">
        <Card>
          <div className="text-center py-10">
            <BarChart3 className="w-12 h-12 text-brand-accent mx-auto mb-4 opacity-50" />
            <h2 className="text-xl font-bold text-white mb-2">Your Lendra profile is not ready yet.</h2>
            <p className="text-sm text-brand-muted mb-6">
              Scan your wallet to generate your first credit profile.
            </p>
            <Link
              to="/trust-score"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-accent text-[#0A0A0F] font-semibold text-sm"
            >
              Run wallet scan
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const { score, tier, loanLevel, canBorrow, spend90d, breakdown, cleanRepayments = 0 } = scoreData;
  const wallet = ctx?.scoreData ? 'Connected' : '';
  const shortWallet = ctx?.scoreData?.walletAddress
    ? `${ctx.scoreData.walletAddress.slice(0, 4)}...${ctx.scoreData.walletAddress.slice(-4)}`
    : '';

  const scorePassed = score >= 350;
  const spendGate = getSpendGateAmount(loanLevel);
  const spendPassed = meetsSpendGate(loanLevel, spend90d);
  const noActiveLoan = !activeLoan;
  const repaymentPassed = loanLevel.level <= 1 || cleanRepayments >= (loanLevel.repayments || 0);

  const breakdownItems = [
    { key: 'age', label: 'Wallet Age', value: breakdown.age, max: SCORE_FACTORS.age.max },
    { key: 'volume', label: 'Tx Activity', value: breakdown.volume, max: SCORE_FACTORS.volume.max },
    { key: 'consistency', label: 'Consistency', value: breakdown.consistency, max: SCORE_FACTORS.consistency.max },
    { key: 'diversity', label: 'Diversity', value: breakdown.diversity, max: SCORE_FACTORS.diversity.max },
    { key: 'portfolio', label: 'Portfolio', value: breakdown.portfolio, max: SCORE_FACTORS.portfolio.max },
    { key: 'repayment', label: 'Repayment', value: breakdown.repayment, max: SCORE_FACTORS.repayment.max },
    { key: 'xVerification', label: 'X Verify', value: breakdown.xVerification, max: SCORE_FACTORS.xVerification.max },
    { key: 'crossChain', label: 'Cross-Chain', value: breakdown.crossChain, max: SCORE_FACTORS.crossChain.max },
    { key: 'solIdentity', label: '.sol ID', value: breakdown.solIdentity, max: SCORE_FACTORS.solIdentity.max },
    { key: 'superteam', label: 'Superteam', value: breakdown.superteam, max: SCORE_FACTORS.superteam.max },
    { key: 'creditMaturity', label: 'Maturity', value: breakdown.creditMaturity || 0, max: SCORE_FACTORS.creditMaturity.max },
    { key: 'borrowGrowth', label: 'Growth', value: breakdown.borrowGrowth || 0, max: SCORE_FACTORS.borrowGrowth.max },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 pb-20 pt-4">
      <motion.h1
        className="text-2xl font-bold text-white mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Dashboard
      </motion.h1>

      {/* Single Wallet Intelligence preview entry (PRD 5.6.1 required flow) —
          deliberately one slim link so it never competes with borrow/improve. */}
      <Link
        to="/wallet-intelligence"
        className="flex items-center gap-3 mb-6 px-4 py-3 rounded-2xl border border-brand-accent/20 bg-brand-accent/5 hover:bg-brand-accent/10 transition-colors group"
      >
        <Activity className="w-4 h-4 text-brand-accent flex-shrink-0" />
        <span className="text-sm text-white font-medium">Wallet Intelligence ready</span>
        <span className="text-xs text-brand-muted hidden sm:inline">— view your full activity report</span>
        <ChevronRight className="w-4 h-4 text-brand-accent ml-auto group-hover:translate-x-0.5 transition-transform" />
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Profile Summary */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="lg:row-span-2">
          <Card className="h-full">
            <div className="flex flex-col items-center justify-center text-center h-full">
              <div className="scale-75 -my-4">
                <ScoreRing score={score} tier={tier} />
              </div>
              <p className="text-xs text-brand-muted mt-2">
                {scoreData.solDomain ? scoreData.solDomain : shortWallet || 'Wallet connected'}
              </p>
              <div className="w-full mt-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-brand-muted">Tier</span>
                  <span className="text-white font-semibold">{tier.label}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-brand-muted">Level</span>
                  <span className="text-brand-accent font-semibold">
                    {loanLevel.level > 0 ? `${loanLevel.level} — ${loanLevel.label}` : 'Not eligible'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-brand-muted">Eligible</span>
                  <span className="text-white font-semibold">
                    {canBorrow ? `Up to $${loanLevel.amount} USDC` : 'Not yet'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-brand-muted">Active Loan</span>
                  <span className={`font-semibold ${activeLoan ? 'text-yellow-400' : 'text-green-400'}`}>
                    {activeLoan ? `$${activeLoan.amount?.toFixed(2)}` : 'None'}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Borrowing Power */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <ArrowDownToLine className="w-4 h-4 text-brand-accent" />
              <h3 className="text-sm font-bold text-white">Borrowing Power</h3>
            </div>
            {canBorrow ? (
              <>
                <p className="text-2xl font-bold text-white mb-1">${loanLevel.amount} <span className="text-sm text-brand-muted font-normal">USDC</span></p>
                {loanLevel.next && (
                  <p className="text-xs text-brand-muted mb-3">
                    Next: ${loanLevel.next.amount} — need {loanLevel.next.minScore - score} more pts
                    {loanLevel.next.repayments > cleanRepayments && ` + ${loanLevel.next.repayments - cleanRepayments} clean repayment(s)`}
                  </p>
                )}
                <Link
                  to="/borrow"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-accent text-[#0A0A0F] text-xs font-semibold"
                >
                  Borrow now <ChevronRight className="w-3 h-3" />
                </Link>
              </>
            ) : (
              <>
                <p className="text-sm text-brand-muted mb-2">
                  {score < 350
                    ? 'Score below minimum threshold (350).'
                    : 'Complete eligibility gates to unlock borrowing.'}
                </p>
                <p className="text-xs text-brand-muted/70">
                  Wallet activity gets you started. Repayment and verified identity move you up.
                </p>
              </>
            )}
          </Card>
        </motion.div>

        {/* Eligibility Gates */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-brand-accent" />
              <h3 className="text-sm font-bold text-white">Eligibility Gates</h3>
            </div>
            <p className="text-[10px] text-brand-muted mb-3">
              Your score shows trust. Eligibility decides whether you can borrow now.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <GateBadge passed={scorePassed} label={`Score ≥ 350`} />
              <GateBadge passed={spendPassed} label={`90d spend ≥ $${spendGate}`} />
              <GateBadge passed={noActiveLoan} label="No active loan" />
              <GateBadge passed={repaymentPassed} label="Repayment req" />
            </div>
          </Card>
        </motion.div>

        {/* Score Summary */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-brand-accent" />
                <h3 className="text-sm font-bold text-white">Score Summary</h3>
              </div>
              <Link to="/trust-score" className="text-xs text-brand-accent hover:underline flex items-center gap-1">
                View full breakdown <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="text-[10px] text-brand-muted mb-3">Base +{BASE_SCORE}</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {breakdownItems.map((item) => {
                const pct = item.max > 0 ? (item.value / item.max) * 100 : 0;
                return (
                  <div key={item.key} className="bg-brand-bg/50 rounded-xl p-2.5">
                    <p className="text-[10px] text-brand-muted truncate">{item.label}</p>
                    <p className="text-xs font-bold text-white">+{item.value}<span className="text-brand-muted font-normal">/{item.max}</span></p>
                    <div className="h-1 bg-brand-border rounded-full mt-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #EC81FF, #B84FCC)' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>

        {/* Active Loan / Position */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-brand-accent" />
              <h3 className="text-sm font-bold text-white">Position</h3>
            </div>
            {activeLoan ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-brand-muted">Loan</span>
                  <span className="text-white font-semibold">${activeLoan.amount?.toFixed(2)} USDC</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-brand-muted">APR</span>
                  <span className="text-white">{activeLoan.apr}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-brand-muted">Due</span>
                  <span className="text-white">{new Date(activeLoan.dueDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-brand-muted">Bond locked</span>
                  <span className="text-yellow-400 font-semibold">${activeLoan.bondAmount}</span>
                </div>
                <Link
                  to="/repay"
                  className="block w-full text-center mt-2 px-4 py-2 rounded-xl bg-brand-accent text-[#0A0A0F] text-xs font-semibold"
                >
                  Repay ${activeLoan.totalRepay?.toFixed(2)}
                </Link>
              </div>
            ) : (
              <div>
                <p className="text-xs text-brand-muted mb-3">No active loan.</p>
                {canBorrow && (
                  <Link
                    to="/borrow"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-accent/10 border border-brand-accent/20 text-brand-accent text-xs font-semibold"
                  >
                    Borrow now <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Trust Profile */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <div className="flex items-center gap-2 mb-1">
              <Globe className="w-4 h-4 text-brand-accent" />
              <h3 className="text-sm font-bold text-white">Earned Trust Signals</h3>
            </div>
            <p className="text-xs text-brand-muted leading-relaxed mb-3">Verified signals that strengthen your Lendra Score, separate from your wallet activity and DeFi history.</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-brand-muted">.sol Identity</span>
                <span className={`font-medium ${scoreData.solDomain ? 'text-green-400' : 'text-brand-muted'}`}>
                  {scoreData.solDomain || 'Not linked'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-brand-muted">X Verification</span>
                <span className={`font-medium ${breakdown.xVerification > 0 ? 'text-green-400' : 'text-brand-muted'}`}>
                  {breakdown.xVerification > 0 ? 'Verified' : 'Not connected'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-brand-muted">Cross-Chain</span>
                <span className={`font-medium ${(ika?.connectedChains?.length || 0) > 0 ? 'text-green-400' : 'text-brand-muted'}`}>
                  {(ika?.connectedChains?.length || 0) > 0
                    ? `${ika.connectedChains.length} wallet(s)`
                    : 'None'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-brand-muted">Superteam PoW</span>
                <span className="text-brand-muted">Not verified</span>
              </div>
            </div>
            <Link
              to="/trust-score"
              className="block w-full text-center mt-3 px-4 py-2 rounded-xl border border-brand-accent/20 text-brand-accent text-xs font-semibold hover:bg-brand-accent/5 transition-colors"
            >
              Boost trust profile
            </Link>
          </Card>
        </motion.div>

        {/* Lendra AI */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-4 h-4 text-brand-accent" />
              <h3 className="text-sm font-bold text-white">Lendra AI</h3>
            </div>
            <p className="text-xs text-brand-muted mb-3">
              Understand your score, borrowing power, and next unlock step.
            </p>
            <button
              onClick={() => ctx?.openAiDrawer?.()}
              className="w-full px-4 py-2 rounded-xl bg-brand-accent text-[#0A0A0F] text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              Ask about my score
            </button>
          </Card>
        </motion.div>

        {/* Social Credit Card — full-width banner so the bottom row has no gap */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="lg:col-span-3">
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center flex-shrink-0">
                  <Share2 className="w-5 h-5 text-brand-accent" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white">Share Credit Card</h3>
                  <p className="text-xs text-brand-muted">Generate a shareable Lendra credit card and post it to X.</p>
                </div>
              </div>
              <Link
                to="/share"
                className="text-center px-5 py-2.5 rounded-xl border border-brand-accent/20 text-brand-accent text-xs font-semibold hover:bg-brand-accent/5 transition-colors sm:flex-shrink-0"
              >
                Generate share card
              </Link>
            </div>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="lg:col-span-3">
          <QuickActions />
        </motion.div>
      </div>
    </div>
  );
}
