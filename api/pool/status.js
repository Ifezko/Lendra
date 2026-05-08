// Handled by catch-all api/[...path].js -> server/app.ts
/* DISABLED:

const DEFAULT_POOL = {
  total_deposits_sol: 0,
  total_borrowed_sol: 0,
  available_sol: 0,
  utilization_rate: 0,
  current_apy: 0,
  depositor_count: 0,
  borrower_count: 0,
  avg_score: 0,
  total_revenue_sol: 0,
  launch_status: 'pre_launch',
  waitlist_count: 0,
};

async function _disabled(req, res) {
  if (cors(req, res)) return;
  const redis = getRedis();
  try {
    const cached = await redis.get('pool_status');
    const ps = cached ? (typeof cached === 'string' ? JSON.parse(cached) : cached) : DEFAULT_POOL;
    return res.status(200).json({ ok: true, pool: ps });
  } catch {
    return res.status(200).json({ ok: true, pool: DEFAULT_POOL });
  }
}
*/
