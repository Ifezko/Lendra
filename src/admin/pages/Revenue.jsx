import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../useAdminAuth';
import { DollarSign, TrendingUp, PieChart, Loader2, ArrowUpRight } from 'lucide-react';

export default function Revenue() {
  const { adminFetch } = useAdminAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await adminFetch('/api/admin/revenue');
        if (res.ok) setData(await res.json());
      } catch {}
      setLoading(false);
    };
    fetch_();
  }, [adminFetch]);

  const d = data || {
    totalRevenue: 0, interestEarned: 0, bondFees: 0, partnerFees: 0,
    serviceFees: 0, monthly: [], projectedAnnual: 0,
  };

  const streams = [
    { label: 'Interest on Loans', value: d.interestEarned, color: '#EC81FF' },
    { label: 'Bond Fees', value: d.bondFees, color: '#60a5fa' },
    { label: 'Partner Commissions', value: d.partnerFees, color: '#f59e0b' },
    { label: 'Service Fees', value: d.serviceFees, color: '#4ade80' },
  ];
  const maxStream = Math.max(...streams.map((s) => s.value), 1);

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-xl font-bold text-white">Revenue</h1>
        <p className="text-xs text-slate-500 mt-1">Platform revenue streams and projections</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-[#EC81FF] animate-spin" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl p-4">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3">
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-white">${d.totalRevenue.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500">Total Revenue</p>
            </div>
            <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl p-4">
              <div className="w-9 h-9 rounded-xl bg-[#EC81FF]/10 flex items-center justify-center mb-3">
                <TrendingUp className="w-4 h-4 text-[#EC81FF]" />
              </div>
              <p className="text-2xl font-bold text-white">${d.projectedAnnual.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500">Projected Annual</p>
            </div>
            <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl p-4 col-span-2 md:col-span-1">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3">
                <PieChart className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-white">{streams.filter((s) => s.value > 0).length}</p>
              <p className="text-[10px] text-slate-500">Active Revenue Streams</p>
            </div>
          </div>

          <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Revenue Breakdown</h3>
            <div className="space-y-4">
              {streams.map((s) => (
                <div key={s.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-slate-400">{s.label}</span>
                    <span className="text-xs text-white font-medium">${s.value.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-[#1E1E2A] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(s.value / maxStream) * 100}%`, backgroundColor: s.color }} />
                  </div>
                </div>
              ))}
            </div>
            {d.totalRevenue === 0 && (
              <p className="text-xs text-slate-500 text-center mt-6">Revenue will be tracked as loans are issued and repaid.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
