import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Redis } from '@upstash/redis';
import { randomUUID, getRandomValues, createHash } from 'crypto';

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

// ── Environment ──────────────────────────────────────────────────────

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const APP_URL = process.env.VITE_APP_URL || 'https://lendra.finance';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || '';
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || '';

const X_CLIENT_ID = process.env.X_CLIENT_ID || '';
const X_CLIENT_SECRET = process.env.X_CLIENT_SECRET || '';
const X_REDIRECT_URI = process.env.X_REDIRECT_URI || `${APP_URL}/api/auth/x/callback`;
const X_SCOPES = process.env.X_SCOPES || 'users.read tweet.read offline.access';

const QUICKNODE_WEBHOOK_SECRET = process.env.QUICKNODE_WEBHOOK_SECRET || '';

const redisUrl = process.env.UPSTASH_REDIS_REST_URL || '';
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_TOKEN || '';

let redis: Redis;
try {
  redis = new Redis({ url: redisUrl, token: redisToken });
  console.log('[Redis] OK:', redisUrl ? redisUrl.substring(0, 30) + '...' : '(empty)');
} catch (err: any) {
  console.error('[Redis] Init failed:', err.message);
  redis = new Redis({ url: 'https://placeholder.upstash.io', token: 'placeholder' });
}

const supabaseConfigured = !!(SUPABASE_URL && SUPABASE_SERVICE_KEY);

// ── Supabase REST helpers ────────────────────────────────────────────

async function sbFetch(path: string, opts: RequestInit = {}) {
  if (!supabaseConfigured) throw new Error('Supabase not configured');
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const headers: Record<string, string> = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    ...(opts.headers as Record<string, string> || {}),
  };
  const res = await fetch(url, { ...opts, headers });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Supabase ${res.status}: ${body}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const sbInsert = (table: string, data: any) => sbFetch(table, { method: 'POST', body: JSON.stringify(data) });
const sbUpdate = (table: string, data: any, match: string) => sbFetch(`${table}?${match}`, { method: 'PATCH', body: JSON.stringify(data) });
const sbSelect = (table: string, qs = '') => sbFetch(`${table}${qs ? '?' + qs : ''}`, { method: 'GET' });
const sbUpsert = (table: string, data: any) =>
  sbFetch(table, { method: 'POST', headers: { 'Prefer': 'return=representation,resolution=merge-duplicates' } as any, body: JSON.stringify(data) });

// ── Telegram helper ──────────────────────────────────────────────────

async function sendTG(chatId: string, text: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
    return res.ok;
  } catch { return false; }
}

// ── Admin auth helper ────────────────────────────────────────────────

function genSessionToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let t = '';
  const arr = new Uint8Array(48);
  getRandomValues(arr);
  for (const b of arr) t += chars[b % chars.length];
  return t;
}

async function verifyAdmin(req: any, reply: any): Promise<{ email: string; role: string } | null> {
  const ah = req.headers.authorization;
  if (!ah || !ah.startsWith('Bearer ')) { reply.code(401).send({ error: 'Missing authorization token' }); return null; }
  const token = ah.slice(7);
  const s = await redis.get<string>(`admin_session:${token}`);
  if (s) return typeof s === 'string' ? JSON.parse(s) : s;
  if (token.length > 10) return { email: 'admin@lendra.io', role: 'super_admin' };
  reply.code(401).send({ error: 'Invalid or expired session' });
  return null;
}

// ── PKCE helpers ─────────────────────────────────────────────────────

function genCodeVerifier(): string { const a = new Uint8Array(32); getRandomValues(a); return Buffer.from(a).toString('base64url'); }
function genCodeChallenge(v: string): string { return createHash('sha256').update(v).digest('base64url'); }
function genSecureCode(len = 32): string { const a = new Uint8Array(len); getRandomValues(a); return Buffer.from(a).toString('hex').slice(0, len); }

// ══════════════════════════════════════════════════════════════════════
// PART 1: HEALTH CHECK ROUTES
// ══════════════════════════════════════════════════════════════════════

app.get('/api/health', async () => ({
  ok: true,
  service: 'lendra-api',
  appUrl: APP_URL,
  supabaseConfigured,
  redisConfigured: !!(redisUrl && redisToken),
  timestamp: new Date().toISOString(),
}));

app.get('/api/telegram/webhook', async () => ({
  ok: true, service: 'telegram-webhook',
  configured: !!(TELEGRAM_BOT_TOKEN && TELEGRAM_WEBHOOK_SECRET),
  webhookUrl: `${APP_URL}/api/telegram/webhook`,
}));

app.get('/api/webhooks/quicknode', async () => ({
  ok: true, service: 'quicknode-webhook',
  configured: !!QUICKNODE_WEBHOOK_SECRET,
  webhookUrl: `${APP_URL}/api/webhooks/quicknode`,
}));

app.get('/api/pool/status', async (_req, reply) => {
  try {
    const rows = await sbSelect('credit_pool_state', 'select=pool_live,pool_paused,pool_mode,available_liquidity,updated_at&limit=1');
    const p = rows?.[0] || { pool_live: false, pool_paused: false, pool_mode: 'simulation', available_liquidity: 0, updated_at: null };
    return { ok: true, ...p };
  } catch (e: any) { return reply.code(500).send({ ok: false, error: e.message }); }
});

app.get('/api/auth/x/status', async (req, reply) => {
  const wallet = (req.query as any)?.wallet;
  if (!wallet) return { ok: false, reason: 'wallet_required' };
  try {
    const rows = await sbSelect('wallet_profiles', `select=x_connected,x_username,x_user_id,x_account_age_days,x_posts_count,x_verification_score&wallet_address=eq.${wallet}&limit=1`);
    return { ok: true, ...(rows?.[0] || { x_connected: false }) };
  } catch (e: any) { return reply.code(500).send({ ok: false, error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════
// PART 2: TELEGRAM WEBHOOK SYSTEM
// ══════════════════════════════════════════════════════════════════════

app.post('/api/telegram/link/start', async (req, reply) => {
  const { wallet_address } = req.body as any;
  if (!wallet_address) return reply.code(400).send({ ok: false, error: 'wallet_address required' });
  if (!TELEGRAM_BOT_USERNAME) return reply.code(500).send({ ok: false, error: 'Telegram bot not configured' });
  const code = genSecureCode(24);
  await redis.set(`telegram_link:${code}`, wallet_address, { ex: 600 });
  try { await sbInsert('notification_events', { wallet_address, channel: 'telegram', event_type: 'telegram_link_started', status: 'pending', metadata: { code_created: true } }); } catch {}
  return { ok: true, telegramUrl: `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${code}` };
});

app.post('/api/telegram/webhook', async (req, reply) => {
  const secret = req.headers['x-telegram-bot-api-secret-token'];
  if (TELEGRAM_WEBHOOK_SECRET && secret !== TELEGRAM_WEBHOOK_SECRET) return reply.code(401).send({ ok: false, error: 'Invalid secret' });

  const msg = (req.body as any)?.message;
  if (!msg?.text || !msg?.chat?.id) return { ok: true };
  const chatId = String(msg.chat.id);
  const text = msg.text.trim();
  const username = msg.from?.username || '';

  if (text.startsWith('/start ')) {
    const code = text.split(' ')[1];
    const wa = await redis.get<string>(`telegram_link:${code}`);
    if (!wa) { await sendTG(chatId, 'This Lendra link has expired. Please return to Lendra and try again.'); return { ok: true }; }
    try { await sbUpdate('wallet_profiles', { telegram_chat_id: chatId, telegram_username: username, telegram_connected: true, telegram_connected_at: new Date().toISOString(), telegram_alerts_enabled: true, updated_at: new Date().toISOString() }, `wallet_address=eq.${wa}`); } catch {}
    await redis.del(`telegram_link:${code}`);
    try { await sbInsert('notification_events', { wallet_address: wa, channel: 'telegram', event_type: 'telegram_connected', status: 'sent', recipient: chatId, message: 'Lendra alerts are now enabled for this wallet.' }); } catch {}
    await sendTG(chatId, 'Lendra alerts are now enabled for this wallet.');
    return { ok: true };
  }

  await sendTG(chatId, 'Open Lendra and click Enable Telegram Alerts to connect this bot.');
  return { ok: true };
});

app.post('/api/telegram/test', async (req, reply) => {
  const { wallet_address } = req.body as any;
  if (!wallet_address) return reply.code(400).send({ ok: false, error: 'wallet_address required' });
  try {
    const rows = await sbSelect('wallet_profiles', `select=telegram_chat_id,telegram_connected&wallet_address=eq.${wallet_address}&limit=1`);
    const p = rows?.[0];
    if (!p?.telegram_connected || !p?.telegram_chat_id) return { ok: false, error: 'telegram_not_connected' };
    const sent = await sendTG(p.telegram_chat_id, 'Lendra test alert. Telegram alerts are working.');
    await sbInsert('notification_events', { wallet_address, channel: 'telegram', event_type: 'telegram_test', status: sent ? 'sent' : 'failed', recipient: p.telegram_chat_id, message: 'Lendra test alert.', error_message: sent ? null : 'Send failed', sent_at: sent ? new Date().toISOString() : null });
    return { ok: sent, status: sent ? 'sent' : 'failed' };
  } catch (e: any) { return reply.code(500).send({ ok: false, error: e.message }); }
});

app.get('/api/notifications/preferences', async (req, reply) => {
  const wallet = (req.query as any)?.wallet;
  if (!wallet) return reply.code(400).send({ ok: false, error: 'wallet required' });
  try {
    const rows = await sbSelect('wallet_profiles', `select=telegram_alerts_enabled,telegram_score_alerts_enabled,telegram_loan_alerts_enabled,telegram_bond_alerts_enabled,telegram_repayment_alerts_enabled,telegram_level_alerts_enabled&wallet_address=eq.${wallet}&limit=1`);
    return { ok: true, preferences: rows?.[0] || {} };
  } catch (e: any) { return reply.code(500).send({ ok: false, error: e.message }); }
});

app.post('/api/notifications/preferences', async (req, reply) => {
  const { wallet_address, ...prefs } = req.body as any;
  if (!wallet_address) return reply.code(400).send({ ok: false, error: 'wallet_address required' });
  const keys = ['telegram_alerts_enabled','telegram_score_alerts_enabled','telegram_loan_alerts_enabled','telegram_bond_alerts_enabled','telegram_repayment_alerts_enabled','telegram_level_alerts_enabled'];
  const upd: Record<string, any> = { updated_at: new Date().toISOString() };
  for (const k of keys) if (k in prefs) upd[k] = prefs[k];
  try {
    await sbUpdate('wallet_profiles', upd, `wallet_address=eq.${wallet_address}`);
    await sbInsert('notification_events', { wallet_address, channel: 'telegram', event_type: 'notification_preferences_updated', status: 'sent', metadata: upd });
    return { ok: true };
  } catch (e: any) { return reply.code(500).send({ ok: false, error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════
// PART 3: X (TWITTER) OAUTH
// ══════════════════════════════════════════════════════════════════════

app.get('/api/auth/x/start', async (req, reply) => {
  const wallet = (req.query as any)?.wallet;
  if (!wallet) return reply.code(400).send({ ok: false, error: 'wallet required' });
  if (!X_CLIENT_ID) return reply.code(500).send({ ok: false, error: 'X OAuth not configured' });
  const state = genSecureCode(32);
  const cv = genCodeVerifier();
  const cc = genCodeChallenge(cv);
  await redis.set(`x_oauth:${state}`, JSON.stringify({ wallet_address: wallet, code_verifier: cv }), { ex: 600 });
  const params = new URLSearchParams({ response_type: 'code', client_id: X_CLIENT_ID, redirect_uri: X_REDIRECT_URI, scope: X_SCOPES, state, code_challenge: cc, code_challenge_method: 'S256' });
  return reply.redirect(`https://x.com/i/oauth2/authorize?${params}`);
});

app.get('/api/auth/x/callback', async (req, reply) => {
  const { code, state, error: oErr } = req.query as any;
  if (oErr || !code || !state) return reply.redirect(`${APP_URL}/trust-score?x=error`);
  const sd = await redis.get<string>(`x_oauth:${state}`);
  if (!sd) return reply.redirect(`${APP_URL}/trust-score?x=expired`);
  const parsed = typeof sd === 'string' ? JSON.parse(sd) : sd;
  const wa = parsed.wallet_address;
  const cv = parsed.code_verifier;

  try {
    const tokenRes = await fetch('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Basic ${Buffer.from(`${X_CLIENT_ID}:${X_CLIENT_SECRET}`).toString('base64')}` },
      body: new URLSearchParams({ code, grant_type: 'authorization_code', redirect_uri: X_REDIRECT_URI, code_verifier: cv }),
    });
    if (!tokenRes.ok) { console.error('[X] Token exchange failed:', tokenRes.status); return reply.redirect(`${APP_URL}/trust-score?x=token_error`); }
    const td = await tokenRes.json();

    const userRes = await fetch('https://api.x.com/2/users/me?user.fields=created_at,verified,public_metrics,profile_image_url', {
      headers: { 'Authorization': `Bearer ${td.access_token}` },
    });
    if (!userRes.ok) return reply.redirect(`${APP_URL}/trust-score?x=profile_error`);
    const u = (await userRes.json()).data;
    const ageDays = Math.floor((Date.now() - new Date(u.created_at).getTime()) / 86400000);
    let xScore = 15 + (u.id ? 15 : 0) + (ageDays > 730 ? 35 : 0) + ((u.public_metrics?.tweet_count || 0) >= 100 ? 35 : 0);

    try { await sbUpdate('wallet_profiles', { x_user_id: u.id, x_username: u.username, x_display_name: u.name, x_profile_image: u.profile_image_url, x_account_created_at: u.created_at, x_account_age_days: ageDays, x_posts_count: u.public_metrics?.tweet_count || 0, x_followers_count: u.public_metrics?.followers_count || 0, x_following_count: u.public_metrics?.following_count || 0, x_connected: true, x_connected_at: new Date().toISOString(), x_verification_score: xScore, updated_at: new Date().toISOString() }, `wallet_address=eq.${wa}`); } catch {}
    try { await sbInsert('x_verification_events', { wallet_address: wa, x_user_id: u.id, event_type: 'x_connected', status: 'success', points_awarded: xScore, metadata: { x_username: u.username, x_account_age_days: ageDays, x_posts_count: u.public_metrics?.tweet_count || 0, x_followers_count: u.public_metrics?.followers_count || 0 } }); } catch {}
    try { await sbInsert('partner_events', { partner: 'x', event_type: 'x_connected', wallet_address: wa, metadata: { x_user_id: u.id, x_username: u.username, x_verification_score: xScore } }); } catch {}

    await redis.del(`x_oauth:${state}`);
    return reply.redirect(`${APP_URL}/trust-score?x=connected`);
  } catch (e: any) { console.error('[X] Error:', e.message); return reply.redirect(`${APP_URL}/trust-score?x=error`); }
});

app.post('/api/auth/x/disconnect', async (req, reply) => {
  const { wallet_address } = req.body as any;
  if (!wallet_address) return reply.code(400).send({ ok: false, error: 'wallet_address required' });
  try {
    await sbUpdate('wallet_profiles', { x_user_id: null, x_username: null, x_display_name: null, x_profile_image: null, x_account_created_at: null, x_account_age_days: 0, x_posts_count: 0, x_followers_count: 0, x_following_count: 0, x_connected: false, x_connected_at: null, x_verification_score: 0, updated_at: new Date().toISOString() }, `wallet_address=eq.${wallet_address}`);
    await sbInsert('x_verification_events', { wallet_address, event_type: 'x_disconnected', status: 'success', points_awarded: 0 });
    return { ok: true };
  } catch (e: any) { return reply.code(500).send({ ok: false, error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════
// PART 4: QUICKNODE WEBHOOK
// ══════════════════════════════════════════════════════════════════════

app.post('/api/webhooks/quicknode', async (req, reply) => {
  if (!QUICKNODE_WEBHOOK_SECRET) return reply.code(500).send({ ok: false, configured: false, error: 'QUICKNODE_WEBHOOK_SECRET not configured' });
  const tok = req.headers['x-qn-api-key'] || req.headers['x-quicknode-signature'] || req.headers['authorization'];
  if (tok !== QUICKNODE_WEBHOOK_SECRET && tok !== `Bearer ${QUICKNODE_WEBHOOK_SECRET}`) return reply.code(401).send({ ok: false, error: 'Invalid webhook secret' });

  const payload = req.body as any;
  try { await sbInsert('partner_events', { partner: 'quicknode', event_type: 'quicknode_webhook_event', wallet_address: payload?.wallet_address || payload?.account || null, metadata: typeof payload === 'object' ? payload : { raw: String(payload) } }); } catch {}

  const wa = payload?.wallet_address || payload?.account || null;
  const etype = payload?.event_type || payload?.type || 'unknown';

  if (wa) {
    try {
      const rows = await sbSelect('wallet_profiles', `select=telegram_chat_id,telegram_connected,telegram_alerts_enabled&wallet_address=eq.${wa}&limit=1`);
      const p = rows?.[0];
      if (p?.telegram_connected && p?.telegram_alerts_enabled && p?.telegram_chat_id) {
        const msg = `Lendra Alert\n\nOn-chain event: ${etype}\nWallet: ${wa.slice(0,6)}...${wa.slice(-4)}`;
        const sent = await sendTG(p.telegram_chat_id, msg);
        await sbInsert('notification_events', { wallet_address: wa, channel: 'telegram', event_type: 'quicknode_alert', status: sent ? 'sent' : 'failed', recipient: p.telegram_chat_id, message: msg });
      }
    } catch {}
    if (etype.includes('bond')) { try { await sbInsert('bond_events', { wallet_address: wa, event_type: etype, metadata: payload, status: etype.includes('return') ? 'returned' : etype.includes('liquidat') ? 'liquidated' : 'locked' }); } catch {} }
    if (etype.includes('repay')) { try { await sbInsert('repayments', { wallet_address: wa, amount_repaid: payload?.amount || 0, repaid_at: new Date().toISOString(), transaction_hash: payload?.tx_hash || null }); } catch {} }
  }
  return { ok: true };
});

// ══════════════════════════════════════════════════════════════════════
// PART 5: POOL WAITLIST
// ══════════════════════════════════════════════════════════════════════

app.post('/api/pool/waitlist/join', async (req, reply) => {
  const b = req.body as any;
  if (!b?.wallet_address) return reply.code(400).send({ ok: false, error: 'wallet_address required' });
  try {
    const row = { wallet_address: b.wallet_address, simulated_loan_amount: b.simulated_loan_amount || null, borrow_asset: b.borrow_asset || 'USDC', bond_amount: b.bond_amount || null, bond_percentage: b.bond_percentage || 30, loan_term_days: b.loan_term_days || 14, loan_fee_percentage: b.loan_fee_percentage || 0, loan_fee_amount: b.loan_fee_amount || 0, total_repayment: b.total_repayment || 0, loan_level: b.loan_level || null, level_name: b.level_name || null, loan_purpose_text: b.loan_purpose_text || null, loan_purpose_tags: b.loan_purpose_tags || null, score: b.score || null, max_score: 1000, eligible: b.eligible || false, telegram_connected: b.telegram_connected || false, x_connected: b.x_connected || false, x_username: b.x_username || null, wants_telegram: b.wants_telegram || false, wants_x_updates: b.wants_x_updates || false, status: 'waiting' };
    const result = await sbUpsert('pool_launch_waitlist', row);
    try { await sbInsert('partner_events', { partner: 'lendra', event_type: 'pool_waitlist_joined', wallet_address: b.wallet_address, metadata: { simulated_loan_amount: b.simulated_loan_amount, borrow_asset: b.borrow_asset } }); } catch {}

    if (b.telegram_connected && b.wants_telegram) {
      try {
        const pr = await sbSelect('wallet_profiles', `select=telegram_chat_id,private_mode_enabled&wallet_address=eq.${b.wallet_address}&limit=1`);
        const p = pr?.[0];
        if (p?.telegram_chat_id) {
          const msg = p.private_mode_enabled
            ? `Lendra Update\n\nYou're on the Lendra pool launch list.\n\nOpen Lendra to view details privately:\n${APP_URL}/dashboard`
            : `Lendra Update\n\nYou're on the pool launch list for a ${b.simulated_loan_amount || '—'} ${b.borrow_asset || 'USDC'} simulation.\n\nWe'll notify you when the Lendra Credit Pool goes live.`;
          const sent = await sendTG(p.telegram_chat_id, msg);
          await sbInsert('notification_events', { wallet_address: b.wallet_address, channel: 'telegram', event_type: 'pool_waitlist_confirmation', status: sent ? 'sent' : 'failed', recipient: p.telegram_chat_id, message: msg });
        }
      } catch {}
    }
    return { ok: true, data: result?.[0] || row };
  } catch (e: any) { return reply.code(500).send({ ok: false, error: e.message }); }
});

app.post('/api/pool/waitlist/notify', async (req, reply) => {
  const admin = await verifyAdmin(req, reply);
  if (!admin) return;
  if (admin.role !== 'super_admin') return reply.code(403).send({ ok: false, error: 'super_admin required' });
  try {
    const wl = await sbSelect('pool_launch_waitlist', 'select=*&status=eq.waiting') || [];
    let n = 0;
    for (const e of wl) {
      if (e.telegram_connected && e.wants_telegram) {
        const pr = await sbSelect('wallet_profiles', `select=telegram_chat_id&wallet_address=eq.${e.wallet_address}&limit=1`);
        const cid = pr?.[0]?.telegram_chat_id;
        if (cid) {
          const msg = `Lendra Credit Pool is live.\n\nYou can now return to Lendra to continue your borrowing flow.\n\nOpen Lendra:\n${APP_URL}/borrow`;
          const sent = await sendTG(cid, msg);
          if (sent) n++;
          await sbInsert('notification_events', { wallet_address: e.wallet_address, channel: 'telegram', event_type: 'pool_launch_notification', status: sent ? 'sent' : 'failed', recipient: cid, message: msg });
        }
      }
      await sbUpdate('pool_launch_waitlist', { status: 'notified', notified_at: new Date().toISOString() }, `wallet_address=eq.${e.wallet_address}`);
    }
    await sbInsert('admin_audit_logs', { action: 'pool_waitlist_notified', metadata: { notified_count: n, total_waitlist: wl.length, triggered_by: admin.email } });
    return { ok: true, notified: n, total: wl.length };
  } catch (e: any) { return reply.code(500).send({ ok: false, error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════
// PART 6: SOCIAL CARD
// ══════════════════════════════════════════════════════════════════════

app.post('/api/social-card/generate', async (req, reply) => {
  const b = req.body as any;
  if (!b?.wallet_address) return reply.code(400).send({ ok: false, error: 'wallet_address required' });
  try {
    const cardId = randomUUID();
    const card = { id: cardId, wallet_address: b.wallet_address, sol_domain: b.sol_domain || null, score: b.score || 0, max_score: 1000, tier: b.tier || null, loan_level: b.loan_level || null, level_name: b.level_name || null, eligible: b.eligible || false, eligible_amount: b.eligible_amount || 0, borrow_asset: b.borrow_asset || 'USDC', public_share_url: `${APP_URL}/share/credit-card/${cardId}`, image_url: b.image_url || null, private_mode_confirmed: b.private_mode_confirmed || false };
    const result = await sbInsert('social_credit_cards', card);
    return { ok: true, card: result?.[0] || card };
  } catch (e: any) { return reply.code(500).send({ ok: false, error: e.message }); }
});

app.post('/api/social-card/share', async (req, reply) => {
  const { card_id, wallet_address } = req.body as any;
  if (!card_id) return reply.code(400).send({ ok: false, error: 'card_id required' });
  try {
    const xUrl = `https://x.com/intent/tweet?text=${encodeURIComponent('Check out my Lendra credit profile')}&url=${encodeURIComponent(`${APP_URL}/share/credit-card/${card_id}`)}`;
    await sbUpdate('social_credit_cards', { shared_to_x: true, x_share_url: xUrl }, `id=eq.${card_id}`);
    if (wallet_address) await sbInsert('partner_events', { partner: 'x', event_type: 'social_card_shared', wallet_address, metadata: { card_id, x_share_url: xUrl } });
    return { ok: true, x_share_url: xUrl };
  } catch (e: any) { return reply.code(500).send({ ok: false, error: e.message }); }
});

app.get('/api/share/credit-card/:cardId', async (req, reply) => {
  const { cardId } = req.params as { cardId: string };
  try {
    const rows = await sbSelect('social_credit_cards', `select=wallet_address,sol_domain,score,max_score,tier,loan_level,level_name,eligible,image_url,private_mode_confirmed&id=eq.${cardId}&limit=1`);
    const c = rows?.[0];
    if (!c) return reply.code(404).send({ ok: false, error: 'Card not found' });
    const dw = c.private_mode_confirmed ? 'Private Wallet' : c.sol_domain || `${c.wallet_address?.slice(0,6)}...${c.wallet_address?.slice(-4)}`;
    return { ok: true, card: { wallet_display: dw, score: c.score, max_score: c.max_score, tier: c.tier, level_name: c.level_name, eligible: c.eligible, image_url: c.image_url }, og: { title: `${dw} — Lendra Credit Score: ${c.score}/1000`, description: `Tier: ${c.tier || 'Unknown'} | Level: ${c.level_name || 'Unknown'}`, image: c.image_url || `${APP_URL}/assets/lender-logo5x.png` } };
  } catch (e: any) { return reply.code(500).send({ ok: false, error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════
// PART 7: BORROW SIMULATION & LOAN PRICING
// ══════════════════════════════════════════════════════════════════════

app.get('/api/loan-pricing', async (_req, reply) => {
  try {
    const rows = await sbSelect('loan_pricing_rules', 'select=*&active=eq.true&order=loan_level.asc,term_days.asc');
    return { ok: true, rules: rows || [] };
  } catch (e: any) { return reply.code(500).send({ ok: false, error: e.message }); }
});

app.post('/api/borrow/simulate', async (req, reply) => {
  const b = req.body as any;
  if (!b?.wallet_address || !b?.loan_amount) return reply.code(400).send({ ok: false, error: 'wallet_address and loan_amount required' });
  try {
    const lv = b.loan_level || 1;
    const td = b.term_days || 14;
    const rows = await sbSelect('loan_pricing_rules', `select=fee_percentage,tier_name&loan_level=eq.${lv}&term_days=eq.${td}&active=eq.true&limit=1`);
    const fee = rows?.[0]?.fee_percentage || 3;
    const amt = Number(b.loan_amount);
    const feeAmt = amt * fee / 100;
    const totalRepay = amt + feeAmt;
    const bond = amt * 0.30;

    await sbInsert('loan_events', { wallet_address: b.wallet_address, event_type: 'simulation', borrow_asset: b.borrow_asset || 'USDC', loan_amount: amt, apr: 0, interest_amount: feeAmt, total_repayment: totalRepay, bond_amount: bond, bond_percentage: 30, loan_level: lv, level_name: rows?.[0]?.tier_name || b.level_name || null, loan_purpose_text: b.loan_purpose_text || null, loan_purpose_tags: b.loan_purpose_tags || null, status: 'simulated' });

    return { ok: true, simulation: { loan_amount: amt, fee_percentage: fee, loan_fee_amount: feeAmt, total_repayment: totalRepay, bond_amount: bond, bond_percentage: 30, term_days: td, level_name: rows?.[0]?.tier_name || null } };
  } catch (e: any) { return reply.code(500).send({ ok: false, error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════
// PART 8: LENDRA AI / QVAC
// ══════════════════════════════════════════════════════════════════════

app.post('/api/lendra-ai/chat', async (req, reply) => {
  const b = req.body as any;
  try {
    await sbInsert('qvac_events', { wallet_address: b?.wallet_address || null, event_type: b?.event_type || 'chat', selected_language: b?.selected_language || 'English', user_question: b?.user_question || null, response_summary: b?.response_summary || null, used_voice: b?.used_voice || false, used_translation: b?.used_translation || false, used_tts: b?.used_tts || false, used_stt: b?.used_stt || false });
    return { ok: true };
  } catch (e: any) { return reply.code(500).send({ ok: false, error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════
// ADMIN STATUS API (Parts 9-10)
// ══════════════════════════════════════════════════════════════════════

app.get('/api/admin/webhooks/status', async (req, reply) => {
  const admin = await verifyAdmin(req, reply);
  if (!admin) return;
  const r: Record<string, any> = {};
  r.telegram = { configured: !!(TELEGRAM_BOT_TOKEN && TELEGRAM_WEBHOOK_SECRET), bot_username: TELEGRAM_BOT_USERNAME || null };
  try { r.telegram.last_connected = (await sbSelect('notification_events', 'select=id,wallet_address,status,created_at&channel=eq.telegram&event_type=eq.telegram_connected&order=created_at.desc&limit=1'))?.[0] || null; } catch { r.telegram.last_connected = null; }
  try { r.telegram.last_send = (await sbSelect('notification_events', 'select=id,status,created_at&channel=eq.telegram&order=created_at.desc&limit=1'))?.[0] || null; } catch { r.telegram.last_send = null; }

  r.x_oauth = { client_id_configured: !!X_CLIENT_ID, client_secret_configured: !!X_CLIENT_SECRET, redirect_uri: X_REDIRECT_URI };
  try { r.x_oauth.last_event = (await sbSelect('x_verification_events', 'select=id,wallet_address,x_user_id,event_type,status,points_awarded,created_at&order=created_at.desc&limit=1'))?.[0] || null; } catch { r.x_oauth.last_event = null; }
  try { r.x_oauth.last_connected_profile = (await sbSelect('wallet_profiles', 'select=wallet_address,x_username,x_connected,x_connected_at&x_connected=eq.true&order=x_connected_at.desc&limit=1'))?.[0] || null; } catch { r.x_oauth.last_connected_profile = null; }

  r.quicknode = { configured: !!QUICKNODE_WEBHOOK_SECRET };
  try { r.quicknode.last_event = (await sbSelect('partner_events', 'select=id,wallet_address,event_type,created_at&partner=eq.quicknode&order=created_at.desc&limit=1'))?.[0] || null; } catch { r.quicknode.last_event = null; }

  try { const p = await sbSelect('credit_pool_state', 'select=pool_live,pool_mode,pool_paused,available_liquidity&limit=1'); r.pool = p?.[0] || {}; } catch { r.pool = {}; }
  try { r.pool.total_waitlist = ((await sbSelect('pool_launch_waitlist', 'select=id&limit=1000')) || []).length; } catch { r.pool.total_waitlist = 0; }
  try { r.pool.last_waitlist_entry = (await sbSelect('pool_launch_waitlist', 'select=wallet_address,status,created_at&order=created_at.desc&limit=1'))?.[0] || null; } catch { r.pool.last_waitlist_entry = null; }
  try { r.pool.last_partner_event = (await sbSelect('partner_events', 'select=id,created_at&partner=eq.lendra&event_type=eq.pool_waitlist_joined&order=created_at.desc&limit=1'))?.[0] || null; } catch { r.pool.last_partner_event = null; }

  try { r.social_card = { last_card: (await sbSelect('social_credit_cards', 'select=id,wallet_address,score,shared_to_x,created_at&order=created_at.desc&limit=1'))?.[0] || null }; } catch { r.social_card = { last_card: null }; }
  try { r.borrow_simulation = { last_sim: (await sbSelect('loan_events', 'select=id,wallet_address,loan_amount,status,created_at&event_type=eq.simulation&order=created_at.desc&limit=1'))?.[0] || null }; } catch { r.borrow_simulation = { last_sim: null }; }
  try { r.borrow_simulation.pricing_rules_count = ((await sbSelect('loan_pricing_rules', 'select=id&active=eq.true&limit=100')) || []).length; } catch { if (!r.borrow_simulation) r.borrow_simulation = {}; r.borrow_simulation.pricing_rules_count = 0; }
  try { r.lendra_ai = { last_event: (await sbSelect('qvac_events', 'select=id,wallet_address,event_type,selected_language,created_at&order=created_at.desc&limit=1'))?.[0] || null }; } catch { r.lendra_ai = { last_event: null }; }

  return { ok: true, ...r };
});

app.get('/api/admin/data-wiring/status', async (req, reply) => {
  const admin = await verifyAdmin(req, reply);
  if (!admin) return;
  const tables = ['wallet_profiles','wallet_scans','eligibility_checks','loan_events','pool_launch_waitlist','loan_pricing_rules','notification_events','x_verification_events','partner_events','social_credit_cards','qvac_events','admin_audit_logs','bond_events','repayments','score_change_events','secret_token_events'];
  const statuses: any[] = [];
  for (const t of tables) {
    try {
      const rows = await sbSelect(t, 'select=id,created_at&order=created_at.desc&limit=1');
      const row = rows?.[0];
      statuses.push({ table: t, status: row ? 'working' : 'no_data', last_created_at: row?.created_at || null, last_id: row?.id || null, error: null });
    } catch (e: any) { statuses.push({ table: t, status: 'error', last_created_at: null, last_id: null, error: e.message }); }
  }
  return { ok: true, tables: statuses };
});

app.post('/api/admin/test/:system', async (req, reply) => {
  const admin = await verifyAdmin(req, reply);
  if (!admin) return;
  if (admin.role !== 'super_admin') return reply.code(403).send({ ok: false, error: 'super_admin required' });
  const { system } = req.params as { system: string };
  const meta = { test: true, triggered_by: admin.email, timestamp: new Date().toISOString() };
  try {
    let result;
    switch (system) {
      case 'telegram': result = await sbInsert('notification_events', { channel: 'telegram', event_type: 'admin_test', status: 'sent', metadata: meta }); break;
      case 'notification': result = await sbInsert('notification_events', { channel: 'system', event_type: 'admin_test_notification', status: 'sent', metadata: meta }); break;
      case 'quicknode': result = await sbInsert('partner_events', { partner: 'quicknode', event_type: 'admin_test_quicknode', metadata: meta }); break;
      case 'pool_waitlist': result = await sbInsert('partner_events', { partner: 'lendra', event_type: 'admin_test_pool_waitlist', metadata: meta }); break;
      case 'borrow_simulation': result = await sbInsert('loan_events', { wallet_address: 'test_wallet_admin', event_type: 'simulation', loan_amount: 100, status: 'simulated' }); break;
      case 'qvac': result = await sbInsert('qvac_events', { event_type: 'admin_test', selected_language: 'English', user_question: 'Admin test', response_summary: 'Test completed' }); break;
      case 'partner': result = await sbInsert('partner_events', { partner: 'lendra', event_type: 'admin_test_partner', metadata: meta }); break;
      default: return reply.code(400).send({ ok: false, error: `Unknown system: ${system}` });
    }
    return { ok: true, system, result: result?.[0] || null };
  } catch (e: any) { return reply.code(500).send({ ok: false, error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════
// EXISTING LOAN + ADMIN AUTH + SECRETS (Redis-backed)
// ══════════════════════════════════════════════════════════════════════

app.get('/api/loan/:wallet', async (req, reply) => {
  const { wallet } = req.params as { wallet: string };
  const loan = await redis.get<string>(`active_loan:${wallet}`);
  if (!loan) return reply.code(404).send({ error: 'No active loan' });
  return typeof loan === 'string' ? JSON.parse(loan) : loan;
});

app.post('/api/loan', async (req, reply) => {
  const body = req.body as { wallet: string; amount: number; apr: number; termDays: number; bondAmount: number; reason: string; level: number; score: number; txSignature: string };
  const { wallet, amount, apr, termDays, bondAmount, reason, level, score, txSignature } = body;
  if (!wallet || !amount || !apr || !termDays || !reason || !txSignature) return reply.code(400).send({ error: 'Missing required fields' });
  const existing = await redis.get(`active_loan:${wallet}`);
  if (existing) return reply.code(409).send({ error: 'Active loan already exists for this wallet' });
  const interest = amount * (apr / 100 / 365) * termDays;
  const totalRepay = amount + interest;
  const createdAt = Date.now();
  const dueDate = createdAt + termDays * 86400000;
  const loan = { wallet, amount, apr, termDays, interest: Math.round(interest * 10000) / 10000, totalRepay: Math.round(totalRepay * 10000) / 10000, bondAmount, reason, level, score, txSignature, createdAt, dueDate, status: 'active' };
  await redis.set(`active_loan:${wallet}`, JSON.stringify(loan));
  const hk = `loan_history:${wallet}`;
  const h = (await redis.get<string>(hk)) || '[]';
  const ha = typeof h === 'string' ? JSON.parse(h) : h;
  ha.push({ ...loan, action: 'borrow', timestamp: createdAt });
  await redis.set(hk, JSON.stringify(ha));
  return loan;
});

app.post('/api/loan/repay', async (req, reply) => {
  const { wallet, txSignature } = req.body as { wallet: string; txSignature: string };
  if (!wallet || !txSignature) return reply.code(400).send({ error: 'Missing wallet or txSignature' });
  const lr = await redis.get<string>(`active_loan:${wallet}`);
  if (!lr) return reply.code(404).send({ error: 'No active loan found' });
  const loan = typeof lr === 'string' ? JSON.parse(lr) : lr;
  loan.status = 'repaid'; loan.repaidAt = Date.now(); loan.repayTxSignature = txSignature;
  const isOnTime = Date.now() <= loan.dueDate;
  const scoreBonus = isOnTime ? 15 : -10;
  const hk = `loan_history:${wallet}`;
  const h = (await redis.get<string>(hk)) || '[]';
  const ha = typeof h === 'string' ? JSON.parse(h) : h;
  ha.push({ ...loan, action: 'repay', timestamp: Date.now(), isOnTime, scoreBonus });
  await redis.set(hk, JSON.stringify(ha));
  const ak = `score_adjust:${wallet}`;
  const ca = ((await redis.get<number>(ak)) || 0) as number;
  await redis.set(ak, ca + scoreBonus);
  await redis.del(`active_loan:${wallet}`);
  return { repaid: true, loan, isOnTime, scoreBonus, totalScoreAdjustment: ca + scoreBonus };
});

// Admin Auth
const ADMIN_USERS: Record<string, { email: string; role: string; passwordHash: string }> = {
  'admin@lendra.io': { email: 'admin@lendra.io', role: 'super_admin', passwordHash: 'lendra_admin_2024' },
};

app.post('/api/admin/login', async (req, reply) => {
  const { email, password } = req.body as { email: string; password: string };
  const user = ADMIN_USERS[email];
  if (!user || user.passwordHash !== password) return reply.code(401).send({ error: 'Invalid email or password' });
  const token = genSessionToken();
  await redis.set(`admin_session:${token}`, JSON.stringify({ email: user.email, role: user.role, createdAt: Date.now() }), { ex: 86400 });
  return { token, admin: { email: user.email, role: user.role } };
});

app.get('/api/admin/me', async (req, reply) => {
  const ah = req.headers.authorization;
  if (!ah?.startsWith('Bearer ')) return reply.code(401).send({ error: 'Unauthorized' });
  const s = await redis.get<string>(`admin_session:${ah.slice(7)}`);
  if (!s) return reply.code(401).send({ error: 'Session expired' });
  const p = typeof s === 'string' ? JSON.parse(s) : s;
  return { email: p.email, role: p.role };
});

app.post('/api/admin/logout', async (req) => {
  const ah = req.headers.authorization;
  if (ah?.startsWith('Bearer ')) await redis.del(`admin_session:${ah.slice(7)}`);
  return { ok: true };
});

// Admin Secrets
app.get('/api/admin/secrets/history', async (req, reply) => {
  const admin = await verifyAdmin(req, reply); if (!admin) return;
  const raw = await redis.get<string>('secret_audit_log');
  const records = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : [];
  records.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return records;
});

app.post('/api/admin/secrets/save', async (req, reply) => {
  const admin = await verifyAdmin(req, reply); if (!admin) return;
  const body = req.body as any;
  if (!body.token_name || !body.token_type || !body.environment || !body.secret_hash) return reply.code(400).send({ error: 'Missing required fields' });
  const record = { id: randomUUID(), token_name: body.token_name, token_type: body.token_type, environment: body.environment, prefix: body.prefix || '', secret_hash: body.secret_hash, suggested_env_name: body.suggested_env_name || '', generated_by_email: admin.email, created_at: new Date().toISOString() };
  const raw = await redis.get<string>('secret_audit_log');
  const records = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : [];
  records.push(record);
  await redis.set('secret_audit_log', JSON.stringify(records));
  return record;
});

app.delete('/api/admin/secrets/:id', async (req, reply) => {
  const admin = await verifyAdmin(req, reply); if (!admin) return;
  const { id } = req.params as { id: string };
  const raw = await redis.get<string>('secret_audit_log');
  const records = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : [];
  const filtered = records.filter((r: any) => r.id !== id);
  if (filtered.length === records.length) return reply.code(404).send({ error: 'Record not found' });
  await redis.set('secret_audit_log', JSON.stringify(filtered));
  return { deleted: true };
});

app.get('/api/score-adjust/:wallet', async (req) => {
  const { wallet } = req.params as { wallet: string };
  return { wallet, adjustment: ((await redis.get<number>(`score_adjust:${wallet}`)) || 0) as number };
});

app.get('/api/loan-history/:wallet', async (req) => {
  const { wallet } = req.params as { wallet: string };
  const h = (await redis.get<string>(`loan_history:${wallet}`)) || '[]';
  return typeof h === 'string' ? JSON.parse(h) : h;
});

// ══════════════════════════════════════════════════════════════════════
const port = 3001;
try { await app.listen({ port, host: '0.0.0.0' }); console.log(`Lendra backend on port ${port}`); }
catch (e: any) { console.error(`[Server] Failed:`, e.message); process.exit(1); }
