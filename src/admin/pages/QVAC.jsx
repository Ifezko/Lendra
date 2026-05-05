import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../useAdminAuth';
import { Brain, TrendingUp, BarChart3, Loader2, Info, Settings, Sliders } from 'lucide-react';

const FACTORS = [
  { key: 'wallet_age', label: 'Wallet Age', weight: 15, desc: 'Time since first transaction' },
  { key: 'transaction_volume', label: 'Transaction Volume', weight: 20, desc: 'Total SOL transacted' },
  { key: 'defi_activity', label: 'DeFi Activity', weight: 15, desc: 'Interactions with DeFi protocols' },
  { key: 'nft_holdings', label: 'NFT Holdings', weight: 5, desc: 'Verified NFT ownership' },
  { key: 'token_diversity', label: 'Token Diversity', weight: 10, desc: 'Number of unique token types held' },
  { key: 'repayment_history', label: 'Repayment History', weight: 20, desc: 'Past loan repayment behavior' },
  { key: 'social_verification', label: 'Social Verification', weight: 10, desc: 'X, Telegram, .sol identity' },
  { key: 'bond_history', label: 'Bond History', weight: 5, desc: 'Collateral lock and unlock record' },
];

export default function QVAC() {
  const { adminFetch } = useAdminAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await adminFetch('/api/admin/qvac');
        if (res.ok) setData(await res.json());
      } catch {}
      setLoading(false);
    };
    fetch_();
  }, [adminFetch]);

  const d = data || { totalScored: 0, avgScore: 0, lastRun: null, modelVersion: '1.0.0' };

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-xl font-bold text-white">QVAC Engine</h1>
        <p className="text-xs text-slate-500 mt-1">Quantum Verification & Assessment Core &mdash; on-chain credit scoring</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-[#EC81FF] animate-spin" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl p-4">
              <Brain className="w-5 h-5 text-[#EC81FF] mb-2" />
              <p className="text-lg font-bold text-white">{d.totalScored}</p>
              <p className="text-[10px] text-slate-500">Wallets Scored</p>
            </div>
            <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl p-4">
              <TrendingUp className="w-5 h-5 text-blue-400 mb-2" />
              <p className="text-lg font-bold text-white">{d.avgScore}</p>
              <p className="text-[10px] text-slate-500">Avg Score</p>
            </div>
            <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl p-4">
              <Settings className="w-5 h-5 text-amber-400 mb-2" />
              <p className="text-lg font-bold text-white">v{d.modelVersion}</p>
              <p className="text-[10px] text-slate-500">Model Version</p>
            </div>
            <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl p-4">
              <BarChart3 className="w-5 h-5 text-emerald-400 mb-2" />
              <p className="text-lg font-bold text-white">{d.lastRun ? new Date(d.lastRun).toLocaleDateString() : 'Never'}</p>
              <p className="text-[10px] text-slate-500">Last Batch Run</p>
            </div>
          </div>

          <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sliders className="w-4 h-4 text-[#EC81FF]" />
              <h3 className="text-sm font-semibold text-white">Scoring Factor Weights</h3>
            </div>
            <div className="space-y-3">
              {FACTORS.map((f) => (
                <div key={f.key}>
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span className="text-xs text-white font-medium">{f.label}</span>
                      <span className="text-[10px] text-slate-600 ml-2">{f.desc}</span>
                    </div>
                    <span className="text-xs text-[#EC81FF] font-bold">{f.weight}%</span>
                  </div>
                  <div className="h-1.5 bg-[#1E1E2A] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#EC81FF] to-[#B84FCC]"
                      style={{ width: `${(f.weight / 20) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-blue-400 mb-1">About QVAC</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  QVAC analyzes on-chain wallet behavior to produce a credit score between 0 and 1000.
                  Factors include wallet age, transaction patterns, DeFi engagement, social verifications, and historical repayment.
                  The algorithm weights are configurable and can be adjusted to optimize for different risk profiles.
                  Score recalculation happens on each wallet interaction, with batch processing running periodically for dormant wallets.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
