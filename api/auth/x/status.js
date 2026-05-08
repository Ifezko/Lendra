// Handled by catch-all api/[...path].js -> server/app.ts
/* DISABLED:

async function _disabled(req, res) {
  if (cors(req, res)) return;
  const wallet = req.query?.wallet || '';
  if (!wallet) return res.status(400).json({ ok: false, error: 'wallet query required' });

  try {
    const rows = await sbSelect('wallet_profiles', `select=x_connected,x_username,x_profile_image,x_name&wallet_address=eq.${wallet}&limit=1`);
    const p = rows?.[0] || {};
    return res.status(200).json({
      ok: true,
      connected: !!p.x_connected,
      username: p.x_username || '',
      profileImage: p.x_profile_image || '',
      name: p.x_name || '',
    });
  } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
}
*/
