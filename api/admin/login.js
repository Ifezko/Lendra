import { cors, getRedis, genSessionToken } from '../_lib/shared.js';
import { createHash } from 'crypto';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

// DISABLED: Handled by catch-all api/[...path].js
async function _disabled(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ ok: false, error: 'email and password required' });

  const emailMatch = email === ADMIN_EMAIL;
  let pwMatch = false;
  if (ADMIN_PASSWORD_HASH) {
    pwMatch = createHash('sha256').update(password).digest('hex') === ADMIN_PASSWORD_HASH;
  } else {
    pwMatch = password === ADMIN_PASSWORD;
  }

  if (!emailMatch || !pwMatch) return res.status(401).json({ ok: false, error: 'Invalid credentials' });

  const token = genSessionToken();
  const redis = getRedis();
  await redis.set(`admin_session:${token}`, JSON.stringify({ email, role: 'super_admin', created_at: new Date().toISOString() }), { ex: 86400 });

  return res.status(200).json({ ok: true, token, email, role: 'super_admin' });
}
