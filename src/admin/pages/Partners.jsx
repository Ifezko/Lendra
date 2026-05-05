import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../useAdminAuth';
import { Users, Plus, ExternalLink, Globe, Loader2 } from 'lucide-react';

export default function Partners() {
  const { adminFetch } = useAdminAuth();
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await adminFetch('/api/admin/partners');
        if (res.ok) setPartners(await res.json());
      } catch {}
      setLoading(false);
    };
    fetch_();
  }, [adminFetch]);

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Partners</h1>
          <p className="text-xs text-slate-500 mt-1">Lending pool providers and integration partners</p>
        </div>
      </div>

      <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-[#EC81FF] animate-spin" /></div>
        ) : partners.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500 mb-1">No partners registered yet.</p>
              <p className="text-[10px] text-slate-600">Partners will be listed here as liquidity pools and integrations go live.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
            {partners.map((p, i) => (
              <div key={p.id || i} className="bg-[#0A0A12] border border-[#1E1E2A] rounded-xl p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EC81FF]/10 flex items-center justify-center text-sm font-bold text-[#EC81FF] flex-shrink-0">
                  {p.name?.[0]?.toUpperCase() || 'P'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{p.name}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{p.type || 'Lending Pool'}</p>
                  {p.volume && <p className="text-xs text-slate-400 mt-1">Volume: ${p.volume.toLocaleString()}</p>}
                  {p.status && (
                    <span className={`inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded ${
                      p.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>{p.status}</span>
                  )}
                </div>
                {p.url && (
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-[#EC81FF]">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
