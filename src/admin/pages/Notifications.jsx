import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../useAdminAuth';
import { Bell, Send, Loader2, MessageSquare, Users, CheckCircle } from 'lucide-react';

export default function Notifications() {
  const { adminFetch } = useAdminAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ channel: 'telegram', audience: 'all', title: '', body: '' });
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await adminFetch('/api/admin/notifications');
        if (res.ok) setHistory(await res.json());
      } catch {}
      setLoading(false);
    };
    fetch_();
  }, [adminFetch]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.title || !form.body) return;
    setSending(true);
    try {
      const res = await adminFetch('/api/admin/notifications/send', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSuccess(true);
        setForm((f) => ({ ...f, title: '', body: '' }));
        setTimeout(() => setSuccess(false), 3000);
        const histRes = await adminFetch('/api/admin/notifications');
        if (histRes.ok) setHistory(await histRes.json());
      }
    } catch {}
    setSending(false);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-white">Notifications</h1>
        <p className="text-xs text-slate-500 mt-1">Send messages to Lendra users via Telegram or in-app</p>
      </div>

      <form onSubmit={handleSend} className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Send className="w-4 h-4 text-[#EC81FF]" /> Compose Notification
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Channel</label>
            <div className="flex gap-1.5">
              {['telegram', 'in_app', 'both'].map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, channel: ch }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize border transition-all ${
                    form.channel === ch ? 'bg-[#EC81FF]/10 text-[#EC81FF] border-[#EC81FF]/20' : 'text-slate-400 border-[#1E1E2A]'
                  }`}
                >
                  {ch.replace('_', '-')}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Audience</label>
            <div className="flex gap-1.5">
              {['all', 'eligible', 'active_loans'].map((aud) => (
                <button
                  key={aud}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, audience: aud }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize border transition-all ${
                    form.audience === aud ? 'bg-[#EC81FF]/10 text-[#EC81FF] border-[#EC81FF]/20' : 'text-slate-400 border-[#1E1E2A]'
                  }`}
                >
                  {aud.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Notification title"
            className="w-full bg-[#0A0A12] border border-[#1E1E2A] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#EC81FF]/40"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Body</label>
          <textarea
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            placeholder="Notification message..."
            rows={3}
            className="w-full bg-[#0A0A12] border border-[#1E1E2A] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#EC81FF]/40 resize-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={sending || !form.title || !form.body}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#EC81FF] to-[#B84FCC] text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? 'Sending...' : 'Send Notification'}
          </button>
          {success && (
            <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle className="w-4 h-4" /> Sent</span>
          )}
        </div>
      </form>

      <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl overflow-hidden">
        <div className="border-b border-[#1E1E2A] px-5 py-3.5">
          <h3 className="text-sm font-semibold text-white">Notification History</h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 text-[#EC81FF] animate-spin" /></div>
        ) : history.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No notifications sent yet.</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[#1E1E2A]">
            {history.map((n, i) => (
              <div key={n.id || i} className="px-5 py-3 hover:bg-[#1E1E2A]/30">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-white font-medium">{n.title}</p>
                  <span className="text-[10px] text-slate-500">{n.sentAt ? new Date(n.sentAt).toLocaleString() : '-'}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">{n.body}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] text-slate-600 bg-[#1E1E2A] px-2 py-0.5 rounded">{n.channel}</span>
                  <span className="text-[10px] text-slate-600 bg-[#1E1E2A] px-2 py-0.5 rounded">{n.audience}</span>
                  {n.recipientCount && <span className="text-[10px] text-slate-600">{n.recipientCount} recipients</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
