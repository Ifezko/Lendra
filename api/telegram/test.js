import { cors, sbSelect, sbInsert, sendTG } from '../_lib/shared.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const { wallet_address } = req.body || {};
  if (!wallet_address) return res.status(400).json({ ok: false, error: 'wallet_address required' });

  try {
    const rows = await sbSelect('wallet_profiles', `select=telegram_chat_id,telegram_connected&wallet_address=eq.${wallet_address}&limit=1`);
    const p = rows?.[0];
    if (!p?.telegram_connected || !p?.telegram_chat_id) return res.status(200).json({ ok: false, error: 'telegram_not_connected' });

    const sent = await sendTG(p.telegram_chat_id, 'Lendra test alert. Telegram alerts are working.');
    await sbInsert('notification_events', {
      wallet_address, channel: 'telegram', event_type: 'telegram_test',
      status: sent ? 'sent' : 'failed', recipient: p.telegram_chat_id,
      message: 'Lendra test alert.',
      error_message: sent ? null : 'Send failed',
      sent_at: sent ? new Date().toISOString() : null,
    });
    return res.status(200).json({ ok: sent, status: sent ? 'sent' : 'failed' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
