import React from 'react';
import { motion } from 'framer-motion';
import { Shield, ChevronRight, TrendingUp } from 'lucide-react';
import { LOAN_LEVELS } from '../hooks/useCreditScore';

const LEVEL_COLORS = {
  1: '#81D4FF',
  2: '#81D4FF',
  3: '#7CFF81',
  4: '#FFD881',
  5: '#EC81FF',
  6: '#F5B8FF',
};

const LEVELS = LOAN_LEVELS.map((l) => ({
  ...l,
  color: LEVEL_COLORS[l.level] || '#EC81FF',
}));

export default function LoanLevel({ loanLevel, score }) {
  const currentLevel = loanLevel.level;

  return (
    <motion.div
      className="bg-brand-card rounded-2xl border border-brand-border p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-brand-accent" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Loan Level</h3>
          <p className="text-sm text-brand-muted">Your borrowing capacity</p>
        </div>
      </div>

      <div className="space-y-3">
        {LEVELS.map((lvl, i) => {
          const isActive = currentLevel >= lvl.level;
          const isCurrent = currentLevel === lvl.level;

          return (
            <motion.div
              key={lvl.level}
              className={`relative flex items-center justify-between p-4 rounded-xl border transition-all ${
                isCurrent
                  ? 'border-brand-accent/40 bg-brand-accent/10 shadow-lg shadow-brand-accent/5'
                  : isActive
                  ? 'border-green-500/20 bg-green-500/5'
                  : 'border-brand-border bg-brand-bg/30 opacity-50'
              }`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * i + 0.3 }}
            >
              {isCurrent && (
                <motion.div
                  className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full"
                  style={{ background: lvl.color }}
                  layoutId="activeLevelIndicator"
                />
              )}
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm"
                  style={{
                    background: isActive ? `${lvl.color}20` : '#1E1E2A',
                    color: isActive ? lvl.color : '#6B6B80',
                  }}
                >
                  L{lvl.level}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-brand-muted'}`}>
                    {lvl.label} — Level {lvl.level}
                  </p>
                  <p className="text-xs text-brand-muted">Score {lvl.minScore}+</p>
                </div>
              </div>
              <div className="text-right">
                <p
                  className="text-lg font-bold"
                  style={{ color: isActive ? lvl.color : '#6B6B80' }}
                >
                  ${lvl.amount}
                </p>
                <p className="text-xs text-brand-muted">max borrow</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {loanLevel.next && (
        <motion.div
          className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-brand-bg/50 border border-brand-border"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <TrendingUp className="w-4 h-4 text-brand-accent flex-shrink-0" />
          <p className="text-xs text-brand-muted">
            <span className="text-brand-accent font-semibold">
              {(loanLevel.next.minScore || 0) - score} more points
            </span>{' '}
            {loanLevel.next.repayments > 0 && <span>+ {loanLevel.next.repayments} clean repayment(s) </span>}
            to unlock Level {loanLevel.next.level} (${loanLevel.next.amount} borrow limit)
          </p>
          <ChevronRight className="w-3 h-3 text-brand-muted ml-auto flex-shrink-0" />
        </motion.div>
      )}
    </motion.div>
  );
}
