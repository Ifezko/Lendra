import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../useAdminAuth';
import { BarChart3, TrendingUp, Users, Activity, Loader2, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';

function MetricRow({ label, value, prev, format = 'number' }) {
  const diff = prev ? ((value - prev) / prev * 100).toFixed(1) : 0;
  const up = diff >= 0;
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#1E1E2A] last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-white">
          {format === 'currency' ? `$${value.toLocaleString()}` : value.toLocaleString()}
        </span>
        {prev !== undefined && (
          <span className={`flex items-center gap-0.5 text-[10px] font-medium ${up ? 'text-emerald-400' : 'text-red-400'}`}>
            {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(diff)}%
          </span>
        )}
      </div>
    </div>
  );
}

function MiniBar({ label, value, max, color = '#EC81FF' }) {
  const pct = max > 0 ? (value / max * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-400">{label}</span>
        <span className="text-[11px] text-white font-medium">{value}</span>
      </div>
      <div className="h-1.5 bg-[#1E1E2A] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export default function Analytics() {
  const { adminFetch } = useAdminAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('7d');

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await adminFetch(`/api/admin/analytics?range=${range}`);
        if (res.ok) setData(await res.json());
      } catch {}
      setLoading(false);
    };
    fetch_();
  }, [adminFetch, range]);

  const d = data || {
    walletGrowth: { current: 0, previous: 0 },
    loanVolume: { current: 0, previous: 0 },
    activeUsers: { current: 0, previous: 0 },
    avgSession: { current: 0, previous: 0 },
    scoreBreakdown: [],
    topActions: [],
    dailyLoans: [],
    retentionRate: 0,
    bounceRate: 0,
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Analytics</h1>
          <p className="text-xs text-slate-500 mt-1">Platform usage metrics and trends</p>
        </div>
        <div className="flex items-center gap-1 bg-[#12121E] border border-[#1E1E2A] rounded-xl p-1">
          {['24h', '7d', '30d', '90d'].map((r) => (
            <button
              key={r}
              onClick={() => { setRange(r); setLoading(true); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                range === r ? 'bg-[#EC81FF]/10 text-[#EC81FF]' : 'text-slate-500 hover:text-white'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-[#EC81FF] animate-spin" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#EC81FF]" /> Key Metrics
              </h3>
              <MetricRow label="New Wallets" value={d.walletGrowth.current} prev={d.walletGrowth.previous} />
              <MetricRow label="Loan Volume" value={d.loanVolume.current} prev={d.loanVolume.previous} format="currency" />
              <MetricRow label="Active Users" value={d.activeUsers.current} prev={d.activeUsers.previous} />
              <MetricRow label="Avg Session (min)" value={d.avgSession.current} prev={d.avgSession.previous} />
              <MetricRow label="Retention Rate" value={d.retentionRate} format="number" />
              <MetricRow label="Bounce Rate" value={d.bounceRate} format="number" />
            </div>

            <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#EC81FF]" /> Score Distribution
              </h3>
              <div className="space-y-3">
                <MiniBar label="Elite (800+)" value={d.scoreBreakdown?.[0] || 0} max={100} color="#4ade80" />
                <MiniBar label="Good (600-799)" value={d.scoreBreakdown?.[1] || 0} max={100} color="#60a5fa" />
                <MiniBar label="Fair (400-599)" value={d.scoreBreakdown?.[2] || 0} max={100} color="#f59e0b" />
                <MiniBar label="Building (200-399)" value={d.scoreBreakdown?.[3] || 0} max={100} color="#f97316" />
                <MiniBar label="New (0-199)" value={d.scoreBreakdown?.[4] || 0} max={100} color="#f87171" />
              </div>
            </div>
          </div>

          <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#EC81FF]" /> Top User Actions
            </h3>
            {(d.topActions?.length > 0) ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {d.topActions.map((a, i) => (
                  <div key={i} className="bg-[#0A0A12] rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-white">{a.count}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{a.action}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 text-center py-6">Action metrics will populate as users interact with Lendra.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
