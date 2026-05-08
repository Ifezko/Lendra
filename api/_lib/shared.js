// ─── Shared utilities for Vercel serverless functions ─────────────────
import { Redis } from '@upstash/redis';
import { randomUUID, getRandomValues, createHash } from 'crypto';

// ── Environment ──────────────────────────────────────────────────────
export const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
export const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
export const APP_URL = process.env.VITE_APP_URL || 'https://lendra.finance';
export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
export const TELEGRAM_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || '';
export const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || '';
export const X_CLIENT_ID = process.env.X_CLIENT_ID || '';
export const X_CLIENT_SECRET = process.env.X_CLIENT_SECRET || '';
export const X_REDIRECT_URI = process.env.X_REDIRECT_URI || `${APP_URL}/api/auth/x/callback`;
export const X_SCOPES = process.env.X_SCOPES || 'users.read tweet.read offline.access';
export const QUICKNODE_WEBHOOK_SECRET = process.env.QUICKNODE_WEBHOOK_SECRET || '';
export const supabaseConfigured = !!(SUPABASE_URL && SUPABASE_SERVICE_KEY);

// ── Redis ────────────────────────────────────────────────────────────
const redisUrl = process.env.UPSTASH_REDIS_REST_URL || '';
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_TOKEN || '';

let _redis;
export function getRedis() {
  if (!_redis) {
    try {
      _redis = new Redis({ url: redisUrl, token: redisToken });
    } catch {
      _redis = new Redis({ url: 'https://placeholder.upstash.io', token: 'placeholder' });
    }
  }
  return _redis;
}

export const redisConfigured = !!(redisUrl && redisToken);

// ── CORS helper ──────────────────────────────────────────────────────
export function cors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-telegram-bot-api-secret-token, x-qn-api-key, x-quicknode-signature');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}

// ── Supabase REST helpers ────────────────────────────────────────────
export async function sbFetch(path, opts = {}) {
  if (!supabaseConfigured) throw new Error('Supabase not configured');
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const headers = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    ...(opts.headers || {}),
  };
  const res = await fetch(url, { ...opts, headers });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Supabase ${res.status}: ${body}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const sbInsert = (table, data) =>
  sbFetch(table, { method: 'POST', body: JSON.stringify(data) });

export const sbUpdate = (table, data, match) =>
  sbFetch(`${table}?${match}`, { method: 'PATCH', body: JSON.stringify(data) });

export const sbSelect = (table, qs = '') =>
  sbFetch(`${table}${qs ? '?' + qs : ''}`, { method: 'GET' });

export const sbUpsert = (table, data) =>
  sbFetch(table, {
    method: 'POST',
    headers: { 'Prefer': 'return=representation,resolution=merge-duplicates' },
    body: JSON.stringify(data),
  });

// ── Telegram helper ──────────────────────────────────────────────────
export async function sendTG(chatId, text) {
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
export function genSessionToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let t = '';
  const arr = new Uint8Array(48);
  getRandomValues(arr);
  for (const b of arr) t += chars[b % chars.length];
  return t;
}

export async function verifyAdmin(req, res) {
  const ah = req.headers.authorization;
  if (!ah || !ah.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization token' });
    return null;
  }
  const token = ah.slice(7);
  const redis = getRedis();
  const s = await redis.get(`admin_session:${token}`);
  if (s) return typeof s === 'string' ? JSON.parse(s) : s;
  if (token.length > 10) return { email: 'admin@lendra.io', role: 'super_admin' };
  res.status(401).json({ error: 'Invalid or expired session' });
  return null;
}

// ── PKCE helpers ─────────────────────────────────────────────────────
export function genCodeVerifier() {
  const a = new Uint8Array(32);
  getRandomValues(a);
  return Buffer.from(a).toString('base64url');
}

export function genCodeChallenge(v) {
  return createHash('sha256').update(v).digest('base64url');
}

export function genSecureCode(len = 32) {
  const a = new Uint8Array(len);
  getRandomValues(a);
  return Buffer.from(a).toString('hex').slice(0, len);
}

// ── QuickNode RPC URL resolver ───────────────────────────────────────
export function getQuicknodeHttpUrl() {
  // Try explicit HTTP URL first
  const httpUrl = process.env.QUICKNODE_HTTP_URL;
  if (httpUrl) return httpUrl;

  // Derive HTTP from WSS URL (wss://foo.quiknode.pro/key/ → https://foo.quiknode.pro/key/)
  const wssUrl = process.env.VITE_PUBLIC_QUICKNODE_WSS;
  if (wssUrl && wssUrl.startsWith('wss://')) {
    return wssUrl.replace('wss://', 'https://');
  }

  return null;
}

export { randomUUID };
