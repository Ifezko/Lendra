import React, { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '../useAdminAuth';
import { UserCog, Plus, Trash2, Loader2, Shield, AlertTriangle, Check, X } from 'lucide-react';

const ROLES = ['super_admin', 'admin', 'analyst', 'viewer'];

export default function Admins() {
  const { adminFetch, isSuperAdmin } = useAdminAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', display_name: '', role: 'viewer' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchAdmins = useCallback(async () => {
    try {
      const res = await adminFetch('/api/admin/admins');
      if (res.ok) setAdmins(await res.json());
    } catch {}
    setLoading(false);
  }, [adminFetch]);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Email and password required'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await adminFetch('/api/admin/admins', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add admin');
      }
      await fetchAdmins();
      setShowAdd(false);
      setForm({ email: '', password: '', display_name: '', role: 'viewer' });
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this admin? They will lose all access.')) return;
    try {
      const res = await adminFetch(`/api/admin/admins/${id}`, { method: 'DELETE' });
      if (res.ok) setAdmins((a) => a.filter((admin) => admin.id !== id));
    } catch {}
  };

  const handleRoleChange = async (id, newRole) => {
    try {
      const res = await adminFetch(`/api/admin/admins/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) setAdmins((a) => a.map((admin) => admin.id === id ? { ...admin, role: newRole } : admin));
    } catch {}
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Shield className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Super Admin access required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Admin Management</h1>
          <p className="text-xs text-slate-500 mt-1">Manage Lendra Ops team access</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#EC81FF] to-[#B84FCC] text-white text-xs font-bold hover:opacity-90 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Admin
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-[#12121E] border border-[#EC81FF]/20 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">New Admin</h3>
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full bg-[#0A0A12] border border-[#1E1E2A] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#EC81FF]/40"
                placeholder="admin@lendra.finance"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full bg-[#0A0A12] border border-[#1E1E2A] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#EC81FF]/40"
                placeholder="Strong password"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Display Name</label>
              <input
                type="text"
                value={form.display_name}
                onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                className="w-full bg-[#0A0A12] border border-[#1E1E2A] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#EC81FF]/40"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Role</label>
              <div className="flex gap-1.5 flex-wrap">
                {ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, role: r }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize border transition-all ${
                      form.role === r ? 'bg-[#EC81FF]/10 text-[#EC81FF] border-[#EC81FF]/20' : 'text-slate-400 border-[#1E1E2A]'
                    }`}
                  >
                    {r.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#EC81FF] to-[#B84FCC] text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? 'Creating...' : 'Create Admin'}
            </button>
            <button type="button" onClick={() => { setShowAdd(false); setError(''); }} className="px-4 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-[#EC81FF] animate-spin" /></div>
        ) : admins.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <UserCog className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No admins found. Add one above.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1E1E2A]">
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-500 uppercase">Admin</th>
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-500 uppercase">Email</th>
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-500 uppercase">Role</th>
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-500 uppercase">Created</th>
                  <th className="px-5 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {admins.map((a) => (
                  <tr key={a.id} className="border-b border-[#1E1E2A] last:border-0 hover:bg-[#1E1E2A]/30">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#EC81FF]/10 flex items-center justify-center text-[11px] font-bold text-[#EC81FF]">
                          {a.display_name?.[0]?.toUpperCase() || a.email?.[0]?.toUpperCase()}
                        </div>
                        <span className="text-xs text-white font-medium">{a.display_name || '-'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3"><span className="text-xs text-slate-400">{a.email}</span></td>
                    <td className="px-5 py-3">
                      <select
                        value={a.role}
                        onChange={(e) => handleRoleChange(a.id, e.target.value)}
                        className="bg-[#0A0A12] border border-[#1E1E2A] rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                      </select>
                    </td>
                    <td className="px-5 py-3"><span className="text-[10px] text-slate-500">{a.created_at ? new Date(a.created_at).toLocaleDateString() : '-'}</span></td>
                    <td className="px-5 py-3">
                      <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
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
