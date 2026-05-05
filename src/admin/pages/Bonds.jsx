import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../useAdminAuth';
import { Shield, Lock, Unlock, Clock, Loader2, TrendingUp } from 'lucide-react';

export default function Bonds() {
  const { adminFetch } = useAdminAuth();
  const [bonds, setBonds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await adminFetch('/api/admin/bonds');
        if (res.ok) setBonds(await res.json());
      } catch {}
      setLoading(false);
    };
    fetch_();
  }, [adminFetch]);

  const totalLocked = bonds.reduce((s, b) => s + (b.amount || 0), 0);
  const activeBonds = bonds.filter((b) => b.status === 'locked');

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-xl font-bold text-white">Bonds</h1>
        <p className="text-xs text-slate-500 mt-1">Reputation bonds and locked collateral</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl p-4">
          <p className="text-lg font-bold text-white">{bonds.length}</p>
          <p className="text-[10px] text-slate-500">Total Bonds</p>
        </div>
        <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl p-4">
          <p className="text-lg font-bold text-white">{activeBonds.length}</p>
          <p className="text-[10px] text-slate-500">Currently Locked</p>
        </div>
        <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl p-4">
          <p className="text-lg font-bold text-white">${totalLocked.toFixed(2)}</p>
          <p className="text-[10px] text-slate-500">Total Value Locked</p>
        </div>
        <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl p-4">
          <p className="text-lg font-bold text-white">0</p>
          <p className="text-[10px] text-slate-500">Slashed</p>
        </div>
      </div>

      <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-[#EC81FF] animate-spin" /></div>
        ) : bonds.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Shield className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No bonds created yet. Bonds will appear once users lock collateral.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1E1E2A]">
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-500 uppercase">Wallet</th>
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-500 uppercase">Amount</th>
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-500 uppercase">Status</th>
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-500 uppercase">Lock Period</th>
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-500 uppercase">Created</th>
                </tr>
              </thead>
              <tbody>
                {bonds.map((b, i) => (
                  <tr key={b.id || i} className="border-b border-[#1E1E2A] last:border-0 hover:bg-[#1E1E2A]/30">
                    <td className="px-5 py-3"><span className="font-mono text-xs text-white">{b.wallet?.slice(0, 6)}...{b.wallet?.slice(-4)}</span></td>
                    <td className="px-5 py-3"><span className="text-xs text-white font-medium">${b.amount}</span></td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded ${
                        b.status === 'locked' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {b.status === 'locked' ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                        {b.status === 'locked' ? 'Locked' : 'Released'}
                      </span>
                    </td>
                    <td className="px-5 py-3"><span className="text-xs text-slate-400">{b.lockDays || 30} days</span></td>
                    <td className="px-5 py-3"><span className="text-[10px] text-slate-500">{b.createdAt ? new Date(b.createdAt).toLocaleDateString() : '-'}</span></td>
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
