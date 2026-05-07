import React, { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '../useAdminAuth';
import { RefreshCw, CheckCircle2, XCircle, AlertTriangle, Loader2, Database, Clock } from 'lucide-react';

function formatDate(d) {
  if (!d) return 'Never';
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function timeAgo(d) {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

const TABLE_LABELS = {
  wallet_profiles: 'Wallet Profiles',
  wallet_scans: 'Wallet Scans',
  eligibility_checks: 'Eligibility Checks',
  loan_events: 'Loan Events',
  pool_launch_waitlist: 'Pool Waitlist',
  loan_pricing_rules: 'Loan Pricing Rules',
  notification_events: 'Notification Events',
  x_verification_events: 'X Verification Events',
  partner_events: 'Partner Events',
  social_credit_cards: 'Social Credit Cards',
  qvac_events: 'QVAC Events',
  admin_audit_logs: 'Admin Audit Logs',
  bond_events: 'Bond Events',
  repayments: 'Repayments',
  score_change_events: 'Score Change Events',
  secret_token_events: 'Secret Token Events',
};

const TABLE_ROUTES = {
  wallet_profiles: ['POST /api/telegram/webhook', 'GET /api/auth/x/callback'],
  wallet_scans: ['Frontend: useWalletScore'],
  eligibility_checks: ['Frontend: useEligibility'],
  loan_events: ['POST /api/borrow/simulate'],
  pool_launch_waitlist: ['POST /api/pool/waitlist/join'],
  loan_pricing_rules: ['GET /api/loan-pricing'],
  notification_events: ['POST /api/telegram/webhook', 'POST /api/telegram/test', 'POST /api/pool/waitlist/notify'],
  x_verification_events: ['GET /api/auth/x/callback', 'POST /api/auth/x/disconnect'],
  partner_events: ['POST /api/webhooks/quicknode', 'POST /api/pool/waitlist/join', 'GET /api/auth/x/callback'],
  social_credit_cards: ['POST /api/social-card/generate', 'POST /api/social-card/share'],
  qvac_events: ['POST /api/lendra-ai/chat'],
  admin_audit_logs: ['POST /api/pool/waitlist/notify'],
  bond_events: ['POST /api/webhooks/quicknode'],
  repayments: ['POST /api/webhooks/quicknode'],
  score_change_events: ['Frontend: score change triggers'],
  secret_token_events: ['Admin: Secrets Generator'],
};

function StatusBadge({ status }) {
  if (status === 'working') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
      <CheckCircle2 className="w-3 h-3" /> Live
    </span>
  );
  if (status === 'no_data') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
      <AlertTriangle className="w-3 h-3" /> No Data
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
      <XCircle className="w-3 h-3" /> Error
    </span>
  );
}

export default function DataWiring() {
  const { adminFetch } = useAdminAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/data-wiring/status');
      if (res.ok) {
        const d = await res.json();
        setData(d.tables || []);
      }
    } catch (err) {
      console.error('[DataWiring]', err);
    }
    setLoading(false);
  }, [adminFetch]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-[#EC81FF] animate-spin" />
      </div>
    );
  }

  const tables = data || [];
  const working = tables.filter(t => t.status === 'working').length;
  const noData = tables.filter(t => t.status === 'no_data').length;
  const errors = tables.filter(t => t.status === 'error').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Data Wiring Status</h1>
          <p className="text-xs text-slate-500 mt-0.5">Real-time verification that every Supabase table is receiving data from its connected route.</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1E1E2A] text-slate-400 hover:text-white border border-[#2A2A3A] transition-all">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      <div className="flex items-center gap-5">
        <div className="flex items-center gap-1.5 text-xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-400">{working} receiving data</span>
        </div>
        {noData > 0 && (
          <div className="flex items-center gap-1.5 text-xs">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">{noData} empty</span>
          </div>
        )}
        {errors > 0 && (
          <div className="flex items-center gap-1.5 text-xs">
            <XCircle className="w-3.5 h-3.5 text-red-400" />
            <span className="text-slate-400">{errors} errors</span>
          </div>
        )}
      </div>

      <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-[#1E1E2A] text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          <div className="col-span-4">Table</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-3">Last Write</div>
          <div className="col-span-3">Source Routes</div>
        </div>

        {tables.map((t, i) => {
          const routes = TABLE_ROUTES[t.table] || [];
          const isExpanded = expanded === t.table;

          return (
            <div key={t.table}>
              <div
                className={`grid grid-cols-12 gap-2 px-4 py-3 items-center cursor-pointer hover:bg-[#1A1A28] transition-colors ${i < tables.length - 1 ? 'border-b border-[#1E1E2A]/50' : ''}`}
                onClick={() => setExpanded(isExpanded ? null : t.table)}
              >
                <div className="col-span-4 flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-slate-600" />
                  <div>
                    <p className="text-xs font-medium text-white">{TABLE_LABELS[t.table] || t.table}</p>
                    <p className="text-[10px] text-slate-600 font-mono">{t.table}</p>
                  </div>
                </div>
                <div className="col-span-2">
                  <StatusBadge status={t.status} />
                </div>
                <div className="col-span-3">
                  {t.last_created_at ? (
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-slate-600" />
                      <div>
                        <p className="text-[11px] text-slate-300">{timeAgo(t.last_created_at)}</p>
                        <p className="text-[9px] text-slate-600">{formatDate(t.last_created_at)}</p>
                      </div>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-600">No writes yet</span>
                  )}
                </div>
                <div className="col-span-3">
                  <p className="text-[10px] text-slate-500 truncate">{routes[0] || '—'}</p>
                  {routes.length > 1 && <p className="text-[9px] text-slate-600">+{routes.length - 1} more</p>}
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 py-3 bg-[#0E0E18] border-b border-[#1E1E2A]/50">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] text-slate-500 font-semibold mb-1.5 uppercase tracking-wider">Source Routes</p>
                      <div className="space-y-1">
                        {routes.map((r, i) => (
                          <p key={i} className="text-[11px] text-slate-400 font-mono">{r}</p>
                        ))}
                        {routes.length === 0 && <p className="text-[11px] text-slate-600">No routes mapped</p>}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-semibold mb-1.5 uppercase tracking-wider">Details</p>
                      {t.last_id && <p className="text-[11px] text-slate-400 font-mono">Last ID: {t.last_id.slice(0, 8)}...</p>}
                      {t.error && <p className="text-[11px] text-red-400">{t.error}</p>}
                      {!t.error && !t.last_id && <p className="text-[11px] text-slate-600">No data written to this table yet. Fire the source route to generate data.</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
