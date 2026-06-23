import React, { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, Coins, Flame, Layers, RefreshCw, ChevronRight,
  Info, ShieldCheck, AlertCircle, Lock, BarChart3,
} from 'lucide-react';
import { useAppContext } from '../App';
import { useWalletIntelligence } from '../hooks/useWalletIntelligence';

// Wallet Intelligence (PRD 5.6) — the separate full-report page.
// REQUIRED NAMING: this page is "Wallet Intelligence" / "Wallet Activity
// Report" — never "Credit Report" (5.6.1, regulated term). "Credit" attaches
// to the score, never to this document.

function Card({ children, className = '' }) {
  return (
    <div className={`bg-brand-card rounded-2xl border border-brand-border p-5 ${className}`}>
      {children}
    </div>
  );
}

// Display order for categories (PRD 5.6.2). 'other' is intentionally last and
// labelled "Other protocol activity" so no NFT/memecoin category is invented.
const CATEGORY_ORDER = ['swap', 'lending', 'lp_yield', 'other'];

export default function WalletIntelligencePage() {
  const ctx = useAppContext();
  const scoreData = ctx?.scoreData;
  const isPrivate = ctx?.privateMode?.isPrivate;
  const walletAddress = scoreData?.walletAddress || '';
  const { loading, error, data, cached, load } = useWalletIntelligence();

  useEffect(() => {
    if (walletAddress) load(walletAddress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress]);

  // Group protocol activity by category (human language; never program IDs).
  const grouped = useMemo(() => {
    const g = {};
    for (const p of (data?.protocol_activity || [])) {
      (g[p.category] = g[p.category] || []).push(p);
    }
    return g;
  }, [data]);

  const usd = (n) => (isPrivate ? '••••' : `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
  const sol = (n) => `${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL`;

  // Non-gameable "areas to improve" (PRD 5.6.5 — never teach self-fundable gain).
  const improvements = useMemo(() => {
    const out = [];
    const bd = scoreData?.breakdown || {};
    if (!scoreData?.solDomain) out.push('Link a .sol identity (SNS) to add a verified trust signal.');
    if ((bd.xVerification || 0) === 0) out.push('Connect X to add a verified trust signal.');
    if ((scoreData?.cleanRepayments || 0) === 0) out.push('Repay a lower-tier loan on time to start building repayment history.');
    if ((scoreData?.connectedChains?.length || 0) === 0) out.push('Connect an external-chain wallet (cross-chain credit) to deepen your profile.');
    return out;
  }, [scoreData]);

  if (!walletAddress) {
    return (
      <div className="max-w-5xl mx-auto px-4 pt-12">
        <Card>
          <div className="text-center py-10">
            <Activity className="w-12 h-12 text-brand-accent mx-auto mb-4 opacity-50" />
            <h2 className="text-xl font-bold text-white mb-2">Connect your wallet</h2>
            <p className="text-sm text-brand-muted">Wallet Intelligence reads your on-chain activity after a scan.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 pb-20 pt-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-2 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Wallet Intelligence</h1>
          <p className="text-sm text-brand-muted mt-1">
            What your on-chain activity says about you — based on the last {data?.window_days || 90} days.
          </p>
        </div>
        <button
          onClick={() => load(walletAddress, { refresh: true })}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-brand-border text-brand-muted hover:text-white hover:bg-brand-cardHover text-xs font-medium transition-all flex-shrink-0 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Analyzing…' : 'Refresh'}
        </button>
      </div>

      {/* Wallet activity report — explicit non-"credit report" framing */}
      <p className="text-[11px] text-brand-muted/70 mb-6">
        This is a wallet activity report, not a credit report. Your Lendra Score is shown for context only.
      </p>

      {loading && !data && (
        <Card><div className="py-10 text-center text-sm text-brand-muted">Reading your last {data?.window_days || 90} days of on-chain activity…</div></Card>
      )}

      {error && !loading && (
        <Card className="border-red-500/20 bg-red-500/5">
          <div className="flex items-center gap-2 text-red-300 text-sm">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
          <button onClick={() => load(walletAddress, { refresh: true })} className="mt-3 px-4 py-2 rounded-xl bg-brand-accent text-[#0A0A0F] text-xs font-semibold">Retry</button>
        </Card>
      )}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Wallet summary */}
          <Card className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-brand-accent" />
              <h3 className="text-sm font-bold text-white">Wallet summary</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="Lendra Score" value={scoreData?.score != null ? `${scoreData.score}/1000` : '—'} />
              <Stat label="Tier" value={scoreData?.tier?.label || '—'} />
              <Stat label="Transactions scanned" value={(data.tx_scanned || 0).toLocaleString()} />
              <Stat label="Top activity" value={data.top_category_label || 'None'} />
            </div>
            {!data.window_complete && (
              <p className="text-[11px] text-brand-muted/70 mt-3">
                Showing your most recent {(data.tx_scanned || 0).toLocaleString()} transactions (very active wallet).
              </p>
            )}
          </Card>

          {/* Protocol activity by category */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-brand-accent" />
              <h3 className="text-sm font-bold text-white">Protocol activity by category</h3>
            </div>
            {(data.protocol_activity?.length || 0) === 0 && data.stablecoin_flow?.tx_count === 0 ? (
              <p className="text-xs text-brand-muted">No registry protocol activity detected in this window.</p>
            ) : (
              <div className="space-y-4">
                {CATEGORY_ORDER.filter((c) => grouped[c]?.length).map((cat) => (
                  <div key={cat}>
                    <p className="text-[11px] uppercase tracking-wide text-brand-muted mb-1.5">
                      {grouped[cat][0].category_label}
                    </p>
                    <div className="space-y-1.5">
                      {grouped[cat].map((p) => (
                        <div key={p.name} className="flex items-center justify-between text-xs">
                          <span className="text-white">{p.name}</span>
                          <span className="text-brand-muted">
                            {p.interactions} interaction{p.interactions === 1 ? '' : 's'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {data.stablecoin_flow?.tx_count > 0 && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-brand-muted mb-1.5">Stablecoin transfers</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white">USDC / USDT</span>
                      <span className="text-brand-muted">{data.stablecoin_flow.tx_count} transactions</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Stablecoin behavior */}
          <Card>
            <div className="flex items-center gap-2 mb-1">
              <Coins className="w-4 h-4 text-brand-accent" />
              <h3 className="text-sm font-bold text-white">Stablecoin behavior</h3>
              {isPrivate && <Lock className="w-3 h-3 text-brand-muted ml-1" />}
            </div>
            <p className="text-[11px] text-brand-muted mb-3">USDC / USDT, valued at the ~$1 peg.</p>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Sent" value={usd(data.stablecoin_flow?.sent_usd)} />
              <Stat label="Received" value={usd(data.stablecoin_flow?.received_usd)} />
              <Stat label="Transactions" value={(data.stablecoin_flow?.tx_count || 0).toLocaleString()} />
            </div>
          </Card>

          {/* Fee summary */}
          <Card className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="w-4 h-4 text-brand-accent" />
              <h3 className="text-sm font-bold text-white">Fee summary</h3>
              <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded border border-green-500/30 text-green-400 bg-green-500/5">Exact</span>
            </div>
            <p className="text-sm text-brand-muted mb-3">
              You spent <span className="text-white font-semibold">~{sol(data.fees?.total_sol)}</span> in network and priority fees across{' '}
              {(data.fees?.tx_count || 0).toLocaleString()} transactions over the last {data.window_days || 90} days
              {data.fees?.usd != null ? <> (≈ {usd(data.fees.usd)}).</> : '.'}
            </p>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Network (base)" value={sol(data.fees?.network_sol)} />
              <Stat label="Priority" value={sol(data.fees?.priority_sol)} />
              <Stat label="Total" value={sol(data.fees?.total_sol)} />
            </div>
            <p className="text-[11px] text-brand-muted/70 mt-3 flex items-start gap-1.5">
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
              Network and priority fees are exact (from on-chain data). Per-protocol platform-fee estimates are coming in a later release and will be clearly labelled “estimated.” Fees are evidence of real wallet usage.
            </p>
          </Card>

          {/* Score-factor explanation */}
          <Card>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-brand-accent" />
              <h3 className="text-sm font-bold text-white">What this means for your score</h3>
            </div>
            <p className="text-xs text-brand-muted leading-relaxed mb-3">
              This activity is shown to explain your profile — it is not itself scored. Your Lendra Score comes from wallet activity and earned trust signals.
            </p>
            <Link to="/trust-score" className="inline-flex items-center gap-1 text-xs text-brand-accent hover:underline">
              View full score breakdown <ChevronRight className="w-3 h-3" />
            </Link>
          </Card>

          {/* Areas to improve (non-gameable) */}
          <Card>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-brand-accent" />
              <h3 className="text-sm font-bold text-white">Areas to improve</h3>
            </div>
            {improvements.length === 0 ? (
              <p className="text-xs text-brand-muted">You've completed the available trust signals. Keep repaying on time to climb tiers.</p>
            ) : (
              <ul className="space-y-2">
                {improvements.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-brand-muted">
                    <ChevronRight className="w-3 h-3 mt-0.5 text-brand-accent flex-shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-brand-bg/50 rounded-xl p-3">
      <p className="text-[10px] text-brand-muted truncate">{label}</p>
      <p className="text-sm font-bold text-white mt-0.5">{value}</p>
    </div>
  );
}
