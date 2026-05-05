import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../useAdminAuth';
import { ArrowDownToLine, Search, Clock, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

function StatusBadge({ status }) {
  const config = {
    active: { icon: Clock, label: 'Active', classes: 'bg-blue-500/10 text-blue-400' },
    repaid: { icon: CheckCircle, label: 'Repaid', classes: 'bg-emerald-500/10 text-emerald-400' },
    defaulted: { icon: XCircle, label: 'Defaulted', classes: 'bg-red-500/10 text-red-400' },
    pending: { icon: Clock, label: 'Pending', classes: 'bg-amber-500/10 text-amber-400' },
  };
  const c = config[status] || config.pending;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded ${c.classes}`}>
      <Icon className="w-3 h-3" /> {c.label}
    </span>
  );
}

export default function Loans() {
  const { adminFetch } = useAdminAuth();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await adminFetch('/api/admin/loans');
        if (res.ok) setLoans(await res.json());
      } catch {}
      setLoading(false);
    };
    fetch_();
  }, [adminFetch]);

  const filtered = loans.filter((l) => {
    if (statusFilter !== 'all' && l.status !== statusFilter) return false;
    if (search && !l.wallet?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    active: loans.filter((l) => l.status === 'active').length,
    repaid: loans.filter((l) => l.status === 'repaid').length,
    defaulted: loans.filter((l) => l.status === 'defaulted').length,
    totalVolume: loans.reduce((s, l) => s + (l.amount || 0), 0),
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-xl font-bold text-white">Loans</h1>
        <p className="text-xs text-slate-500 mt-1">All micro-loan activity across Lendra</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Active', value: stats.active, color: '#60a5fa' },
          { label: 'Repaid', value: stats.repaid, color: '#4ade80' },
          { label: 'Defaulted', value: stats.defaulted, color: '#f87171' },
          { label: 'Total Volume', value: `$${stats.totalVolume}`, color: '#EC81FF' },
        ].map((s) => (
          <div key={s.label} className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl p-4">
            <p className="text-lg font-bold text-white">{s.value}</p>
            <p className="text-[10px] text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by wallet..."
            className="w-full bg-[#12121E] border border-[#1E1E2A] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#EC81FF]/40"
          />
        </div>
        <div className="flex gap-1.5">
          {['all', 'active', 'repaid', 'defaulted'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-xl text-xs font-medium capitalize transition-all border ${
                statusFilter === s ? 'bg-[#EC81FF]/10 text-[#EC81FF] border-[#EC81FF]/20' : 'text-slate-400 border-[#1E1E2A]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-[#EC81FF] animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <ArrowDownToLine className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500">{loans.length === 0 ? 'No loans issued yet.' : 'No loans match your filter.'}</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1E1E2A]">
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-500 uppercase">Wallet</th>
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-500 uppercase">Amount</th>
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-500 uppercase">Level</th>
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-500 uppercase">Status</th>
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-500 uppercase">Due</th>
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-500 uppercase">Issued</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l, i) => (
                  <tr key={l.id || i} className="border-b border-[#1E1E2A] last:border-0 hover:bg-[#1E1E2A]/30">
                    <td className="px-5 py-3"><span className="font-mono text-xs text-white">{l.wallet?.slice(0, 6)}...{l.wallet?.slice(-4)}</span></td>
                    <td className="px-5 py-3"><span className="text-xs text-white font-medium">${l.amount}</span></td>
                    <td className="px-5 py-3"><span className="text-xs text-slate-400">{l.level}</span></td>
                    <td className="px-5 py-3"><StatusBadge status={l.status} /></td>
                    <td className="px-5 py-3"><span className="text-[10px] text-slate-500">{l.dueDate ? new Date(l.dueDate).toLocaleDateString() : '-'}</span></td>
                    <td className="px-5 py-3"><span className="text-[10px] text-slate-500">{l.createdAt ? new Date(l.createdAt).toLocaleDateString() : '-'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
