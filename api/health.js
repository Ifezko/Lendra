import { cors, supabaseConfigured, redisConfigured, APP_URL, TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, X_CLIENT_ID, X_CLIENT_SECRET, QUICKNODE_WEBHOOK_SECRET } from './_lib/shared.js';

export default function handler(req, res) {
  if (cors(req, res)) return;
  res.status(200).json({
    ok: true,
    service: 'lendra-api',
    deployment: 'vercel',
    appUrl: APP_URL,
    supabaseConfigured,
    serviceRoleConfigured: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    quicknodeApiConfigured: !!process.env.QUICKNODE_API_KEY,
    quicknodeWssConfigured: !!process.env.VITE_PUBLIC_QUICKNODE_WSS,
    redisConfigured,
    telegramConfigured: !!(TELEGRAM_BOT_TOKEN && TELEGRAM_WEBHOOK_SECRET),
    xConfigured: !!(X_CLIENT_ID && X_CLIENT_SECRET),
    quicknodeWebhookConfigured: !!QUICKNODE_WEBHOOK_SECRET,
    timestamp: new Date().toISOString(),
  });
}
