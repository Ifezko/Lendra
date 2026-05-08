import { cors, getRedis, sbInsert, genSecureCode, TELEGRAM_BOT_USERNAME } from '../../_lib/shared.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const { wallet_address } = req.body || {};
  if (!wallet_address) return res.status(400).json({ ok: false, error: 'wallet_address required' });
  if (!TELEGRAM_BOT_USERNAME) return res.status(500).json({ ok: false, error: 'Telegram bot not configured' });

  const code = genSecureCode(24);
  const redis = getRedis();
  await redis.set(`telegram_link:${code}`, wallet_address, { ex: 600 });
  try {
    await sbInsert('notification_events', {
      wallet_address, channel: 'telegram', event_type: 'telegram_link_started',
      status: 'pending', metadata: { code_created: true },
    });
  } catch {}

  return res.status(200).json({ ok: true, telegramUrl: `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${code}` });
}
