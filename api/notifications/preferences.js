import { cors, sbSelect, sbUpsert } from '../_lib/shared.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;

  if (req.method === 'GET') {
    const wallet = req.query?.wallet || req.query?.wallet_address;
    if (!wallet) return res.status(400).json({ ok: false, error: 'wallet query required' });
    try {
      const rows = await sbSelect('wallet_profiles', `select=telegram_connected,telegram_chat_id,telegram_alerts_enabled,telegram_username&wallet_address=eq.${wallet}&limit=1`);
      const p = rows?.[0] || {};
      return res.status(200).json({ ok: true, preferences: { telegramConnected: !!p.telegram_connected, telegramUsername: p.telegram_username || '', alertsEnabled: !!p.telegram_alerts_enabled } });
    } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
  }

  if (req.method === 'POST') {
    const { wallet_address, telegram_alerts_enabled } = req.body || {};
    if (!wallet_address) return res.status(400).json({ ok: false, error: 'wallet_address required' });
    try {
      await sbUpsert('wallet_profiles', { wallet_address, telegram_alerts_enabled: !!telegram_alerts_enabled, updated_at: new Date().toISOString() });
      return res.status(200).json({ ok: true });
    } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
