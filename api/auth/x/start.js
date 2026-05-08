import { cors, getRedis, genCodeVerifier, genCodeChallenge, genSecureCode, X_CLIENT_ID, X_REDIRECT_URI, X_SCOPES, APP_URL } from '../../_lib/shared.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (!X_CLIENT_ID) return res.status(500).json({ ok: false, error: 'X OAuth not configured' });

  const wallet = req.query?.wallet || '';
  if (!wallet) return res.status(400).json({ ok: false, error: 'wallet query required' });

  const state = genSecureCode(32);
  const verifier = genCodeVerifier();
  const challenge = genCodeChallenge(verifier);

  const redis = getRedis();
  await redis.set(`x_oauth:${state}`, JSON.stringify({ wallet, verifier }), { ex: 600 });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: X_CLIENT_ID,
    redirect_uri: X_REDIRECT_URI,
    scope: X_SCOPES,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  return res.redirect(302, `https://x.com/i/oauth2/authorize?${params}`);
}
