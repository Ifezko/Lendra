import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowDownToLine, ArrowUpFromLine, ChevronRight, Brain } from 'lucide-react';
import ScoreRing from './ScoreRing';
import ScoreBreakdown from './ScoreBreakdown';
import WalletStats from './WalletStats';
import UnlockGuidance from './UnlockGuidance';
import LoanLevel from './LoanLevel';
import BoostCard from './BoostCard';
import { useAppContext } from '../App';

export default function Dashboard({ scoreData }) {
  const { score, tier, loanLevel, canBorrow, spend90d } = scoreData;
  const ctx = useAppContext();
  const activeLoan = ctx?.loan?.activeLoan;

  return (
    <div className="max-w-5xl mx-auto px-4 pb-20">
      {/* Hero Score Section */}
      <motion.div
        className="flex flex-col items-center pt-8 pb-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <p className="text-sm text-brand-muted mb-6 uppercase tracking-widest">Your Lendra Score</p>
        <ScoreRing score={score} tier={tier} />

        {/* Explain My Score Button */}
        <motion.button
          onClick={() => ctx?.openAiDrawer?.()}
          className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-card border border-brand-border text-sm text-brand-muted hover:text-white hover:border-brand-accent/30 transition-colors"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <Brain className="w-4 h-4 text-brand-accent" />
          <span>Explain my score</span>
        </motion.button>

        <motion.p
          className="mt-4 text-sm text-brand-muted max-w-sm text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          {canBorrow
            ? `You qualify for up to ${loanLevel.amount} in undercollateralized loans.`
            : 'Complete the steps below to unlock borrowing.'}
        </motion.p>

        {/* CTA Buttons */}
        {canBorrow && (
          <motion.div
            className="flex items-center gap-3 mt-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.8 }}
          >
            {activeLoan ? (
              <Link
                to="/repay"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-accent text-[#0A0A0F] font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                <ArrowUpFromLine className="w-4 h-4" />
                Repay ${activeLoan.totalRepay?.toFixed(2)}
                <ChevronRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                to="/borrow"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-accent text-[#0A0A0F] font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                <ArrowDownToLine className="w-4 h-4" />
                Borrow Now
                <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* Active Loan Banner */}
      {activeLoan && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Link
            to="/repay"
            className="block p-4 rounded-2xl border border-brand-accent/30 bg-brand-accent/5 hover:bg-brand-accent/10 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center">
                  <ArrowUpFromLine className="w-5 h-5 text-brand-accent" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    Active Loan: ${activeLoan.amount?.toFixed(2)}
                  </p>
                  <p className="text-xs text-brand-muted">
                    Due: {new Date(activeLoan.dueDate).toLocaleDateString()} — {activeLoan.termDays}d
                    term at {activeLoan.apr}% APR
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-brand-accent" />
            </div>
          </Link>
        </motion.div>
      )}

      {/* Wallet Stats Grid */}
      <div className="mb-8">
        <WalletStats scoreData={scoreData} />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <ScoreBreakdown
            breakdown={scoreData.breakdown}
            walletAgeDays={scoreData.walletAgeDays}
            txCount={scoreData.txCount}
            monthlyActivity={scoreData.monthlyActivity}
            protocolCount={scoreData.protocolCount}
            balanceUsd={scoreData.balanceUsd}
          />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {canBorrow ? (
            <>
              <LoanLevel loanLevel={loanLevel} score={score} />
              <BoostCard />
            </>
          ) : (
            <>
              <UnlockGuidance spend90d={spend90d} score={score} />
              <BoostCard />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
