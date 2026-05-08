import { cors, getRedis, sbInsert, QUICKNODE_WEBHOOK_SECRET } from '../_lib/shared.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;

  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, service: 'quicknode-webhook', configured: !!QUICKNODE_WEBHOOK_SECRET });
  }

  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const secret = req.headers['x-qn-api-key'] || req.headers['x-quicknode-signature'];
  if (QUICKNODE_WEBHOOK_SECRET && secret !== QUICKNODE_WEBHOOK_SECRET) {
    return res.status(401).json({ ok: false, error: 'Invalid QuickNode webhook secret' });
  }

  const events = Array.isArray(req.body) ? req.body : [req.body];
  const redis = getRedis();
  let processed = 0;

  for (const event of events) {
    try {
      if (event?.matchedTransactions || event?.matchedReceipts) {
        await redis.lpush('qn_events', JSON.stringify({ event, received_at: new Date().toISOString() }));
        processed++;
      }
    } catch (e) { console.warn('[qn-webhook] Event processing error:', e.message); }
  }

  try {
    await sbInsert('notification_events', {
      channel: 'quicknode_webhook', event_type: 'webhook_received',
      status: 'processed', metadata: { events_count: events.length, processed },
    });
  } catch {}

  return res.status(200).json({ ok: true, processed });
}
