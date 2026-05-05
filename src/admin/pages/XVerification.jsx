import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../useAdminAuth';
import { BadgeCheck, Loader2, Search, CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react';

export default function XVerification() {
  const { adminFetch } = useAdminAuth();
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await adminFetch('/api/admin/x-verifications');
        if (res.ok) setVerifications(await res.json());
      } catch {}
      setLoading(false);
    };
    fetch_();
  }, [adminFetch]);

  const filtered = verifications.filter((v) => {
    if (search && !v.handle?.toLowerCase().includes(search.toLowerCase()) && !v.wallet?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter !== 'all' && v.status !== filter) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-xl font-bold text-white">X Verification</h1>
        <p className="text-xs text-slate-500 mt-1">Wallet-to-X account verification queue and history</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Verified', value: verifications.filter((v) => v.status === 'verified').length, color: '#4ade80' },
          { label: 'Pending', value: verifications.filter((v) => v.status === 'pending').length, color: '#f59e0b' },
          { label: 'Rejected', value: verifications.filter((v) => v.status === 'rejected').length, color: '#f87171' },
          { label: 'Total Requests', value: verifications.length, color: '#EC81FF' },
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
            placeholder="Search by handle or wallet..."
            className="w-full bg-[#12121E] border border-[#1E1E2A] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#EC81FF]/40"
          />
        </div>
        <div className="flex gap-1.5">
          {['all', 'verified', 'pending', 'rejected'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-2 rounded-xl text-xs font-medium capitalize border transition-all ${
                filter === s ? 'bg-[#EC81FF]/10 text-[#EC81FF] border-[#EC81FF]/20' : 'text-slate-400 border-[#1E1E2A]'
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
              <BadgeCheck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500">{verifications.length === 0 ? 'No verification requests yet.' : 'No requests match your filter.'}</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1E1E2A]">
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-500 uppercase">X Handle</th>
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-500 uppercase">Wallet</th>
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-500 uppercase">Status</th>
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-500 uppercase">Score Boost</th>
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-500 uppercase">Requested</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v, i) => (
                  <tr key={v.id || i} className="border-b border-[#1E1E2A] last:border-0 hover:bg-[#1E1E2A]/30">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-blue-400">@{v.handle}</span>
                        <a href={`https://x.com/${v.handle}`} target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-[#EC81FF]">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </td>
                    <td className="px-5 py-3"><span className="font-mono text-xs text-white">{v.wallet?.slice(0, 6)}...{v.wallet?.slice(-4)}</span></td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded ${
                        v.status === 'verified' ? 'bg-emerald-500/10 text-emerald-400' :
                        v.status === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-red-500/10 text-red-400'
                      }`}>
                        {v.status === 'verified' ? <CheckCircle className="w-3 h-3" /> : v.status === 'pending' ? <Clock className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {v.status}
                      </span>
                    </td>
                    <td className="px-5 py-3"><span className="text-xs text-[#EC81FF]">{v.status === 'verified' ? '+50' : '-'}</span></td>
                    <td className="px-5 py-3"><span className="text-[10px] text-slate-500">{v.requestedAt ? new Date(v.requestedAt).toLocaleDateString() : '-'}</span></td>
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
