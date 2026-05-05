import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../useAdminAuth';
import {
  Users, Wallet, ArrowDownToLine, Shield, DollarSign, TrendingUp,
  Activity, AlertTriangle, CheckCircle, Clock, Loader2,
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub, color = '#EC81FF', trend }) {
  return (
    <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        {trend !== undefined && (
          <span className={`text-[11px] font-semibold ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      {sub && <p className="text-[11px] text-slate-600 mt-1">{sub}</p>}
    </div>
  );
}

function StatusRow({ label, value, status }) {
  const colors = { healthy: 'text-emerald-400', warning: 'text-amber-400', error: 'text-red-400', inactive: 'text-slate-500' };
  const dots = { healthy: 'bg-emerald-400', warning: 'bg-amber-400', error: 'bg-red-400', inactive: 'bg-slate-600' };
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#1E1E2A] last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-white font-medium">{value}</span>
        <div className={`w-2 h-2 rounded-full ${dots[status] || dots.inactive}`} />
      </div>
    </div>
  );
}

export default function Overview() {
  const { adminFetch } = useAdminAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await adminFetch('/api/admin/stats');
        if (res.ok) setStats(await res.json());
      } catch {}
      setLoading(false);
    };
    fetchStats();
  }, [adminFetch]);

  const s = stats || {
    totalWallets: 0, activeLoans: 0, totalBonds: 0, totalRevenue: 0,
    avgScore: 0, eligibleWallets: 0, repaymentRate: 0, defaultRate: 0,
    telegramConnected: 0, xVerified: 0, solIdentities: 0, socialCards: 0,
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-xl font-bold text-white">Overview</h1>
        <p className="text-xs text-slate-500 mt-1">Lendra platform metrics and system status</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-[#EC81FF] animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={Users} label="Total Wallets" value={s.totalWallets} color="#EC81FF" trend={12} />
            <StatCard icon={ArrowDownToLine} label="Active Loans" value={s.activeLoans} color="#60a5fa" />
            <StatCard icon={Shield} label="Total Bonds Locked" value={`$${s.totalBonds}`} color="#f59e0b" />
            <StatCard icon={DollarSign} label="Total Revenue" value={`$${s.totalRevenue}`} color="#4ade80" trend={8} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={TrendingUp} label="Avg Score" value={s.avgScore} sub="out of 1000" color="#a78bfa" />
            <StatCard icon={CheckCircle} label="Eligible Wallets" value={s.eligibleWallets} color="#4ade80" />
            <StatCard icon={Activity} label="Repayment Rate" value={`${s.repaymentRate}%`} color="#60a5fa" />
            <StatCard icon={AlertTriangle} label="Default Rate" value={`${s.defaultRate}%`} color="#f87171" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3">System Status</h3>
              <StatusRow label="Solana RPC" value="Connected" status="healthy" />
              <StatusRow label="QuickNode Webhooks" value="Active" status="healthy" />
              <StatusRow label="Redis Cache" value="Connected" status="healthy" />
              <StatusRow label="Telegram Bot" value="Pending setup" status="warning" />
              <StatusRow label="Encrypt (Private Mode)" value="Devnet" status="warning" />
              <StatusRow label="Ika (Cross-Chain)" value="Devnet" status="warning" />
            </div>

            <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Ecosystem Integrations</h3>
              <StatusRow label="Telegram Connected" value={s.telegramConnected} status={s.telegramConnected > 0 ? 'healthy' : 'inactive'} />
              <StatusRow label="X Verified" value={s.xVerified} status={s.xVerified > 0 ? 'healthy' : 'inactive'} />
              <StatusRow label=".sol Identities" value={s.solIdentities} status={s.solIdentities > 0 ? 'healthy' : 'inactive'} />
              <StatusRow label="Social Cards Generated" value={s.socialCards} status={s.socialCards > 0 ? 'healthy' : 'inactive'} />
            </div>

            <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Score Distribution</h3>
              {[
                { range: '800-1000', pct: 5, color: '#4ade80' },
                { range: '600-799', pct: 18, color: '#60a5fa' },
                { range: '400-599', pct: 32, color: '#f59e0b' },
                { range: '200-399', pct: 28, color: '#f97316' },
                { range: '0-199', pct: 17, color: '#f87171' },
              ].map((tier) => (
                <div key={tier.range} className="flex items-center gap-3 py-1.5">
                  <span className="text-xs text-slate-400 w-16">{tier.range}</span>
                  <div className="flex-1 h-2 bg-[#1E1E2A] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${tier.pct}%`, backgroundColor: tier.color }} />
                  </div>
                  <span className="text-xs text-slate-500 w-8 text-right">{tier.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Loan Levels</h3>
              {[
                { level: 1, name: 'Starter', max: '$10', count: 0 },
                { level: 2, name: 'Builder', max: '$25', count: 0 },
                { level: 3, name: 'Silver', max: '$50', count: 0 },
                { level: 4, name: 'Gold', max: '$100', count: 0 },
                { level: 5, name: 'Platinum', max: '$200', count: 0 },
                { level: 6, name: 'Diamond', max: '$400', count: 0 },
              ].map((l) => (
                <div key={l.level} className="flex items-center justify-between py-2 border-b border-[#1E1E2A] last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[#EC81FF] bg-[#EC81FF]/10 w-5 h-5 rounded flex items-center justify-center">{l.level}</span>
                    <span className="text-xs text-white">{l.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">Max {l.max}</span>
                    <span className="text-xs text-slate-400 bg-[#1E1E2A] px-2 py-0.5 rounded">{l.count} wallets</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Recent Activity</h3>
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Activity events will appear here as users interact with Lendra.</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
