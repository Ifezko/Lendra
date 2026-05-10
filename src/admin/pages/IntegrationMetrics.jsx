import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Globe, Shield, RefreshCw, Loader2, Activity, TrendingUp, Users, Clock } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function StatCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="bg-[#12121E] rounded-xl border border-[#1E1E2A] p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-lg ${color} flex items-center justify-center`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <span className="text-[11px] text-slate-500 font-medium">{label}</span>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
      {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
    </div>
  );
}

function EventRow({ event }) {
  const ts = new Date(event.created_at);
  const ago = Math.round((Date.now() - ts.getTime()) / 60000);
  const agoLabel = ago < 60 ? `${ago}m ago` : ago < 1440 ? `${Math.round(ago / 60)}h ago` : `${Math.round(ago / 1440)}d ago`;
  const partnerColors = {
    encrypt: 'text-purple-400 bg-purple-400/10',
    ika: 'text-teal-400 bg-teal-400/10',
  };
  const pc = partnerColors[event.partner] || 'text-slate-400 bg-slate-400/10';

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1E1E2A] last:border-0 hover:bg-[#1E1E2A]/30 transition-colors">
      <div className={`w-7 h-7 rounded-lg ${pc} flex items-center justify-center text-[10px] font-bold uppercase`}>
        {event.partner === 'encrypt' ? <Shield className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-white truncate">{event.event_type.replace(/_/g, ' ')}</p>
        <p className="text-[10px] text-slate-600 font-mono truncate">{event.wallet_address}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${pc}`}>{event.partner}</span>
        <p className="text-[10px] text-slate-600 mt-0.5">{agoLabel}</p>
      </div>
      {event.metadata?.txSignature && (
        <a
          href={`https://explorer.solana.com/tx/${event.metadata.txSignature}?cluster=devnet`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-[#EC81FF] hover:underline flex-shrink-0"
        >
          tx
        </a>
      )}
    </div>
  );
}

export default function IntegrationMetrics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('lendra_admin_token');
      const res = await fetch(`${API_BASE_URL}/api/admin/integrations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 text-[#EC81FF] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-12 text-center">
        <p className="text-red-400 text-sm mb-3">{error}</p>
        <button onClick={fetchData} className="text-xs text-[#EC81FF] hover:underline">Retry</button>
      </div>
    );
  }

  const { encrypt = {}, ika = {}, recentEvents = [] } = data || {};

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Integration Metrics</h1>
          <p className="text-xs text-slate-500">Encrypt (Private Mode) and Ika (Cross-Chain Credit) on-chain activity</p>
        </div>
        <button onClick={fetchData} className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-[#1E1E2A] transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Encrypt Stats */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-purple-400" />
          <h2 className="text-sm font-semibold text-white">Encrypt Protocol — Private Mode</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Activations" value={encrypt.totalEnabled || 0} icon={Activity} color="bg-purple-500/10 text-purple-400" />
          <StatCard label="Currently Active" value={encrypt.currentlyActive || 0} icon={Shield} color="bg-green-500/10 text-green-400" />
          <StatCard label="Unique Wallets" value={encrypt.uniqueWallets || 0} icon={Users} color="bg-blue-500/10 text-blue-400" />
          <StatCard label="On-Chain Txs" value={encrypt.onChainTxCount || 0} sub="Devnet memo proofs" icon={TrendingUp} color="bg-[#EC81FF]/10 text-[#EC81FF]" />
        </div>
      </div>

      {/* Ika Stats */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Globe className="w-4 h-4 text-teal-400" />
          <h2 className="text-sm font-semibold text-white">Ika dWallet — Cross-Chain Credit</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Bindings" value={ika.totalBindings || 0} icon={Activity} color="bg-teal-500/10 text-teal-400" />
          <StatCard label="Active Chains" value={ika.activeChains || 0} sub="ETH + BTC wallets" icon={Globe} color="bg-blue-500/10 text-blue-400" />
          <StatCard label="Unique Wallets" value={ika.uniqueWallets || 0} icon={Users} color="bg-yellow-500/10 text-yellow-400" />
          <StatCard label="On-Chain Txs" value={ika.onChainTxCount || 0} sub="Devnet memo proofs" icon={TrendingUp} color="bg-[#EC81FF]/10 text-[#EC81FF]" />
        </div>
      </div>

      {/* Chain Breakdown */}
      {(ika.ethCount > 0 || ika.btcCount > 0) && (
        <div className="bg-[#12121E] rounded-xl border border-[#1E1E2A] p-4">
          <h3 className="text-xs font-semibold text-white mb-3">Chain Breakdown</h3>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: '#627EEA20', color: '#627EEA' }}>E</div>
              <span className="text-sm font-semibold text-white">{ika.ethCount || 0}</span>
              <span className="text-[10px] text-slate-500">Ethereum</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: '#F7931A20', color: '#F7931A' }}>B</div>
              <span className="text-sm font-semibold text-white">{ika.btcCount || 0}</span>
              <span className="text-[10px] text-slate-500">Bitcoin</span>
            </div>
          </div>
        </div>
      )}

      {/* Recent Events */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-white">Recent Integration Events</h2>
          <span className="text-[10px] text-slate-600">(last 50)</span>
        </div>
        <div className="bg-[#12121E] rounded-xl border border-[#1E1E2A] overflow-hidden">
          {recentEvents.length === 0 ? (
            <p className="text-center text-xs text-slate-600 py-8">No integration events yet</p>
          ) : (
            recentEvents.map((ev) => <EventRow key={ev.id} event={ev} />)
          )}
        </div>
      </div>
    </motion.div>
  );
}
