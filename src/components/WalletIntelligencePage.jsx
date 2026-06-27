import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, Coins, Flame, Layers, RefreshCw, ChevronRight, Info, ShieldCheck,
  AlertCircle, Lock, BarChart3, TrendingUp, TrendingDown, Minus, Clock, Users, Droplets,
} from 'lucide-react';
import { useAppContext } from '../App';
import { useWalletIntelligence } from '../hooks/useWalletIntelligence';
import { API_BASE_URL } from '../config';

// Wallet Intelligence (PRD §5.6 / §5.6.8) — the separate full-report page.
// REQUIRED NAMING: "Wallet Intelligence" / "Wallet Activity Report" — never
// "Credit Report" (§5.6.1). Everything here is display-only (§5.6.8): nothing
// shown feeds the score. No behavioral editorializing (§5.6.2).

function Card({ children, className = '' }) {
  return <div className={`bg-brand-card rounded-2xl border border-brand-border p-5 ${className}`}>{children}</div>;
}
function Stat({ label, value, sub }) {
  return (
    <div className="bg-brand-bg/50 rounded-xl p-3">
      <p className="text-[10px] text-brand-muted truncate">{label}</p>
      <p className="text-sm font-bold text-white mt-0.5">{value}</p>
      {sub && <p className="text-[10px] text-brand-muted/70 mt-0.5">{sub}</p>}
    </div>
  );
}
const CATEGORY_ORDER = ['swap', 'lending', 'lp_yield', 'other'];

// Lightweight sparkline for the score trajectory (no chart lib).
function Sparkline({ points }) {
  const w = 280, h = 56, pad = 4;
  const scores = points.map((p) => p.score);
  const min = Math.min(...scores), max = Math.max(...scores);
  const span = max - min || 1;
  const stepX = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0;
  const coords = points.map((p, i) => {
    const x = pad + i * stepX;
    const y = h - pad - ((p.score - min) / span) * (h - pad * 2);
    return [x, y];
  });
  const d = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-14" preserveAspectRatio="none">
      <path d={d} fill="none" stroke="#EC81FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {coords.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2" fill="#EC81FF" />)}
    </svg>
  );
}

export default function WalletIntelligencePage() {
  const ctx = useAppContext();
  const scoreData = ctx?.scoreData;
  const isPrivate = ctx?.privateMode?.isPrivate;
  const walletAddress = scoreData?.walletAddress || '';
  const { loading, error, data, load } = useWalletIntelligence();

  const [trajectory, setTrajectory] = useState(null);
  const [percentile, setPercentile] = useState(null);

  const fetchExtras = useCallback(async (addr) => {
    const base = API_BASE_URL || '';
    try {
      const [t, p] = await Promise.all([
        fetch(`${base}/api/wallet/score-trajectory?wallet=${addr}`).then((r) => r.json()).catch(() => null),
        fetch(`${base}/api/wallet/peer-percentile?wallet=${addr}`).then((r) => r.json()).catch(() => null),
      ]);
      if (t?.ok) setTrajectory(t);
      if (p?.ok) setPercentile(p);
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    if (walletAddress) { load(walletAddress); fetchExtras(walletAddress); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress]);

  const onRefresh = () => {
    if (!walletAddress) return;
    load(walletAddress, { refresh: true });
    fetchExtras(walletAddress);
  };

  const grouped = useMemo(() => {
    const g = {};
    for (const p of (data?.protocol_activity || [])) (g[p.category] = g[p.category] || []).push(p);
    return g;
  }, [data]);

  const usd = (n) => (isPrivate ? '••••' : `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
  const sol = (n) => `${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL`;

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
        <Card><div className="text-center py-10">
          <Activity className="w-12 h-12 text-brand-accent mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-bold text-white mb-2">Connect your wallet</h2>
          <p className="text-sm text-brand-muted">Wallet Intelligence reads your on-chain activity after a scan.</p>
        </div></Card>
      </div>
    );
  }

  const age = data?.wallet_age;
  const cadence = data?.cadence;
  const liq = data?.liquidity;
  const TrendIcon = trajectory?.direction === 'up' ? TrendingUp : trajectory?.direction === 'down' ? TrendingDown : Minus;

  return (
    <div className="max-w-5xl mx-auto px-4 pb-20 pt-4">
      <div className="flex items-start justify-between mb-2 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Wallet Intelligence</h1>
          <p className="text-sm text-brand-muted mt-1">What your on-chain activity says about you — full history since wallet creation.</p>
        </div>
        <button onClick={onRefresh} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-brand-border text-brand-muted hover:text-white hover:bg-brand-cardHover text-xs font-medium transition-all flex-shrink-0 disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Computing…' : 'Refresh Wallet Scan'}
        </button>
      </div>
      <p className="text-[11px] text-brand-muted/70 mb-6">This is a wallet activity report, not a credit report. Your Lendra Score is shown for context only.</p>

      {loading && !data && (
        <Card><div className="py-10 text-center text-sm text-brand-muted">Computing full history… this can take a moment on an active wallet.</div></Card>
      )}
      {error && !loading && (
        <Card className="border-red-500/20 bg-red-500/5">
          <div className="flex items-center gap-2 text-red-300 text-sm"><AlertCircle className="w-4 h-4" /> {error}</div>
          <button onClick={onRefresh} className="mt-3 px-4 py-2 rounded-xl bg-brand-accent text-[#0A0A0F] text-xs font-semibold">Retry</button>
        </Card>
      )}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Wallet summary */}
          <Card className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-3"><BarChart3 className="w-4 h-4 text-brand-accent" /><h3 className="text-sm font-bold text-white">Wallet summary</h3></div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="Lendra Score" value={scoreData?.score != null ? `${scoreData.score}/1000` : '—'} />
              <Stat label="Wallet age" value={age?.label || '—'} sub={age?.first_seen ? `since ${new Date(age.first_seen).toLocaleDateString()}` : (age && !age.verified ? 'first tx not resolved' : null)} />
              <Stat label="Transactions" value={data.lifetime_tx_count != null ? `${data.history_complete ? '' : '≥'}${Number(data.lifetime_tx_count).toLocaleString()}` : '—'} sub="since creation" />
              <Stat label="Top activity" value={data.top_category_label || 'None'} />
            </div>
            {percentile?.available && (
              <div className="mt-3 flex items-start gap-2 text-xs text-brand-muted">
                <Users className="w-3.5 h-3.5 mt-0.5 text-brand-accent flex-shrink-0" />
                <span>More active than <span className="text-white font-semibold">{percentile.percentile}%</span> of wallets <span className="text-brand-muted/70">({percentile.qualifier}, n={percentile.sample_size})</span></span>
              </div>
            )}
          </Card>

          {/* Score trajectory */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2"><Activity className="w-4 h-4 text-brand-accent" /><h3 className="text-sm font-bold text-white">Score trajectory</h3></div>
              {trajectory?.renderable && <span className="flex items-center gap-1 text-xs text-brand-muted"><TrendIcon className="w-3.5 h-3.5" />{trajectory.direction}</span>}
            </div>
            {trajectory?.renderable ? (
              <>
                <Sparkline points={trajectory.points} />
                <div className="mt-3 space-y-1.5 max-h-32 overflow-y-auto sidebar-scroll">
                  {[...trajectory.points].reverse().slice(0, 5).map((pt, i) => (
                    <div key={i} className="flex items-center justify-between text-[11px]">
                      <span className="text-brand-muted">{new Date(pt.at).toLocaleDateString()}{pt.reason ? ` · ${pt.reason}` : ''}</span>
                      <span className="text-white font-medium">{pt.score}{pt.delta != null && pt.delta !== 0 ? <span className={pt.delta > 0 ? 'text-green-400' : 'text-red-400'}> {pt.delta > 0 ? '+' : ''}{pt.delta}</span> : ''}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xs text-brand-muted py-4 text-center">Scan again to start your trajectory. We chart only your real scans — no estimated history.</p>
            )}
          </Card>

          {/* Activity cadence */}
          <Card>
            <div className="flex items-center gap-2 mb-3"><Clock className="w-4 h-4 text-brand-accent" /><h3 className="text-sm font-bold text-white">Activity cadence</h3></div>
            {cadence?.active_months != null && cadence?.total_months != null ? (
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Active months" value={`${cadence.active_months} of ${cadence.total_months}`} sub="since creation" />
                <Stat label="Lifetime transactions" value={data.lifetime_tx_count != null ? Number(data.lifetime_tx_count).toLocaleString() : '—'} />
              </div>
            ) : (
              <p className="text-xs text-brand-muted">Cadence will appear after the full-history scan completes.</p>
            )}
          </Card>

          {/* Protocol activity by category */}
          <Card>
            <div className="flex items-center gap-2 mb-3"><Layers className="w-4 h-4 text-brand-accent" /><h3 className="text-sm font-bold text-white">Protocol activity by category</h3></div>
            {(data.protocol_activity?.length || 0) === 0 && (data.stablecoin_flow?.tx_count || 0) === 0 ? (
              <p className="text-xs text-brand-muted">No registry protocol activity detected.</p>
            ) : (
              <div className="space-y-4">
                {CATEGORY_ORDER.filter((c) => grouped[c]?.length).map((cat) => (
                  <div key={cat}>
                    <p className="text-[11px] uppercase tracking-wide text-brand-muted mb-1.5">{grouped[cat][0].category_label}</p>
                    <div className="space-y-1.5">
                      {grouped[cat].map((p) => (
                        <div key={p.name} className="flex items-center justify-between text-xs">
                          <span className="text-white">{p.name}</span>
                          <span className="text-brand-muted">{p.interactions} interaction{p.interactions === 1 ? '' : 's'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {(data.stablecoin_flow?.tx_count || 0) > 0 && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-brand-muted mb-1.5">Stablecoin transfers</p>
                    <div className="flex items-center justify-between text-xs"><span className="text-white">USDC / USDT</span><span className="text-brand-muted">{data.stablecoin_flow.tx_count} transactions</span></div>
                  </div>
                )}
                {data.unverified_activity_count > 0 && (
                  <p className="text-[11px] text-brand-muted/70 flex items-start gap-1.5">
                    <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    {data.unverified_activity_count} interaction{data.unverified_activity_count === 1 ? '' : 's'} with programs we couldn’t verify (deprecated/unknown) — shown for completeness, not interpreted.
                  </p>
                )}
              </div>
            )}
          </Card>

          {/* Stablecoin behavior */}
          <Card>
            <div className="flex items-center gap-2 mb-1"><Coins className="w-4 h-4 text-brand-accent" /><h3 className="text-sm font-bold text-white">Stablecoin behavior</h3>{isPrivate && <Lock className="w-3 h-3 text-brand-muted ml-1" />}</div>
            <p className="text-[11px] text-brand-muted mb-3">USDC / USDT, valued at the ~$1 peg.</p>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Sent" value={usd(data.stablecoin_flow?.sent_usd)} />
              <Stat label="Received" value={usd(data.stablecoin_flow?.received_usd)} />
              <Stat label="Transactions" value={(data.stablecoin_flow?.tx_count || 0).toLocaleString()} />
            </div>
          </Card>

          {/* Liquidity stability */}
          <Card>
            <div className="flex items-center gap-2 mb-1"><Droplets className="w-4 h-4 text-brand-accent" /><h3 className="text-sm font-bold text-white">Liquidity stability</h3>{isPrivate && <Lock className="w-3 h-3 text-brand-muted ml-1" />}</div>
            {liq?.floor_usd != null && liq?.days > 0 && !isPrivate ? (
              <p className="text-sm text-brand-muted mt-2">Your USDC balance stayed above <span className="text-white font-semibold">${Number(liq.floor_usd).toLocaleString()}</span> across the <span className="text-white font-semibold">{liq.days}</span> days of scanned history.</p>
            ) : isPrivate ? (
              <p className="text-sm text-brand-muted mt-2">Hidden in Private Mode.</p>
            ) : (
              <p className="text-xs text-brand-muted mt-2">Not enough USDC balance history to observe a floor.</p>
            )}
            <p className="text-[10px] text-brand-muted/60 mt-2">Observation only — not an affordability or approval assessment.</p>
          </Card>

          {/* Fee summary */}
          <Card className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="w-4 h-4 text-brand-accent" /><h3 className="text-sm font-bold text-white">Fee summary</h3>
              <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded border border-green-500/30 text-green-400 bg-green-500/5">Exact</span>
            </div>
            <p className="text-sm text-brand-muted mb-3">You spent <span className="text-white font-semibold">~{sol(data.fees?.total_sol)}</span> in network and priority fees across the scanned history.</p>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Network (base)" value={sol(data.fees?.network_sol)} />
              <Stat label="Priority" value={sol(data.fees?.priority_sol)} />
              <Stat label="Total" value={sol(data.fees?.total_sol)} />
            </div>
            <p className="text-[11px] text-brand-muted/70 mt-3 flex items-start gap-1.5">
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
              Network and priority fees are exact (from on-chain data). Per-protocol platform-fee estimates are a later release and will be labelled “estimated.”
            </p>
          </Card>

          {/* Score-factor explanation */}
          <Card>
            <div className="flex items-center gap-2 mb-2"><ShieldCheck className="w-4 h-4 text-brand-accent" /><h3 className="text-sm font-bold text-white">What this means for your score</h3></div>
            <p className="text-xs text-brand-muted leading-relaxed mb-3">This activity is shown to explain your profile — it is not itself scored. Your Lendra Score comes from recent wallet activity and earned trust signals.</p>
            <Link to="/trust-score" className="inline-flex items-center gap-1 text-xs text-brand-accent hover:underline">View full score breakdown <ChevronRight className="w-3 h-3" /></Link>
          </Card>

          {/* Areas to improve */}
          <Card>
            <div className="flex items-center gap-2 mb-2"><Activity className="w-4 h-4 text-brand-accent" /><h3 className="text-sm font-bold text-white">Areas to improve</h3></div>
            {improvements.length === 0 ? (
              <p className="text-xs text-brand-muted">You've completed the available trust signals. Keep repaying on time to climb tiers.</p>
            ) : (
              <ul className="space-y-2">
                {improvements.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-brand-muted"><ChevronRight className="w-3 h-3 mt-0.5 text-brand-accent flex-shrink-0" />{tip}</li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
