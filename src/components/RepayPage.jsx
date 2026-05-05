import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Link } from 'react-router-dom';
import { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  ArrowUpFromLine,
  CheckCircle,
  Clock,
  DollarSign,
  AlertTriangle,
  Loader2,
  History,
  TrendingUp,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { useAppContext } from '../App';

const BOND_VAULT = new PublicKey('1nc1nerator11111111111111111111111111111111');

export default function RepayPage() {
  const { publicKey, connected, signTransaction } = useWallet();
  const { connection } = useConnection();
  const ctx = useAppContext();
  const loan = ctx?.loan;
  const scoreData = ctx?.scoreData;

  const [step, setStep] = useState('view'); // view | signing | success | error
  const [txError, setTxError] = useState('');
  const [repayResult, setRepayResult] = useState(null);

  const activeLoan = loan?.activeLoan;
  const loanHistory = loan?.loanHistory || [];

  const isOverdue = activeLoan ? Date.now() > activeLoan.dueDate : false;
  const daysLeft = activeLoan
    ? Math.max(0, Math.ceil((activeLoan.dueDate - Date.now()) / 86400000))
    : 0;
  const progressPct = activeLoan
    ? Math.min(100, ((Date.now() - activeLoan.createdAt) / (activeLoan.dueDate - activeLoan.createdAt)) * 100)
    : 0;

  const handleRepay = async () => {
    if (!publicKey || !signTransaction || !activeLoan) return;
    setStep('signing');
    setTxError('');

    try {
      // Create a small repay marker transaction (memo-like, send dust)
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: BOND_VAULT,
          lamports: 5000, // minimal amount as repay marker
        })
      );

      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signed = await signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false });

      // Poll for confirmation
      let confirmed = false;
      for (let i = 0; i < 30; i++) {
        const status = await connection.getSignatureStatus(sig);
        if (
          status?.value?.confirmationStatus === 'confirmed' ||
          status?.value?.confirmationStatus === 'finalized'
        ) {
          confirmed = true;
          break;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }

      if (!confirmed) throw new Error('Transaction confirmation timed out');

      const result = await loan.repayLoan(publicKey.toBase58(), sig);
      setRepayResult(result);
      setStep('success');
      ctx?.refreshScore();
    } catch (err) {
      console.error('Repay failed:', err);
      setTxError(err.message || 'Repayment failed');
      setStep('error');
    }
  };

  if (!connected) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-brand-card rounded-2xl border border-brand-border p-8"
        >
          <ArrowUpFromLine className="w-12 h-12 text-brand-accent mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Connect Wallet to Repay</h2>
          <p className="text-sm text-brand-muted">
            Connect your wallet to view and repay your active loans.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-8 pb-20">
      <AnimatePresence mode="wait">
        {step === 'view' && (
          <motion.div
            key="view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <h1 className="text-2xl font-bold text-white mb-6">Repay Loan</h1>

            {activeLoan ? (
              <>
                {/* Active Loan Card */}
                <div
                  className={`bg-brand-card rounded-2xl border p-6 mb-6 ${
                    isOverdue ? 'border-red-500/40' : 'border-brand-accent/30'
                  }`}
                >
                  {isOverdue && (
                    <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                      <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <p className="text-xs text-red-400 font-semibold">
                        This loan is overdue. Repay now to minimize score penalty.
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-xs text-brand-muted uppercase tracking-wider mb-1">
                        Active Loan
                      </p>
                      <p className="text-3xl font-bold text-white">
                        ${activeLoan.amount?.toFixed(2)}
                      </p>
                    </div>
                    <div
                      className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                        isOverdue
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-green-500/20 text-green-400'
                      }`}
                    >
                      {isOverdue ? 'Overdue' : 'Active'}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-6">
                    <div className="flex justify-between text-xs text-brand-muted mb-2">
                      <span>
                        {new Date(activeLoan.createdAt).toLocaleDateString()}
                      </span>
                      <span
                        className={isOverdue ? 'text-red-400 font-semibold' : ''}
                      >
                        Due: {new Date(activeLoan.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="h-2 bg-brand-border rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          background: isOverdue
                            ? 'linear-gradient(90deg, #EF4444, #DC2626)'
                            : 'linear-gradient(90deg, #EC81FF, #B84FCC)',
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(progressPct, 100)}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                      />
                    </div>
                    <p className="text-xs text-brand-muted mt-1 text-center">
                      {isOverdue ? (
                        <span className="text-red-400">
                          {Math.ceil((Date.now() - activeLoan.dueDate) / 86400000)} days overdue
                        </span>
                      ) : (
                        `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`
                      )}
                    </p>
                  </div>

                  {/* Loan Details */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="p-3 rounded-xl bg-brand-bg/50">
                      <div className="flex items-center gap-1.5 mb-1">
                        <DollarSign className="w-3 h-3 text-brand-accent" />
                        <span className="text-xs text-brand-muted">Total Repay</span>
                      </div>
                      <p className="text-sm font-bold text-brand-accent">
                        ${activeLoan.totalRepay?.toFixed(4)}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-brand-bg/50">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Clock className="w-3 h-3 text-brand-muted" />
                        <span className="text-xs text-brand-muted">Term</span>
                      </div>
                      <p className="text-sm font-bold text-white">
                        {activeLoan.termDays} days
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-brand-bg/50">
                      <div className="flex items-center gap-1.5 mb-1">
                        <TrendingUp className="w-3 h-3 text-brand-muted" />
                        <span className="text-xs text-brand-muted">APR</span>
                      </div>
                      <p className="text-sm font-bold text-white">{activeLoan.apr}%</p>
                    </div>
                    <div className="p-3 rounded-xl bg-brand-bg/50">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Shield className="w-3 h-3 text-yellow-400" />
                        <span className="text-xs text-brand-muted">Bond</span>
                      </div>
                      <p className="text-sm font-bold text-yellow-400">
                        ${activeLoan.bondAmount}
                      </p>
                    </div>
                  </div>

                  <div className="bg-brand-bg/50 rounded-xl p-3 mb-6">
                    <p className="text-xs text-brand-muted">
                      Purpose: <span className="text-white">{activeLoan.reason}</span>
                    </p>
                    {activeLoan.txSignature && (
                      <a
                        href={`https://solscan.io/tx/${activeLoan.txSignature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-accent underline hover:opacity-80 mt-1 block"
                      >
                        View borrow tx on Solscan
                      </a>
                    )}
                  </div>

                  {/* Score Impact */}
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-brand-accent/5 border border-brand-accent/20 mb-6">
                    <TrendingUp className="w-4 h-4 text-brand-accent flex-shrink-0" />
                    <p className="text-xs text-brand-muted">
                      {isOverdue ? (
                        <>
                          Late repayment: <span className="text-red-400 font-semibold">-10 score points</span>
                        </>
                      ) : (
                        <>
                          On-time repayment earns you{' '}
                          <span className="text-green-400 font-semibold">+15 score points</span> and
                          your ${activeLoan.bondAmount} bond is refunded.
                        </>
                      )}
                    </p>
                  </div>

                  <button
                    onClick={handleRepay}
                    className="w-full py-4 rounded-xl bg-brand-accent text-[#0A0A0F] font-bold text-base hover:opacity-90 transition-opacity"
                  >
                    Sign & Repay ${activeLoan.totalRepay?.toFixed(4)}
                  </button>
                </div>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-brand-card rounded-2xl border border-brand-border p-8 text-center mb-6"
              >
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">No Active Loans</h2>
                <p className="text-sm text-brand-muted mb-6">
                  You are all clear. Ready to borrow?
                </p>
                <Link
                  to="/borrow"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-accent text-[#0A0A0F] font-semibold text-sm hover:opacity-90 transition-opacity"
                >
                  Borrow Funds
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </motion.div>
            )}

            {/* Loan History */}
            {loanHistory.length > 0 && (
              <div className="bg-brand-card rounded-2xl border border-brand-border p-6">
                <div className="flex items-center gap-2 mb-4">
                  <History className="w-4 h-4 text-brand-accent" />
                  <h3 className="text-sm font-bold text-white">Loan History</h3>
                </div>
                <div className="space-y-2">
                  {loanHistory
                    .slice()
                    .reverse()
                    .slice(0, 10)
                    .map((entry, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-xl bg-brand-bg/50"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              entry.action === 'repay'
                                ? 'bg-green-500/10'
                                : 'bg-brand-accent/10'
                            }`}
                          >
                            {entry.action === 'repay' ? (
                              <ArrowUpFromLine className="w-4 h-4 text-green-400" />
                            ) : (
                              <ArrowUpFromLine className="w-4 h-4 text-brand-accent rotate-180" />
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-white">
                              {entry.action === 'repay' ? 'Repaid' : 'Borrowed'} $
                              {entry.amount?.toFixed(2)}
                            </p>
                            <p className="text-xs text-brand-muted">
                              {new Date(entry.timestamp).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {entry.action === 'repay' && (
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              entry.isOnTime
                                ? 'bg-green-500/10 text-green-400'
                                : 'bg-red-500/10 text-red-400'
                            }`}
                          >
                            {entry.isOnTime ? '+15 pts' : '-10 pts'}
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {step === 'signing' && (
          <motion.div
            key="signing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-lg mx-auto pt-20 text-center"
          >
            <Loader2 className="w-16 h-16 text-brand-accent animate-spin mx-auto mb-6" />
            <h2 className="text-xl font-bold text-white mb-2">Processing Repayment</h2>
            <p className="text-sm text-brand-muted">
              Sign the transaction in your wallet and wait for confirmation...
            </p>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-lg mx-auto pt-12"
          >
            <div className="bg-brand-card rounded-2xl border border-green-500/30 p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 12 }}
              >
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              </motion.div>
              <h2 className="text-xl font-bold text-white mb-2">Loan Repaid</h2>
              {repayResult && (
                <>
                  <p className="text-sm text-brand-muted mb-2">
                    {repayResult.isOnTime ? (
                      <>
                        Repaid on time.{' '}
                        <span className="text-green-400 font-semibold">+15 score points earned.</span>
                      </>
                    ) : (
                      <>
                        Late repayment.{' '}
                        <span className="text-red-400 font-semibold">-10 score penalty applied.</span>
                      </>
                    )}
                  </p>
                  <p className="text-xs text-brand-muted mb-6">
                    Total score adjustment from loans:{' '}
                    <span
                      className={`font-bold ${
                        repayResult.totalScoreAdjustment >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {repayResult.totalScoreAdjustment >= 0 ? '+' : ''}
                      {repayResult.totalScoreAdjustment} points
                    </span>
                  </p>
                </>
              )}
              <div className="flex gap-3">
                <Link
                  to="/borrow"
                  className="flex-1 py-3 rounded-xl bg-brand-accent text-[#0A0A0F] font-semibold text-sm text-center hover:opacity-90 transition-opacity"
                >
                  Borrow Again
                </Link>
                <Link
                  to="/"
                  className="flex-1 py-3 rounded-xl border border-brand-border text-brand-muted font-semibold text-sm text-center hover:text-white transition-colors"
                >
                  View Score
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-lg mx-auto pt-12"
          >
            <div className="bg-brand-card rounded-2xl border border-red-500/30 p-8 text-center">
              <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Repayment Failed</h2>
              <p className="text-sm text-red-400 mb-6">{txError}</p>
              <button
                onClick={() => setStep('view')}
                className="px-6 py-3 rounded-xl border border-brand-border text-brand-muted font-semibold text-sm hover:text-white transition-colors"
              >
                Try Again
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
