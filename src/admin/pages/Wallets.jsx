import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../useAdminAuth';
import { Wallet, Search, ExternalLink, Copy, Check, Loader2, AlertCircle, Filter } from 'lucide-react';

function truncateAddress(addr) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function ScoreBadge({ score }) {
  let color = 'text-red-400 bg-red-500/10';
  if (score >= 800) color = 'text-emerald-400 bg-emerald-500/10';
  else if (score >= 600) color = 'text-blue-400 bg-blue-500/10';
  else if (score >= 400) color = 'text-amber-400 bg-amber-500/10';
  else if (score >= 200) color = 'text-orange-400 bg-orange-500/10';
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${color}`}>{score}</span>;
}

export default function Wallets() {
  const { adminFetch } = useAdminAuth();
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await adminFetch('/api/admin/wallets');
        if (res.ok) setWallets(await res.json());
      } catch {}
      setLoading(false);
    };
    fetch_();
  }, [adminFetch]);

  const copy = async (text) => {
    await navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  const filtered = wallets.filter((w) => {
    if (search && !w.address?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'eligible' && w.score < 300) return false;
    if (filter === 'active_loan' && !w.hasActiveLoan) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-xl font-bold text-white">Wallets</h1>
        <p className="text-xs text-slate-500 mt-1">All wallets that have interacted with Lendra</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by wallet address..."
            className="w-full bg-[#12121E] border border-[#1E1E2A] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#EC81FF]/40"
          />
        </div>
        <div className="flex gap-1.5">
          {[['all', 'All'], ['eligible', 'Eligible'], ['active_loan', 'Active Loan']].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                filter === k ? 'bg-[#EC81FF]/10 text-[#EC81FF] border-[#EC81FF]/20' : 'text-slate-400 border-[#1E1E2A] hover:text-white'
              }`}
            >
              {l}
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
              <Wallet className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500">{wallets.length === 0 ? 'No wallets registered yet.' : 'No wallets match your search.'}</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1E1E2A]">
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-500 uppercase">Address</th>
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-500 uppercase">Score</th>
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-500 uppercase">Level</th>
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-500 uppercase">Balance</th>
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-500 uppercase">Loan</th>
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-500 uppercase">First Seen</th>
                  <th className="px-5 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((w, i) => (
                  <tr key={w.address || i} className="border-b border-[#1E1E2A] last:border-0 hover:bg-[#1E1E2A]/30">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-white">{truncateAddress(w.address)}</span>
                        <button onClick={() => copy(w.address)} className="text-slate-600 hover:text-white">
                          {copied === w.address ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-3"><ScoreBadge score={w.score || 0} /></td>
                    <td className="px-5 py-3"><span className="text-xs text-white">{w.level || 0}</span></td>
                    <td className="px-5 py-3"><span className="text-xs text-slate-400">{w.balance ?? '-'} SOL</span></td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded ${
                        w.hasActiveLoan ? 'bg-blue-500/10 text-blue-400' : 'text-slate-600'
                      }`}>{w.hasActiveLoan ? 'Active' : 'None'}</span>
                    </td>
                    <td className="px-5 py-3"><span className="text-[10px] text-slate-500">{w.firstSeen ? new Date(w.firstSeen).toLocaleDateString() : '-'}</span></td>
                    <td className="px-5 py-3">
                      <a
                        href={`https://explorer.solana.com/address/${w.address}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-500 hover:text-[#EC81FF]"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </td>
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
