import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../useAdminAuth';
import { Settings, Save, Loader2, CheckCircle, AlertTriangle, Globe, Shield, Zap, Database } from 'lucide-react';

const DEFAULT_SETTINGS = {
  platform_name: 'Lendra',
  network: 'devnet',
  max_loan_level: 6,
  min_score_for_loan: 300,
  bond_lock_days: 30,
  interest_rate_bps: 500,
  default_grace_period_hours: 72,
  telegram_bot_enabled: false,
  x_verification_enabled: true,
  social_cards_enabled: true,
  encrypt_private_mode: false,
  ika_cross_chain: false,
  maintenance_mode: false,
};

function SettingToggle({ label, desc, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#1E1E2A] last:border-0">
      <div>
        <p className="text-xs text-white font-medium">{label}</p>
        {desc && <p className="text-[10px] text-slate-500 mt-0.5">{desc}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-10 h-5 rounded-full transition-colors ${value ? 'bg-[#EC81FF]' : 'bg-[#1E1E2A]'}`}
      >
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${value ? 'left-5.5 translate-x-0.5' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

function SettingNumber({ label, desc, value, onChange, min, max, suffix }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#1E1E2A] last:border-0">
      <div>
        <p className="text-xs text-white font-medium">{label}</p>
        {desc && <p className="text-[10px] text-slate-500 mt-0.5">{desc}</p>}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min}
          max={max}
          className="w-20 bg-[#0A0A12] border border-[#1E1E2A] rounded-lg px-2 py-1.5 text-xs text-white text-right focus:outline-none focus:border-[#EC81FF]/40"
        />
        {suffix && <span className="text-[10px] text-slate-500">{suffix}</span>}
      </div>
    </div>
  );
}

export default function AdminSettings() {
  const { adminFetch } = useAdminAuth();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await adminFetch('/api/admin/settings');
        if (res.ok) {
          const data = await res.json();
          setSettings((s) => ({ ...s, ...data }));
        }
      } catch {}
      setLoading(false);
    };
    fetch_();
  }, [adminFetch]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await adminFetch('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {}
    setSaving(false);
  };

  const update = (key) => (val) => setSettings((s) => ({ ...s, [key]: val }));

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-[#EC81FF] animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Settings</h1>
          <p className="text-xs text-slate-500 mt-1">Platform configuration and feature flags</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#EC81FF] to-[#B84FCC] text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : saved ? 'Saved' : 'Save Changes'}
        </button>
      </div>

      <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#EC81FF]" /> Network
        </h3>
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-xs text-white font-medium">Solana Network</p>
            <p className="text-[10px] text-slate-500">Active blockchain network</p>
          </div>
          <div className="flex gap-1.5">
            {['devnet', 'mainnet-beta'].map((n) => (
              <button
                key={n}
                onClick={() => update('network')(n)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  settings.network === n ? 'bg-[#EC81FF]/10 text-[#EC81FF] border-[#EC81FF]/20' : 'text-slate-400 border-[#1E1E2A]'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Database className="w-4 h-4 text-[#EC81FF]" /> Lending Parameters
        </h3>
        <SettingNumber label="Max Loan Level" value={settings.max_loan_level} onChange={update('max_loan_level')} min={1} max={10} />
        <SettingNumber label="Min Score for Loan" desc="Minimum credit score to be eligible" value={settings.min_score_for_loan} onChange={update('min_score_for_loan')} min={0} max={1000} />
        <SettingNumber label="Interest Rate" desc="Annual rate in basis points" value={settings.interest_rate_bps} onChange={update('interest_rate_bps')} min={0} max={10000} suffix="bps" />
        <SettingNumber label="Bond Lock Period" value={settings.bond_lock_days} onChange={update('bond_lock_days')} min={1} max={365} suffix="days" />
        <SettingNumber label="Default Grace Period" value={settings.default_grace_period_hours} onChange={update('default_grace_period_hours')} min={1} max={720} suffix="hours" />
      </div>

      <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#EC81FF]" /> Features
        </h3>
        <SettingToggle label="Telegram Bot" desc="Enable Telegram notifications and bot commands" value={settings.telegram_bot_enabled} onChange={update('telegram_bot_enabled')} />
        <SettingToggle label="X Verification" desc="Allow users to verify their X account for score boost" value={settings.x_verification_enabled} onChange={update('x_verification_enabled')} />
        <SettingToggle label="Social Cards" desc="Enable shareable credit score cards" value={settings.social_cards_enabled} onChange={update('social_cards_enabled')} />
        <SettingToggle label="Encrypt Private Mode" desc="Enable privacy-preserving score proofs (devnet)" value={settings.encrypt_private_mode} onChange={update('encrypt_private_mode')} />
        <SettingToggle label="Ika Cross-Chain" desc="Enable cross-chain identity bridging (devnet)" value={settings.ika_cross_chain} onChange={update('ika_cross_chain')} />
      </div>

      <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-red-400" /> Danger Zone
        </h3>
        <SettingToggle
          label="Maintenance Mode"
          desc="Disable all user-facing features. Only admins can access the platform."
          value={settings.maintenance_mode}
          onChange={update('maintenance_mode')}
        />
        {settings.maintenance_mode && (
          <div className="flex items-center gap-2 mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <p className="text-xs text-red-400">Maintenance mode is ON. Users cannot access Lendra.</p>
          </div>
        )}
      </div>
    </div>
  );
}
