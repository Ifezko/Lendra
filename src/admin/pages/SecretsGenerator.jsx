import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAdminAuth } from '../useAdminAuth';
import {
  Key, Copy, Check, Eye, EyeOff, RefreshCw, Shield, AlertTriangle,
  Download, Trash2, Clock, Hash, Tag, Loader2, ChevronDown, Lock,
} from 'lucide-react';

const TOKEN_TYPES = [
  { id: 'api_key', label: 'API Key', prefix: 'lndr_', defaultLength: 48, desc: 'General-purpose API key' },
  { id: 'webhook_secret', label: 'Webhook Secret', prefix: 'whsec_', defaultLength: 40, desc: 'For verifying webhook signatures' },
  { id: 'jwt_secret', label: 'JWT Secret', prefix: '', defaultLength: 64, desc: 'HMAC signing key for JWTs' },
  { id: 'encryption_key', label: 'Encryption Key', prefix: '', defaultLength: 64, desc: 'AES-256 encryption key (hex)' },
  { id: 'service_token', label: 'Service Token', prefix: 'svc_', defaultLength: 48, desc: 'Inter-service auth token' },
  { id: 'partner_key', label: 'Partner Key', prefix: 'ptnr_', defaultLength: 32, desc: 'Third-party partner API key' },
  { id: 'signing_key', label: 'Signing Key', prefix: 'sk_', defaultLength: 56, desc: 'Cryptographic signing material' },
  { id: 'access_token', label: 'Access Token', prefix: 'at_', defaultLength: 44, desc: 'Short-lived access token' },
];

const ENVIRONMENTS = ['production', 'staging', 'development', 'testing'];

async function generateSecureRandom(length) {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  const base62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from(arr, (b) => base62[b % 62]).join('');
}

async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function maskSecret(s) {
  if (s.length <= 8) return '*'.repeat(s.length);
  return s.slice(0, 6) + '*'.repeat(Math.max(s.length - 10, 4)) + s.slice(-4);
}

function suggestEnvName(name, type, env) {
  const base = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  const suffix = type === 'encryption_key' ? '_KEY' : type === 'jwt_secret' ? '_JWT_SECRET' : '_SECRET';
  const prefix = env !== 'production' ? `${env.toUpperCase()}_` : '';
  return `${prefix}LENDRA_${base}${suffix}`;
}

export default function SecretsGenerator() {
  const { adminFetch, isSuperAdmin } = useAdminAuth();
  const [tokenType, setTokenType] = useState(TOKEN_TYPES[0]);
  const [tokenName, setTokenName] = useState('');
  const [environment, setEnvironment] = useState('production');
  const [customLength, setCustomLength] = useState(null);
  const [generatedToken, setGeneratedToken] = useState(null);
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const length = customLength || tokenType.defaultLength;

  const fetchHistory = useCallback(async () => {
    try {
      const res = await adminFetch('/api/admin/secrets/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch {}
    setLoadingHistory(false);
  }, [adminFetch]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowTypeDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleGenerate = async () => {
    setError('');
    if (!tokenName.trim()) { setError('Token name is required'); return; }
    const raw = await generateSecureRandom(length);
    const token = tokenType.prefix ? `${tokenType.prefix}${raw}` : raw;
    const hash = await sha256(token);
    setGeneratedToken({ value: token, hash, name: tokenName, type: tokenType.id, env: environment });
    setShowToken(true);
  };

  const handleSave = async () => {
    if (!generatedToken) return;
    setSaving(true);
    setError('');
    try {
      const res = await adminFetch('/api/admin/secrets/save', {
        method: 'POST',
        body: JSON.stringify({
          token_name: generatedToken.name,
          token_type: generatedToken.type,
          environment: generatedToken.env,
          prefix: tokenType.prefix,
          secret_hash: generatedToken.hash,
          suggested_env_name: suggestEnvName(generatedToken.name, generatedToken.type, generatedToken.env),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }
      await fetchHistory();
      setGeneratedToken(null);
      setTokenName('');
      setShowToken(false);
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Delete this audit record? The actual secret cannot be recovered.')) return;
    try {
      const res = await adminFetch(`/api/admin/secrets/${id}`, { method: 'DELETE' });
      if (res.ok) setHistory((h) => h.filter((e) => e.id !== id));
    } catch {}
  };

  const copyToClipboard = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {}
  };

  const handleExport = () => {
    if (!generatedToken) return;
    const envName = suggestEnvName(generatedToken.name, generatedToken.type, generatedToken.env);
    const lines = [
      `# Lendra Secret - Generated ${new Date().toISOString()}`,
      `# Type: ${tokenType.label}`,
      `# Name: ${generatedToken.name}`,
      `# Environment: ${generatedToken.env}`,
      `# Hash: ${generatedToken.hash}`,
      `${envName}=${generatedToken.value}`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${envName}.env`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Lock className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Super Admin access required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Secret Token Generator</h1>
          <p className="text-xs text-slate-500 mt-1">Generate cryptographically secure tokens for Lendra services</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <Shield className="w-3 h-3 text-amber-400" />
          <span className="text-[10px] text-amber-400 font-medium">Super Admin Only</span>
        </div>
      </div>

      {/* Generator Card */}
      <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl overflow-hidden">
        <div className="border-b border-[#1E1E2A] px-5 py-3.5 flex items-center gap-2">
          <Key className="w-4 h-4 text-[#EC81FF]" />
          <h2 className="text-sm font-semibold text-white">Generate New Secret</h2>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Token Name */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Token Name</label>
              <input
                type="text"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                placeholder="e.g. Webhook Primary, API Gateway"
                className="w-full bg-[#0A0A12] border border-[#1E1E2A] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#EC81FF]/40 transition-colors"
              />
            </div>

            {/* Token Type Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Token Type</label>
              <button
                onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                className="w-full flex items-center justify-between bg-[#0A0A12] border border-[#1E1E2A] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#EC81FF]/40 transition-colors text-left"
              >
                <div>
                  <span>{tokenType.label}</span>
                  {tokenType.prefix && (
                    <span className="ml-2 text-[10px] text-slate-500 font-mono">{tokenType.prefix}***</span>
                  )}
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${showTypeDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showTypeDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#12121E] border border-[#1E1E2A] rounded-xl overflow-hidden z-20 shadow-xl max-h-60 overflow-y-auto">
                  {TOKEN_TYPES.map((tt) => (
                    <button
                      key={tt.id}
                      onClick={() => { setTokenType(tt); setCustomLength(null); setShowTypeDropdown(false); }}
                      className={`w-full text-left px-4 py-2.5 transition-colors ${
                        tt.id === tokenType.id ? 'bg-[#EC81FF]/10 text-[#EC81FF]' : 'text-slate-300 hover:bg-[#1E1E2A]'
                      }`}
                    >
                      <div className="text-xs font-medium">{tt.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{tt.desc} &middot; {tt.defaultLength} chars</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Environment */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Environment</label>
              <div className="flex flex-wrap gap-1.5">
                {ENVIRONMENTS.map((env) => (
                  <button
                    key={env}
                    onClick={() => setEnvironment(env)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      environment === env
                        ? 'bg-[#EC81FF]/10 text-[#EC81FF] border-[#EC81FF]/30'
                        : 'text-slate-400 border-[#1E1E2A] hover:border-slate-600'
                    }`}
                  >
                    {env}
                  </button>
                ))}
              </div>
            </div>

            {/* Length */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Length <span className="text-slate-600">({length} chars)</span>
              </label>
              <input
                type="range"
                min={16}
                max={128}
                value={length}
                onChange={(e) => setCustomLength(Number(e.target.value))}
                className="w-full accent-[#EC81FF]"
              />
              <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                <span>16</span>
                <span>128</span>
              </div>
            </div>

            {/* Suggested Env Name */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Env Variable</label>
              <div className="bg-[#0A0A12] border border-[#1E1E2A] rounded-xl px-3.5 py-2.5 font-mono text-[11px] text-[#EC81FF] truncate">
                {tokenName ? suggestEnvName(tokenName, tokenType.id, environment) : 'LENDRA_***_SECRET'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleGenerate}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#EC81FF] to-[#B84FCC] text-white text-sm font-bold hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Generate Token
            </button>
            {generatedToken && (
              <span className="text-[10px] text-slate-500">Token ready &mdash; copy before navigating away</span>
            )}
          </div>
        </div>
      </div>

      {/* Generated Token Display */}
      {generatedToken && (
        <div className="bg-[#12121E] border border-[#EC81FF]/20 rounded-2xl overflow-hidden">
          <div className="border-b border-[#1E1E2A] px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-white">Generated Token</h2>
            </div>
            <span className="text-[10px] text-amber-400">This value will not be shown again after saving</span>
          </div>

          <div className="p-5 space-y-4">
            {/* Token value */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Secret Value</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-[#0A0A12] border border-[#1E1E2A] rounded-xl px-3.5 py-3 font-mono text-xs text-emerald-400 break-all">
                  {showToken ? generatedToken.value : maskSecret(generatedToken.value)}
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => setShowToken(!showToken)}
                    className="p-2 rounded-lg bg-[#1E1E2A] text-slate-400 hover:text-white transition-colors"
                    title={showToken ? 'Hide' : 'Reveal'}
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => copyToClipboard(generatedToken.value, 'token')}
                    className="p-2 rounded-lg bg-[#1E1E2A] text-slate-400 hover:text-white transition-colors"
                    title="Copy"
                  >
                    {copied === 'token' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Hash + meta */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">SHA-256 Hash</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-[#0A0A12] border border-[#1E1E2A] rounded-xl px-3.5 py-2.5 font-mono text-[10px] text-slate-500 truncate">
                    {generatedToken.hash}
                  </div>
                  <button
                    onClick={() => copyToClipboard(generatedToken.hash, 'hash')}
                    className="p-2 rounded-lg bg-[#1E1E2A] text-slate-400 hover:text-white transition-colors flex-shrink-0"
                  >
                    {copied === 'hash' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Env Line</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-[#0A0A12] border border-[#1E1E2A] rounded-xl px-3.5 py-2.5 font-mono text-[10px] text-[#EC81FF] truncate">
                    {suggestEnvName(generatedToken.name, generatedToken.type, generatedToken.env)}={generatedToken.value}
                  </div>
                  <button
                    onClick={() => copyToClipboard(`${suggestEnvName(generatedToken.name, generatedToken.type, generatedToken.env)}=${generatedToken.value}`, 'env')}
                    className="p-2 rounded-lg bg-[#1E1E2A] text-slate-400 hover:text-white transition-colors flex-shrink-0"
                  >
                    {copied === 'env' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-sm font-medium hover:bg-emerald-500/25 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save to Audit Log
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2 rounded-xl bg-[#1E1E2A] text-slate-300 text-sm font-medium hover:bg-[#252533] transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export .env
              </button>
              <button
                onClick={() => { setGeneratedToken(null); setShowToken(false); }}
                className="px-4 py-2 rounded-xl text-slate-500 text-sm font-medium hover:text-red-400 transition-colors"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit History */}
      <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl overflow-hidden">
        <div className="border-b border-[#1E1E2A] px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-white">Generation Audit Log</h2>
          </div>
          <span className="text-[10px] text-slate-600">{history.length} records</span>
        </div>

        <div className="overflow-x-auto">
          {loadingHistory ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 text-[#EC81FF] animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="flex items-center justify-center py-10">
              <div className="text-center">
                <Hash className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500">No tokens have been generated yet.</p>
              </div>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1E1E2A]">
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-500 uppercase">Name</th>
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-500 uppercase">Type</th>
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-500 uppercase">Env</th>
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-500 uppercase">Hash (first 12)</th>
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-500 uppercase">Env Var</th>
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-500 uppercase">Created</th>
                  <th className="px-5 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {history.map((event) => (
                  <tr key={event.id} className="border-b border-[#1E1E2A] last:border-0 hover:bg-[#1E1E2A]/30">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Tag className="w-3 h-3 text-slate-600" />
                        <span className="text-xs text-white font-medium">{event.token_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-[10px] text-slate-400 bg-[#1E1E2A] px-2 py-0.5 rounded">{event.token_type}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                        event.environment === 'production' ? 'bg-red-500/10 text-red-400' :
                        event.environment === 'staging' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-blue-500/10 text-blue-400'
                      }`}>{event.environment}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-mono text-[10px] text-slate-500">{event.secret_hash?.slice(0, 12)}...</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-mono text-[10px] text-[#EC81FF]/80">{event.suggested_env_name}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-[10px] text-slate-500">{new Date(event.created_at).toLocaleDateString()}</span>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Security Notice */}
      <div className="bg-amber-500/5 border border-amber-500/15 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-amber-400 mb-1">Security Protocol</h3>
            <ul className="text-xs text-slate-400 space-y-1.5">
              <li>Tokens are generated client-side using the Web Crypto API. The raw secret value never leaves your browser.</li>
              <li>Only the SHA-256 hash is saved to the audit log for verification. The actual secret cannot be recovered from the hash.</li>
              <li>Copy the token immediately. Once you navigate away or discard it, the raw value is lost permanently.</li>
              <li>Use the Export .env button to download the token as an environment file for safe transfer to deployment infrastructure.</li>
              <li>Rotate tokens periodically. Compromised tokens should be regenerated immediately.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
