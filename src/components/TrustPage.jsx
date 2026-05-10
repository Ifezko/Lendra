import React from 'react';
import { motion } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import { Link } from 'react-router-dom';
import {
  Globe, Shield, CheckCircle, Zap,
  Hash, Award, RefreshCw, Lock, ArrowUpRight, ExternalLink,
} from 'lucide-react';
import { useAppContext } from '../App';
import { SCORE_FACTORS } from '../hooks/useCreditScore';

function XIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function TrustSignalCard({ icon: Icon, label, pts, maxPts, value, status, action, delay = 0 }) {
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
      {action && action.type !== 'soon' && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-brand-accent font-semibold">{action.label}</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-brand-muted group-hover:text-brand-accent transition-colors" />
        </div>
      )}
      {action && action.type === 'soon' && (
        <span className="text-xs font-medium text-brand-muted bg-brand-border px-2 py-0.5 rounded-full">Coming soon</span>
      )}
    </motion.div>
  );
  if (action?.type === 'link') return <Link to={action.to}>{content}</Link>;
  if (action?.type === 'external') return <a href={action.href} target="_blank" rel="noopener noreferrer">{content}</a>;
  return content;
}

export default function TrustPage() {
  const { connected } = useWallet();
  const ctx = useAppContext();
  const scoreData = ctx?.scoreData;
  const ika = ctx?.ika;
  const privateMode = ctx?.privateMode;

  if (!connected) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-20 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-brand-card rounded-2xl border border-brand-border p-8">
          <Shield className="w-12 h-12 text-brand-accent mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Trust Profile</h2>
          <p className="text-sm text-brand-muted">Connect your Solana wallet to view and build your trust profile.</p>
        </motion.div>
      </div>
    );
  }

  const breakdown = scoreData?.breakdown || {};
  const crossChainCount = ika?.connectedChains?.length || 0;
  const crossChainBoost = ika?.totalCrossChainBoost || 0;
  const cleanRepayments = scoreData?.cleanRepayments || 0;

  const trustSignals = [
    breakdown.repayment || 0, breakdown.xVerification || 0, breakdown.crossChain || 0,
    breakdown.solIdentity || 0, breakdown.superteam || 0, breakdown.creditMaturity || 0, breakdown.borrowGrowth || 0,
  ];
  const totalTrustPts = trustSignals.reduce((a, b) => a + b, 0);
  const maxTrustPts = SCORE_FACTORS.repayment.max + SCORE_FACTORS.xVerification.max +
    SCORE_FACTORS.crossChain.max + SCORE_FACTORS.solIdentity.max + SCORE_FACTORS.superteam.max +
    SCORE_FACTORS.creditMaturity.max + SCORE_FACTORS.borrowGrowth.max;
  const trustPct = maxTrustPts > 0 ? Math.round((totalTrustPts / maxTrustPts) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 pt-8 pb-20">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-brand-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Trust Profile</h1>
            <p className="text-sm text-brand-muted">Build your on-chain reputation. Each signal strengthens your Lendra credit identity.</p>
          </div>
        </div>
      </motion.div>

      {/* Trust Summary */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-6 bg-brand-card rounded-2xl border border-brand-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-brand-muted uppercase tracking-wider mb-1">Earned Trust Signals</p>
            <p className="text-3xl font-bold text-white">+{totalTrustPts}</p>
            <p className="text-xs text-brand-muted">of {maxTrustPts} possible trust signal points</p>
          </div>
          <div className="w-20 h-20">
            <svg viewBox="0 0 36 36" className="w-full h-full">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#1E1E2A" strokeWidth="3" />
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="url(#trustGrad)" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${trustPct}, 100`} />
              <defs><linearGradient id="trustGrad"><stop offset="0%" stopColor="#EC81FF" /><stop offset="100%" stopColor="#B84FCC" /></linearGradient></defs>
              <text x="18" y="20" textAnchor="middle" className="fill-white text-[8px] font-bold">{trustPct}%</text>
            </svg>
          </div>
        </div>
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
      <div className="mt-6 space-y-4">
        <h3 className="text-sm font-semibold text-white">Identity Signals</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TrustSignalCard icon={XIcon} label="X Verification" pts={breakdown.xVerification || 0} maxPts={SCORE_FACTORS.xVerification.max}
            status={(breakdown.xVerification || 0) > 0 ? 'active' : 'inactive'} value={(breakdown.xVerification || 0) > 0 ? 'Account verified via OAuth' : 'Link your X account to prove social identity'}
            action={{ type: 'soon', label: 'Coming soon' }} delay={0.15} />
          <TrustSignalCard icon={Hash} label=".sol Identity" pts={breakdown.solIdentity || 0} maxPts={SCORE_FACTORS.solIdentity.max}
            status={(breakdown.solIdentity || 0) > 0 ? 'active' : 'inactive'} value={scoreData?.solDomain ? `Domain: ${scoreData.solDomain}` : 'Claim a .sol domain via SNS.id'}
            action={{ type: 'external', href: 'https://sns.id', label: 'Get .sol domain' }} delay={0.2} />
        </div>

        <h3 className="text-sm font-semibold text-white mt-6">Cross-Chain Credit</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TrustSignalCard icon={Globe} label="Cross-Chain (Ika)" pts={breakdown.crossChain || 0} maxPts={SCORE_FACTORS.crossChain.max}
            status={crossChainCount > 0 ? 'active' : 'inactive'}
            value={crossChainCount > 0 ? `${crossChainCount} wallet${crossChainCount > 1 ? 's' : ''} connected (+${crossChainBoost} pts)` : 'Import EVM / BTC wallet reputation'}
            action={{ type: 'link', to: '/cross-chain', label: 'Manage wallets' }} delay={0.25} />
          <TrustSignalCard icon={Award} label="Superteam PoW" pts={breakdown.superteam || 0} maxPts={SCORE_FACTORS.superteam.max}
            status={(breakdown.superteam || 0) > 0 ? 'active' : 'inactive'} value="Verified Superteam contributors get an additional trust signal"
            action={{ type: 'soon', label: 'Coming soon' }} delay={0.3} />
        </div>

        <h3 className="text-sm font-semibold text-white mt-6">Credit History</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TrustSignalCard icon={RefreshCw} label="Repayment History" pts={breakdown.repayment || 0} maxPts={SCORE_FACTORS.repayment.max}
            status={cleanRepayments > 0 ? 'active' : 'inactive'}
            value={cleanRepayments > 0 ? `${cleanRepayments} clean repayment${cleanRepayments > 1 ? 's' : ''}` : 'Borrow and repay on time to build history'}
            action={{ type: 'link', to: '/borrow', label: 'Borrow now' }} delay={0.35} />
          <TrustSignalCard icon={Zap} label="Credit Maturity" pts={breakdown.creditMaturity || 0} maxPts={SCORE_FACTORS.creditMaturity.max}
            status={(breakdown.creditMaturity || 0) > 0 ? 'active' : 'inactive'} value="Bonus awarded as you climb through loan levels" delay={0.4} />
        </div>

        <h3 className="text-sm font-semibold text-white mt-6">Privacy</h3>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="bg-brand-card rounded-2xl border border-brand-border p-5">
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
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-8 bg-brand-card rounded-2xl border border-brand-border p-6">
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
    </div>
  );
}
