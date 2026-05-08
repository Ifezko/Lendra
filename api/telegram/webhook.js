import { cors, getRedis, sbInsert, sbUpdate, sbSelect, sendTG, TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME, TELEGRAM_WEBHOOK_SECRET, APP_URL } from '../_lib/shared.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      service: 'telegram-webhook',
      configured: !!(TELEGRAM_BOT_TOKEN && TELEGRAM_WEBHOOK_SECRET),
      webhookUrl: `${APP_URL}/api/telegram/webhook`,
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const secret = req.headers['x-telegram-bot-api-secret-token'];
  if (TELEGRAM_WEBHOOK_SECRET && secret !== TELEGRAM_WEBHOOK_SECRET) {
    return res.status(401).json({ ok: false, error: 'Invalid secret' });
  }

  const msg = req.body?.message;
  if (!msg?.text || !msg?.chat?.id) return res.status(200).json({ ok: true });

  const chatId = String(msg.chat.id);
  const text = msg.text.trim();
  const username = msg.from?.username || '';
  const redis = getRedis();

  if (text.startsWith('/start ')) {
    const code = text.split(' ')[1];
    const wa = await redis.get(`telegram_link:${code}`);
    if (!wa) {
      await sendTG(chatId, 'This Lendra link has expired. Please return to Lendra and try again.');
      return res.status(200).json({ ok: true });
    }
    try {
      await sbUpdate('wallet_profiles', {
        telegram_chat_id: chatId,
        telegram_username: username,
        telegram_connected: true,
        telegram_connected_at: new Date().toISOString(),
        telegram_alerts_enabled: true,
        updated_at: new Date().toISOString(),
      }, `wallet_address=eq.${wa}`);
    } catch (e) { console.warn('[telegram] Profile update error:', e.message); }
    await redis.del(`telegram_link:${code}`);
    try {
      await sbInsert('notification_events', {
        wallet_address: wa,
        channel: 'telegram',
        event_type: 'telegram_connected',
        status: 'sent',
        recipient: chatId,
        message: 'Lendra alerts are now enabled for this wallet.',
      });
    } catch {}
    await sendTG(chatId, 'Lendra alerts are now enabled for this wallet.');
    return res.status(200).json({ ok: true });
  }

  await sendTG(chatId, 'Open Lendra and click Enable Telegram Alerts to connect this bot.');
  return res.status(200).json({ ok: true });
}
