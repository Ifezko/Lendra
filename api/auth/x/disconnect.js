// Handled by catch-all api/[...path].js -> server/app.ts
/* DISABLED:

async function _disabled(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const { wallet_address } = req.body || {};
  if (!wallet_address) return res.status(400).json({ ok: false, error: 'wallet_address required' });

  try {
    await sbUpdate('wallet_profiles', {
      x_connected: false,
      x_access_token: null,
      x_refresh_token: null,
      updated_at: new Date().toISOString(),
    }, `wallet_address=eq.${wallet_address}`);
    return res.status(200).json({ ok: true });
  } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
}
*/
