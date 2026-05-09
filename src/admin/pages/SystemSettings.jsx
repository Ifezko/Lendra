import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../useAdminAuth';
import { Server, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

function StatusItem({ label, configured, detail }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#1E1E2A] last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <div className="flex items-center gap-2">
        {detail && <span className="text-[10px] text-slate-500">{detail}</span>}
        {configured ? (
          <span className="flex items-center gap-1 text-[10px] text-emerald-400"><CheckCircle className="w-3.5 h-3.5" /> Configured</span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] text-amber-400"><AlertTriangle className="w-3.5 h-3.5" /> Not configured</span>
        )}
      </div>
    </div>
  );
}

export default function SystemSettings() {
  const { adminFetch } = useAdminAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminFetch('/api/admin/system');
        if (res.ok) setData(await res.json());
      } catch {}
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-[#EC81FF] animate-spin" /></div>;
  const d = data || {};

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-white">System Status</h1>
        <p className="text-xs text-slate-500 mt-1">Infrastructure health and integration configuration</p>
      </div>
      <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Server className="w-4 h-4 text-[#EC81FF]" /> Core Services</h3>
        <StatusItem label="Supabase Database" configured={d.supabase?.configured} />
        <StatusItem label="Service Role Key" configured={d.service_role?.configured} />
        <StatusItem label="Upstash Redis" configured={d.redis?.configured} detail={d.redis?.connected ? 'Connected' : 'Disconnected'} />
      </div>
      <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Integrations</h3>
        <StatusItem label="Telegram Bot" configured={d.telegram?.configured} detail={d.telegram?.bot_username ? `@${d.telegram.bot_username}` : null} />
        <StatusItem label="X (Twitter) OAuth" configured={d.x_oauth?.configured} />
        <StatusItem label="QuickNode RPC" configured={d.quicknode?.configured} />
        <StatusItem label="QuickNode Webhooks" configured={d.quicknode?.webhook_configured} />
      </div>
      <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Info</h3>
        <div className="text-xs text-slate-400 space-y-1">
          <p>Timestamp: {new Date().toISOString()}</p>
          <p>All admin routes require valid session authentication.</p>
          <p>Bootstrap: {d.supabase?.configured ? 'First admin can be created via login with ADMIN_EMAIL.' : 'Supabase not configured.'}</p>
        </div>
      </div>
    </div>
  );
}
