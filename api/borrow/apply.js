// Handled by catch-all api/[...path].js -> server/app.ts
/* DISABLED:

async function _disabled(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const { wallet_address, amount_sol, duration_days } = req.body || {};
  if (!wallet_address || !amount_sol) {
    return res.status(400).json({ ok: false, error: 'wallet_address and amount_sol required' });
  }

  // Check credit score exists
  try {
    const scores = await sbSelect('credit_scores', `select=total_score&wallet_address=eq.${wallet_address}&order=created_at.desc&limit=1`);
    if (!scores?.length) {
      return res.status(400).json({ ok: false, error: 'Credit score required before applying' });
    }
    const score = scores[0].total_score;
    if (score < 300) {
      return res.status(400).json({ ok: false, error: 'Minimum credit score of 300 required' });
    }

    const application = {
      id: randomUUID(),
      wallet_address,
      amount_sol: Number(amount_sol),
      duration_days: Number(duration_days) || 30,
      credit_score_at_application: score,
      status: 'pending',
    };

    await sbInsert('borrow_applications', application);
    return res.status(200).json({ ok: true, application });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
*/
