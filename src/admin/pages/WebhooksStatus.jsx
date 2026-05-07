import React, { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '../useAdminAuth';
import { RefreshCw, CheckCircle2, XCircle, AlertTriangle, Loader2, Zap, Send, Globe, Rocket, CreditCard, Brain, Users } from 'lucide-react';

const SYSTEMS = [
  { key: 'telegram', label: 'Telegram Webhook', icon: Send, testKey: 'telegram', color: '#3B82F6' },
  { key: 'x_oauth', label: 'X (Twitter) OAuth', icon: Globe, testKey: null, color: '#1DA1F2' },
  { key: 'quicknode', label: 'QuickNode Webhook', icon: Zap, testKey: 'quicknode', color: '#F59E0B' },
  { key: 'pool', label: 'Pool / Waitlist', icon: Rocket, testKey: 'pool_waitlist', color: '#EC81FF' },
  { key: 'social_card', label: 'Social Cards', icon: CreditCard, testKey: null, color: '#10B981' },
  { key: 'borrow_simulation', label: 'Borrow Simulation', icon: Users, testKey: 'borrow_simulation', color: '#8B5CF6' },
  { key: 'lendra_ai', label: 'Lendra AI / QVAC', icon: Brain, testKey: 'qvac', color: '#F472B6' },
];

function StatusDot({ status }) {
  if (status === 'ok') return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
  if (status === 'warn') return <AlertTriangle className="w-4 h-4 text-amber-400" />;
  return <XCircle className="w-4 h-4 text-red-400" />;
}

function getSystemStatus(key, data) {
  if (!data) return 'error';
  const d = data[key];
  if (!d) return 'error';
  if (key === 'telegram') return d.configured ? 'ok' : 'warn';
  if (key === 'x_oauth') return (d.client_id_configured && d.client_secret_configured) ? 'ok' : 'warn';
  if (key === 'quicknode') return d.configured ? 'ok' : 'warn';
  if (key === 'pool') return d.pool_mode ? 'ok' : 'warn';
  if (key === 'social_card') return d.last_card ? 'ok' : 'warn';
  if (key === 'borrow_simulation') return (d.pricing_rules_count > 0 || d.last_sim) ? 'ok' : 'warn';
  if (key === 'lendra_ai') return d.last_event ? 'ok' : 'warn';
  return 'warn';
}

function formatDate(d) {
  if (!d) return 'Never';
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[#1E1E2A]/50 last:border-0">
      <span className="text-[11px] text-slate-500">{label}</span>
      <span className="text-[11px] text-slate-300 font-mono max-w-[200px] truncate text-right">{value || '—'}</span>
    </div>
  );
}

function SystemCard({ sys, data, onTest, testing }) {
  const Icon = sys.icon;
  const status = getSystemStatus(sys.key, data);
  const d = data?.[sys.key] || {};

  const details = [];

  if (sys.key === 'telegram') {
    details.push({ label: 'Configured', value: d.configured ? 'Yes' : 'No' });
    details.push({ label: 'Bot Username', value: d.bot_username || 'Not set' });
    details.push({ label: 'Last Connected', value: formatDate(d.last_connected?.created_at) });
    details.push({ label: 'Last Send', value: `${formatDate(d.last_send?.created_at)} (${d.last_send?.status || '—'})` });
  } else if (sys.key === 'x_oauth') {
    details.push({ label: 'Client ID', value: d.client_id_configured ? 'Set' : 'Missing' });
    details.push({ label: 'Client Secret', value: d.client_secret_configured ? 'Set' : 'Missing' });
    details.push({ label: 'Redirect URI', value: d.redirect_uri });
    details.push({ label: 'Last Event', value: `${formatDate(d.last_event?.created_at)} ${d.last_event?.event_type || ''}` });
    details.push({ label: 'Last Connected', value: d.last_connected_profile?.x_username ? `@${d.last_connected_profile.x_username}` : 'None' });
  } else if (sys.key === 'quicknode') {
    details.push({ label: 'Configured', value: d.configured ? 'Yes' : 'No' });
    details.push({ label: 'Last Event', value: `${formatDate(d.last_event?.created_at)} ${d.last_event?.event_type || ''}` });
  } else if (sys.key === 'pool') {
    details.push({ label: 'Pool Live', value: d.pool_live ? 'Yes' : 'No' });
    details.push({ label: 'Mode', value: d.pool_mode || 'simulation' });
    details.push({ label: 'Paused', value: d.pool_paused ? 'Yes' : 'No' });
    details.push({ label: 'Liquidity', value: d.available_liquidity ? `$${Number(d.available_liquidity).toLocaleString()}` : '$0' });
    details.push({ label: 'Waitlist Size', value: String(d.total_waitlist || 0) });
    details.push({ label: 'Last Entry', value: formatDate(d.last_waitlist_entry?.created_at) });
  } else if (sys.key === 'social_card') {
    details.push({ label: 'Last Card', value: formatDate(d.last_card?.created_at) });
    details.push({ label: 'Wallet', value: d.last_card?.wallet_address ? `${d.last_card.wallet_address.slice(0, 6)}...` : '—' });
    details.push({ label: 'Score', value: d.last_card?.score ? `${d.last_card.score}/1000` : '—' });
    details.push({ label: 'Shared to X', value: d.last_card?.shared_to_x ? 'Yes' : 'No' });
  } else if (sys.key === 'borrow_simulation') {
    details.push({ label: 'Pricing Rules', value: String(d.pricing_rules_count || 0) });
    details.push({ label: 'Last Sim', value: formatDate(d.last_sim?.created_at) });
    details.push({ label: 'Sim Amount', value: d.last_sim?.loan_amount ? `$${d.last_sim.loan_amount}` : '—' });
  } else if (sys.key === 'lendra_ai') {
    details.push({ label: 'Last Event', value: formatDate(d.last_event?.created_at) });
    details.push({ label: 'Type', value: d.last_event?.event_type || '—' });
    details.push({ label: 'Language', value: d.last_event?.selected_language || '—' });
  }

  return (
    <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl p-4 hover:border-[#2A2A3A] transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${sys.color}15` }}>
            <Icon className="w-4 h-4" style={{ color: sys.color }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{sys.label}</p>
          </div>
        </div>
        <StatusDot status={status} />
      </div>

      <div className="space-y-0">
        {details.map((d, i) => <DetailRow key={i} label={d.label} value={d.value} />)}
      </div>

      {sys.testKey && (
        <button
          onClick={() => onTest(sys.testKey)}
          disabled={testing === sys.testKey}
          className="mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium border border-[#2A2A3A] text-slate-400 hover:text-white hover:border-[#3A3A4A] disabled:opacity-50 transition-all"
        >
          {testing === sys.testKey ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
          Test Write
        </button>
      )}
    </div>
  );
}

export default function WebhooksStatus() {
  const { adminFetch, isSuperAdmin } = useAdminAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(null);
  const [testResult, setTestResult] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/webhooks/status');
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error('[WebhooksStatus]', err);
    }
    setLoading(false);
  }, [adminFetch]);

  useEffect(() => { load(); }, [load]);

  const handleTest = async (system) => {
    setTesting(system);
    setTestResult(null);
    try {
      const res = await adminFetch(`/api/admin/test/${system}`, { method: 'POST' });
      const d = await res.json();
      setTestResult({ system, ok: d.ok, result: d.result });
      if (d.ok) setTimeout(load, 1500);
    } catch (err) {
      setTestResult({ system, ok: false, error: err.message });
    }
    setTesting(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-[#EC81FF] animate-spin" />
      </div>
    );
  }

  const okCount = SYSTEMS.filter(s => getSystemStatus(s.key, data) === 'ok').length;
  const warnCount = SYSTEMS.filter(s => getSystemStatus(s.key, data) === 'warn').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Webhooks & Integrations</h1>
          <p className="text-xs text-slate-500 mt-0.5">Live status for all external service connections.</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1E1E2A] text-slate-400 hover:text-white border border-[#2A2A3A] transition-all">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-400">{okCount} connected</span>
        </div>
        {warnCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">{warnCount} need attention</span>
          </div>
        )}
      </div>

      {testResult && (
        <div className={`p-3 rounded-xl border text-xs ${testResult.ok ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-red-500/5 border-red-500/20 text-red-400'}`}>
          Test {testResult.system}: {testResult.ok ? 'Write succeeded' : `Failed — ${testResult.error || 'unknown error'}`}
          {testResult.result?.id && <span className="ml-2 text-slate-500 font-mono">ID: {testResult.result.id.slice(0, 8)}...</span>}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {SYSTEMS.map(sys => (
          <SystemCard key={sys.key} sys={sys} data={data} onTest={handleTest} testing={testing} />
        ))}
      </div>
    </div>
  );
}
