import { cors, getQuicknodeHttpUrl } from '../../_lib/shared.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true, service: 'quicknode-rpc-solana', message: 'Use POST with JSON-RPC body' });
  }

  const rpcUrl = getQuicknodeHttpUrl();
  if (!rpcUrl) {
    console.error('[quicknode-rpc] No HTTP Solana RPC endpoint available');
    return res.status(500).json({
      ok: false,
      stage: 'rpc_config',
      error: 'HTTP Solana RPC endpoint is required for wallet scan. Current env only provides VITE_PUBLIC_QUICKNODE_WSS.',
      hint: 'Set QUICKNODE_HTTP_URL or ensure VITE_PUBLIC_QUICKNODE_WSS starts with wss://',
    });
  }

  try {
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const upstream = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => '');
      console.error('[quicknode-rpc] Upstream failed:', upstream.status, errText);
      return res.status(502).json({
        ok: false,
        stage: 'rpc_fetch',
        error: `Solana RPC request failed (${upstream.status})`,
      });
    }

    const data = await upstream.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('[quicknode-rpc] Error:', err.message);
    return res.status(500).json({
      ok: false,
      stage: 'rpc_fetch',
      error: 'Solana RPC request failed',
      details: err.message,
    });
  }
}
