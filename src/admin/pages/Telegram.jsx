import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../useAdminAuth';
import { MessageCircle, Loader2 } from 'lucide-react';

export default function Telegram() {
  const { adminFetch } = useAdminAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminFetch('/api/admin/telegram');
        if (res.ok) setData(await res.json());
      } catch {}
      setLoading(false);
    })();
  }, []);

  const d = data || { connectedWallets: [], recentEvents: [] };

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-xl font-bold text-white">Telegram</h1>
        <p className="text-xs text-slate-500 mt-1">Connected Telegram users and notification history</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl p-4">
          <p className="text-lg font-bold text-white">{d.connectedWallets.length}</p>
          <p className="text-[10px] text-slate-500">Connected Wallets</p>
        </div>
        <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl p-4">
          <p className="text-lg font-bold text-white">{d.connectedWallets.filter(w => w.telegram_alerts_enabled).length}</p>
          <p className="text-[10px] text-slate-500">Alerts Enabled</p>
        </div>
        <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl p-4">
          <p className="text-lg font-bold text-white">{d.recentEvents.length}</p>
          <p className="text-[10px] text-slate-500">Recent Events</p>
        </div>
      </div>
      <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl overflow-hidden">
        <div className="border-b border-[#1E1E2A] px-5 py-3.5">
          <h3 className="text-sm font-semibold text-white">Connected Wallets</h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-[#EC81FF] animate-spin" /></div>
        ) : d.connectedWallets.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <MessageCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No Telegram-connected wallets yet.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1E1E2A]">
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-500 uppercase">Wallet</th>
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-500 uppercase">Username</th>
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-500 uppercase">Alerts</th>
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-500 uppercase">Connected</th>
                </tr>
              </thead>
              <tbody>
                {d.connectedWallets.map((w, i) => (
                  <tr key={w.wallet_address || i} className="border-b border-[#1E1E2A] last:border-0 hover:bg-[#1E1E2A]/30">
                    <td className="px-5 py-3"><span className="font-mono text-xs text-white">{w.wallet_address?.slice(0,6)}...{w.wallet_address?.slice(-4)}</span></td>
                    <td className="px-5 py-3"><span className="text-xs text-blue-400">@{w.telegram_username || 'unknown'}</span></td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded ${w.telegram_alerts_enabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-500'}`}>
                        {w.telegram_alerts_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-5 py-3"><span className="text-[10px] text-slate-500">{w.telegram_connected_at ? new Date(w.telegram_connected_at).toLocaleDateString() : '-'}</span></td>
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
