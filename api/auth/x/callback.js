// Handled by catch-all api/[...path].js -> server/app.ts
/* DISABLED:

async function _disabled(req, res) {
  if (cors(req, res)) return;

  const { code, state, error: oauthError } = req.query || {};
  if (oauthError) return res.redirect(302, `${APP_URL}/?x_error=${encodeURIComponent(oauthError)}`);
  if (!code || !state) return res.redirect(302, `${APP_URL}/?x_error=missing_params`);

  const redis = getRedis();
  const raw = await redis.get(`x_oauth:${state}`);
  if (!raw) return res.redirect(302, `${APP_URL}/?x_error=expired`);

  const { wallet, verifier } = typeof raw === 'string' ? JSON.parse(raw) : raw;
  await redis.del(`x_oauth:${state}`);

  // Exchange code for token
  const basicAuth = Buffer.from(`${X_CLIENT_ID}:${X_CLIENT_SECRET}`).toString('base64');
  const tokenRes = await fetch('https://api.x.com/2/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${basicAuth}` },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: X_REDIRECT_URI, code_verifier: verifier }),
  });
  if (!tokenRes.ok) return res.redirect(302, `${APP_URL}/?x_error=token_exchange_failed`);
  const tokens = await tokenRes.json();

  // Fetch user info
  const meRes = await fetch('https://api.x.com/2/users/me?user.fields=profile_image_url', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const me = meRes.ok ? await meRes.json() : null;
  const xUser = me?.data || {};

  // Save to wallet profile
  try {
    await sbUpdate('wallet_profiles', {
      x_username: xUser.username || '',
      x_user_id: xUser.id || '',
      x_profile_image: xUser.profile_image_url || '',
      x_name: xUser.name || '',
      x_connected: true,
      x_connected_at: new Date().toISOString(),
      x_access_token: tokens.access_token,
      x_refresh_token: tokens.refresh_token || '',
      updated_at: new Date().toISOString(),
    }, `wallet_address=eq.${wallet}`);
  } catch (e) {
    console.warn('[x-callback] Profile update error:', e.message);
    return res.redirect(302, `${APP_URL}/?x_error=db_save_failed`);
  }

  return res.redirect(302, `${APP_URL}/?x_connected=true&x_username=${encodeURIComponent(xUser.username || '')}`);
}
*/
