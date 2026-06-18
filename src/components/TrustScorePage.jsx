import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ShieldCheck, Globe, CheckCircle, Zap, Hash, Award, RefreshCw,
  Lock, ArrowUpRight, ExternalLink, ChevronRight, BarChart3, Brain, Loader2, XCircle, Unlink, Layers,
} from 'lucide-react';
import ScoreRing from './ScoreRing';
import ScoreBreakdown from './ScoreBreakdown';
import WalletStats from './WalletStats';
import UnlockGuidance from './UnlockGuidance';
import LoanLevel from './LoanLevel';
import BoostCard from './BoostCard';
import { useAppContext } from '../App';
import { SCORE_FACTORS, BASE_SCORE } from '../hooks/useCreditScore';
import { useXAccount } from '../hooks/useXAccount';
import { API_BASE_URL } from '../config';

function XIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function TrustSignalCard({ icon: Icon, label, pts, maxPts, value, status, action, delay = 0, children }) {
  const pct = maxPts > 0 ? Math.min(100, (pts / maxPts) * 100) : 0;
  const statusColor = status === 'active' ? 'text-green-400' : status === 'partial' ? 'text-yellow-400' : 'text-brand-muted';
  const statusLabel = status === 'active' ? 'Active' : status === 'partial' ? 'Partial' : 'Not connected';
  const content = (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="bg-brand-card rounded-2xl border border-brand-border p-5 hover:border-brand-accent/20 transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-brand-accent" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">{label}</p>
            <p className={`text-xs font-medium ${statusColor}`}>{statusLabel}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold text-white">+{pts}</span>
          <span className="text-xs text-brand-muted font-normal">/{maxPts}</span>
        </div>
      </div>
      {value && <p className="text-xs text-brand-muted mb-3">{value}</p>}
      <div className="h-1.5 bg-brand-border rounded-full overflow-hidden mb-3">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #EC81FF, #B84FCC)' }} />
      </div>
      {children}
      {!children && action && action.type !== 'soon' && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-brand-accent font-semibold">{action.label}</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-brand-muted group-hover:text-brand-accent transition-colors" />
        </div>
      )}
      {!children && action && action.type === 'soon' && (
        <span className="text-xs font-medium text-brand-muted bg-brand-border px-2 py-0.5 rounded-full">Coming soon</span>
      )}
    </motion.div>
  );
  if (!children && action?.type === 'link') return <Link to={action.to} className="block">{content}</Link>;
  if (!children && action?.type === 'external') return <a href={action.href} target="_blank" rel="noopener noreferrer" className="block">{content}</a>;
  return content;
}

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'breakdown', label: 'Score Breakdown' },
  { id: 'trust', label: 'Trust Signals' },
];

// Wallets whose trust signals have already been auto-fetched, tracked at module
// scope so the guard survives remounts. This component unmounts/remounts every
// time a score scan toggles the app-level loading state; a per-instance ref
// would reset on each remount and re-trigger the auto-fetch -> reloadScore ->
// scan cycle endlessly. A module-level Set runs the auto-fetch once per wallet.
const autoFetchedWallets = new Set();

export default function TrustScorePage({ scoreData, reloadScore }) {
  const ctx = useAppContext();
  const ika = ctx?.ika;
  const privateMode = ctx?.privateMode;
  const { connected, publicKey } = useWallet();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchParams, setSearchParams] = useSearchParams();
  const [xToast, setXToast] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState(null);
  const xAccount = useXAccount();
  const autoFetchedRef = useRef(null);

  const refreshTrustSignals = useCallback(async ({ silent = false } = {}) => {
    if (!publicKey || refreshing) return;
    setRefreshing(true);
    if (!silent) setRefreshResult(null);
    try {
      const url = API_BASE_URL ? `${API_BASE_URL}/api/wallet/trust-signals/refresh` : 'api/wallet/trust-signals/refresh';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: publicKey.toBase58() }),
      });
      const json = await res.json();
      if (json.ok) {
        // Only surface a toast/banner when a .sol domain was newly found, or on manual refresh
        if (!silent || json.sol_domain) {
          setRefreshResult({ success: true, solDomain: json.sol_domain, tokenBalances: json.token_balances });
        }
        // Trigger a full score re-scan to pick up updated signals
        if (typeof reloadScore === 'function') reloadScore();
      } else if (!silent) {
        setRefreshResult({ success: false, error: json.error || 'Refresh failed' });
      }
    } catch (e) {
      if (!silent) setRefreshResult({ success: false, error: e.message });
    } finally {
      setRefreshing(false);
      if (!silent) setTimeout(() => setRefreshResult(null), 5000);
    }
  }, [publicKey, refreshing, reloadScore]);

  // Auto-fetch trust signals (.sol identity, token balances) once per connected wallet.
  // Runs silently in the background so the Trust Profile populates without a manual click.
  useEffect(() => {
    if (!connected || !publicKey) return;
    const wallet = publicKey.toBase58();
    if (autoFetchedWallets.has(wallet)) return;
    autoFetchedWallets.add(wallet);
    refreshTrustSignals({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey]);

  // Handle X OAuth callback URL params
  useEffect(() => {
    const xStatus = searchParams.get('x');
    if (!xStatus) return;
    const messages = {
      connected: 'X account connected successfully. Your trust score will update shortly.',
      error: 'X authentication failed. Please try again.',
      expired: 'X authentication session expired. Please try again.',
      token_error: 'Failed to authenticate with X. Please try again.',
      profile_error: 'Failed to fetch your X profile. Please try again.',
      failed: 'X connection failed. Please try again.',
    };
    const isSuccess = xStatus === 'connected';
    setXToast({ message: messages[xStatus] || `X status: ${xStatus}`, type: isSuccess ? 'success' : 'error' });
    if (isSuccess) xAccount.refresh();
    // Clean up URL params
    searchParams.delete('x');
    searchParams.delete('stage');
    setSearchParams(searchParams, { replace: true });
    const timer = setTimeout(() => setXToast(null), 6000);
    return () => clearTimeout(timer);
  }, [searchParams]);

  if (!connected) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-20 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-brand-card rounded-2xl border border-brand-border p-8">
          <ShieldCheck className="w-12 h-12 text-brand-accent mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Trust Score</h2>
          <p className="text-sm text-brand-muted">Connect your Solana wallet to view your credit score and trust profile.</p>
        </motion.div>
      </div>
    );
  }

  if (!scoreData) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-20 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-brand-card rounded-2xl border border-brand-border p-8">
          <ShieldCheck className="w-12 h-12 text-brand-accent mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-bold text-white mb-2">Scanning wallet...</h2>
          <p className="text-sm text-brand-muted">Analyzing your on-chain activity to compute your credit score.</p>
        </motion.div>
      </div>
    );
  }

  const { score, tier, loanLevel, canBorrow, spend90d, breakdown, cleanRepayments = 0 } = scoreData;
  const crossChainCount = ika?.connectedChains?.length || 0;
  const crossChainBoost = ika?.totalCrossChainBoost || 0;

  const trustSignals = [
    breakdown.repayment || 0, breakdown.xVerification || 0, breakdown.crossChain || 0,
    breakdown.solIdentity || 0, breakdown.superteam || 0, breakdown.creditMaturity || 0, breakdown.borrowGrowth || 0,
  ];
  const totalTrustPts = trustSignals.reduce((a, b) => a + b, 0);
  const maxTrustPts = SCORE_FACTORS.repayment.max + SCORE_FACTORS.xVerification.max +
    SCORE_FACTORS.crossChain.max + SCORE_FACTORS.solIdentity.max + SCORE_FACTORS.superteam.max +
    SCORE_FACTORS.creditMaturity.max + SCORE_FACTORS.borrowGrowth.max;
  const trustPct = maxTrustPts > 0 ? Math.round((totalTrustPts / maxTrustPts) * 100) : 0;

  const xIsActive = xAccount.connected || (breakdown.xVerification || 0) > 0;
  const xValueText = xIsActive
    ? `@${xAccount.username || 'verified'} connected (+${xAccount.verificationScore || breakdown.xVerification || 0} pts)`
    : 'Link your X account to prove social identity and earn up to +100 pts';

  return (
    <div className="max-w-5xl mx-auto px-4 pb-20 pt-4">
      {/* X OAuth Toast */}
      <AnimatePresence>
        {xToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium shadow-lg ${
              xToast.type === 'success'
                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            {xToast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {xToast.message}
            <button onClick={() => setXToast(null)} className="ml-2 opacity-60 hover:opacity-100">?</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-6"
      >
        <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-brand-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Trust Score</h1>
          <p className="text-sm text-brand-muted">Your complete credit profile, score breakdown, and trust signals.</p>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-brand-card rounded-xl border border-brand-border mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-[100px] px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-brand-accent text-[#0A0A0F]'
                : 'text-brand-muted hover:text-white hover:bg-brand-cardHover'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Score Hero */}
            <div className="flex flex-col items-center pt-2 pb-8">
              <p className="text-sm text-brand-muted mb-6 uppercase tracking-widest">Your Lendra Score</p>
              <ScoreRing score={score} tier={tier} />
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
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Credit Tier', value: tier.label, color: tier.color },
                { label: 'Loan Level', value: loanLevel.level > 0 ? `${loanLevel.level} - ${loanLevel.label}` : 'Not eligible', color: '#EC81FF' },
                { label: 'Earned Trust', value: `+${totalTrustPts}/${maxTrustPts}`, color: '#EC81FF' },
                { label: 'Can Borrow', value: canBorrow ? `$${loanLevel.amount} USDC` : 'Locked', color: canBorrow ? '#34D399' : '#EF4444' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  className="bg-brand-card rounded-2xl border border-brand-border p-4"
                >
                  <p className="text-[10px] text-brand-muted uppercase tracking-wider mb-1">{stat.label}</p>
                  <p className="text-sm font-bold" style={{ color: stat.color }}>{stat.value}</p>
                </motion.div>
              ))}
            </div>

            {/* Loan Level + Unlock/Boost */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              <LoanLevel loanLevel={loanLevel} score={score} />
              {!canBorrow ? (
                <UnlockGuidance spend90d={spend90d} score={score} />
              ) : (
                <BoostCard />
              )}
            </div>

            {/* Wallet Stats */}
            <WalletStats scoreData={scoreData} />
          </motion.div>
        )}

        {/* SCORE BREAKDOWN TAB */}
        {activeTab === 'breakdown' && (
          <motion.div
            key="breakdown"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <ScoreBreakdown
              breakdown={breakdown}
              walletAgeDays={scoreData.walletAgeDays || 0}
              txCount={scoreData.txCount || 0}
              monthlyActivity={scoreData.monthlyActivity || 0}
              protocolCount={scoreData.protocolCount || 0}
              balanceUsd={scoreData.balanceUsd || 0}
            />
          </motion.div>
        )}

        {/* TRUST SIGNALS TAB */}
        {activeTab === 'trust' && (
          <motion.div
            key="trust"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Trust Summary */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-brand-card rounded-2xl border border-brand-border p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-brand-muted uppercase tracking-wider mb-1">Earned Trust Signals</p>
                  <p className="text-3xl font-bold text-white">+{totalTrustPts}</p>
                  <p className="text-xs text-brand-muted">of {maxTrustPts} possible trust signal points</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="w-20 h-20">
                    <svg viewBox="0 0 36 36" className="w-full h-full">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#1E1E2A" strokeWidth="3" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="url(#trustGrad2)" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${trustPct}, 100`} />
                      <defs><linearGradient id="trustGrad2"><stop offset="0%" stopColor="#EC81FF" /><stop offset="100%" stopColor="#B84FCC" /></linearGradient></defs>
                      <text x="18" y="20" textAnchor="middle" className="fill-white text-[8px] font-bold">{trustPct}%</text>
                    </svg>
                  </div>
                  <button
                    onClick={refreshTrustSignals}
                    disabled={refreshing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-border text-brand-muted hover:text-white hover:bg-brand-accent/10 hover:border-brand-accent/20 border border-transparent transition-all disabled:opacity-50"
                  >
                    {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Refresh
                  </button>
                </div>
              </div>
              {refreshResult && (
                <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg mb-3 ${refreshResult.success ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                  {refreshResult.success ? <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" /> : <XCircle className="w-3.5 h-3.5 flex-shrink-0" />}
                  {refreshResult.success
                    ? refreshResult.solDomain
                      ? `Found .sol domain: ${refreshResult.solDomain}. Rescanning score...`
                      : `Trust signals refreshed. Rescanning score...`
                    : refreshResult.error || 'Refresh failed'}
                </div>
              )}
              <div className="h-2 bg-brand-border rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, #EC81FF, #B84FCC)' }} initial={{ width: 0 }} animate={{ width: `${trustPct}%` }} transition={{ duration: 1, ease: 'easeOut' }} />
              </div>
              <p className="text-[10px] text-brand-muted mt-2 text-center">
                {trustPct < 30 ? 'Getting started. Connect more trust signals to unlock higher loan levels.'
                  : trustPct < 60 ? 'Good progress. Keep building your trust profile.'
                  : trustPct < 85 ? 'Strong trust profile. You are well-positioned for premium borrowing.'
                  : 'Elite trust level. Maximum credibility achieved.'}
              </p>
            </motion.div>

            {/* Trust Signals Grid */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white">Identity Signals</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TrustSignalCard icon={XIcon} label="X Verification" pts={breakdown.xVerification || 0} maxPts={SCORE_FACTORS.xVerification.max}
                  status={xIsActive ? 'active' : 'inactive'} value={xValueText} delay={0.1}>
                  {xAccount.loading ? (
                    <div className="flex items-center gap-2 text-xs text-brand-muted">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking X connection...
                    </div>
                  ) : xIsActive ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-xs text-green-400 font-semibold">Verified</span>
                        {xAccount.username && <span className="text-xs text-brand-muted">@{xAccount.username}</span>}
                      </div>
                      <button
                        onClick={() => xAccount.disconnect()}
                        className="flex items-center gap-1 text-xs text-red-400/60 hover:text-red-400 transition-colors"
                      >
                        <Unlink className="w-3 h-3" /> Disconnect
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => xAccount.startConnect()}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-brand-accent/10 border border-brand-accent/20 text-xs font-semibold text-brand-accent hover:bg-brand-accent/20 transition-colors"
                    >
                      <XIcon className="w-3.5 h-3.5" /> Connect X Account
                    </button>
                  )}
                </TrustSignalCard>
                <TrustSignalCard icon={Hash} label=".sol Identity" pts={breakdown.solIdentity || 0} maxPts={SCORE_FACTORS.solIdentity.max}
                  status={(breakdown.solIdentity || 0) > 0 ? 'active' : 'inactive'} value={scoreData?.solDomain ? `Domain: ${scoreData.solDomain}` : 'Claim a .sol domain via SNS.id'}
                  action={{ type: 'external', href: 'https://sns.id', label: 'Get .sol domain' }} delay={0.15} />
              </div>

              <h3 className="text-sm font-semibold text-white mt-6">Cross-Chain Credit</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TrustSignalCard icon={Globe} label="Cross-Chain (Ika)" pts={breakdown.crossChain || 0} maxPts={SCORE_FACTORS.crossChain.max}
                  status={crossChainCount > 0 ? 'active' : 'inactive'}
                  value={crossChainCount > 0 ? `${crossChainCount} wallet${crossChainCount > 1 ? 's' : ''} connected (+${crossChainBoost} pts)` : 'Import EVM / BTC wallet reputation'}
                  action={{ type: 'link', to: '/trust-score/cross-chain', label: 'Manage wallets' }} delay={0.2} />
                <TrustSignalCard icon={Award} label="Superteam PoW" pts={breakdown.superteam || 0} maxPts={SCORE_FACTORS.superteam.max}
                  status={(breakdown.superteam || 0) > 0 ? 'active' : 'inactive'} value="Verified Superteam contributors get an additional trust signal"
                  action={{ type: 'soon', label: 'Coming soon' }} delay={0.25} />
              </div>

              <h3 className="text-sm font-semibold text-white mt-6">Credit History</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TrustSignalCard icon={RefreshCw} label="Repayment History" pts={breakdown.repayment || 0} maxPts={SCORE_FACTORS.repayment.max}
                  status={cleanRepayments > 0 ? 'active' : 'inactive'}
                  value={cleanRepayments > 0 ? `${cleanRepayments} clean repayment${cleanRepayments > 1 ? 's' : ''}` : 'Borrow and repay on time to build history'}
                  action={{ type: 'link', to: '/borrow', label: 'Borrow now' }} delay={0.3} />
                <TrustSignalCard icon={Zap} label="Credit Maturity" pts={breakdown.creditMaturity || 0} maxPts={SCORE_FACTORS.creditMaturity.max}
                  status={(breakdown.creditMaturity || 0) > 0 ? 'active' : 'inactive'} value="Bonus awarded as you climb through loan levels" delay={0.35} />
              </div>

              {/* DeFi Protocol Detection */}
              {scoreData?.detectedProtocols?.length > 0 && (
                <>
                  <h3 className="text-sm font-semibold text-white mt-6">Detected DeFi Protocols</h3>
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}
                    className="bg-brand-card rounded-2xl border border-brand-border p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center flex-shrink-0">
                        <Layers className="w-5 h-5 text-brand-accent" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">On-Chain Protocol Activity</p>
                        <p className="text-xs text-brand-muted">{scoreData.detectedProtocols.length} DeFi protocol{scoreData.detectedProtocols.length > 1 ? 's' : ''} detected in recent transactions</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {scoreData.detectedProtocols.map((protocol) => (
                        <span key={protocol} className="px-3 py-1.5 rounded-lg bg-brand-accent/10 border border-brand-accent/20 text-xs font-semibold text-brand-accent">
                          {protocol}
                        </span>
                      ))}
                    </div>
                    <p className="text-[10px] text-brand-muted mt-3">Detected from your 20 most recent transactions. Protocol diversity contributes to your score.</p>
                  </motion.div>
                </>
              )}

              <h3 className="text-sm font-semibold text-white mt-6">Privacy</h3>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-brand-card rounded-2xl border border-brand-border p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Private Mode (Encrypt)</p>
                      <p className="text-xs text-brand-muted">{privateMode?.isPrivate ? 'Active. Score hidden from public view.' : 'Encrypt your score data with FHE via Encrypt Protocol.'}</p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${privateMode?.isPrivate ? 'bg-purple-500/20 text-purple-400' : 'bg-brand-border text-brand-muted'}`}>
                    {privateMode?.isPrivate ? 'On' : 'Off'}
                  </div>
                </div>
                {privateMode?.encryptionTx && (
                  <a href={`https://explorer.solana.com/tx/${privateMode.encryptionTx}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs text-brand-accent hover:underline">
                    View encryption tx <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </motion.div>
            </div>

            {/* How Trust Works */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="mt-8 bg-brand-card rounded-2xl border border-brand-border p-6">
              <h3 className="text-base font-bold text-white mb-4">How Trust Scoring Works</h3>
              <div className="space-y-3">
                {[
                  { title: 'Activity Signals', desc: 'Wallet age, transaction volume, protocol diversity, and portfolio value form your base credit score.' },
                  { title: 'Identity Signals', desc: 'Verified social accounts (.sol, X) prove you are a real person with an established online presence.' },
                  { title: 'Cross-Chain Credit', desc: 'Ika dWallet MPC lets you import ETH/BTC wallet history without bridging, adding up to +90 pts.' },
                  { title: 'Credit History', desc: 'Each on-time Lendra repayment adds +25 pts. Early repayments earn bonus points. Late payments incur penalties.' },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <CheckCircle className="w-4 h-4 text-brand-accent mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="text-xs text-brand-muted leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
