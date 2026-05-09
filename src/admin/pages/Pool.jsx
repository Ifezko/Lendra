import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../useAdminAuth';
import { Loader2, CheckCircle } from 'lucide-react';

export default function Pool() {
  const { adminFetch, admin } = useAdminAuth();
  const isSuperAdmin = admin?.role === 'super_admin';
  const [pool, setPool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminFetch('/api/admin/pool');
        if (res.ok) { const data = await res.json(); setPool(data.pool); }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const handleUpdate = async (updates) => {
    setSaving(true);
    try {
      const res = await adminFetch('/api/admin/pool', { method: 'PATCH', body: JSON.stringify(updates) });
      if (res.ok) { setPool(p => ({ ...p, ...updates })); setSaved(true); setTimeout(() => setSaved(false), 3000); }
    } catch {}
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-[#EC81FF] animate-spin" /></div>;

  const p = pool || { pool_live: false, pool_paused: false, pool_mode: 'simulation', available_liquidity: 0 };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Credit Pool</h1>
          <p className="text-xs text-slate-500 mt-1">Pool state, liquidity, and mode management</p>
        </div>
        {saved && <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle className="w-4 h-4" /> Updated</span>}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl p-4">
          <p className="text-lg font-bold text-white">{p.pool_mode}</p>
          <p className="text-[10px] text-slate-500">Mode</p>
        </div>
        <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl p-4">
          <p className={`text-lg font-bold ${p.pool_live ? 'text-emerald-400' : 'text-slate-500'}`}>{p.pool_live ? 'Live' : 'Offline'}</p>
          <p className="text-[10px] text-slate-500">Status</p>
        </div>
        <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl p-4">
          <p className={`text-lg font-bold ${p.pool_paused ? 'text-amber-400' : 'text-white'}`}>{p.pool_paused ? 'Paused' : 'Active'}</p>
          <p className="text-[10px] text-slate-500">Paused</p>
        </div>
        <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl p-4">
          <p className="text-lg font-bold text-white">${Number(p.available_liquidity || 0).toLocaleString()}</p>
          <p className="text-[10px] text-slate-500">Available Liquidity</p>
        </div>
      </div>
      {isSuperAdmin && (
        <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Pool Controls</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between py-3 px-4 bg-[#0A0A12] rounded-xl">
              <div><p className="text-xs text-white font-medium">Pool Mode</p><p className="text-[10px] text-slate-500">Simulation or Live</p></div>
              <div className="flex gap-1.5">
                {['simulation', 'live'].map(m => (
                  <button key={m} onClick={() => handleUpdate({ pool_mode: m })} disabled={saving}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize border transition-all ${p.pool_mode === m ? 'bg-[#EC81FF]/10 text-[#EC81FF] border-[#EC81FF]/20' : 'text-slate-400 border-[#1E1E2A]'}`}>{m}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between py-3 px-4 bg-[#0A0A12] rounded-xl">
              <div><p className="text-xs text-white font-medium">Pool Live</p><p className="text-[10px] text-slate-500">Toggle pool on/off</p></div>
              <button onClick={() => handleUpdate({ pool_live: !p.pool_live })} disabled={saving}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold ${p.pool_live ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-500 border border-[#1E1E2A]'}`}>{p.pool_live ? 'On' : 'Off'}</button>
            </div>
            <div className="flex items-center justify-between py-3 px-4 bg-[#0A0A12] rounded-xl">
              <div><p className="text-xs text-white font-medium">Pause Pool</p><p className="text-[10px] text-slate-500">Temporarily halt lending</p></div>
              <button onClick={() => handleUpdate({ pool_paused: !p.pool_paused })} disabled={saving}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold ${p.pool_paused ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-slate-500/10 text-slate-500 border border-[#1E1E2A]'}`}>{p.pool_paused ? 'Paused' : 'Running'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
