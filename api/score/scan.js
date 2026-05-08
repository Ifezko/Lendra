import { cors, getQuicknodeHttpUrl, supabaseConfigured } from '../_lib/shared.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;

  if (req.method === 'GET') {
    const rpcUrl = getQuicknodeHttpUrl();
    return res.status(200).json({
      ok: true,
      service: 'score-scan',
      message: 'Use POST to scan wallet',
      configured: !!rpcUrl && supabaseConfigured,
      rpcAvailable: !!rpcUrl,
      supabaseAvailable: supabaseConfigured,
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // POST: wallet scan is handled CLIENT-SIDE in useCreditScore.jsx.
  // This route exists for future server-side scanning or as a health check.
  // The client makes direct RPC calls via /api/quicknode/rpc/solana and
  // persists results directly to Supabase via the anon key.
  const { wallet_address } = req.body || {};
  if (!wallet_address) {
    return res.status(400).json({ ok: false, error: 'wallet_address required' });
  }

  const rpcUrl = getQuicknodeHttpUrl();
  if (!rpcUrl) {
    return res.status(500).json({
      ok: false,
      stage: 'rpc_config',
      error: 'HTTP Solana RPC endpoint is required for wallet scan. Current env only provides VITE_PUBLIC_QUICKNODE_WSS.',
    });
  }

  return res.status(200).json({
    ok: true,
    message: 'Wallet scan runs client-side via /api/quicknode/rpc/solana. This endpoint confirms configuration.',
    wallet_address,
    rpcConfigured: true,
    supabaseConfigured,
  });
}
