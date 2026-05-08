// Single Vercel catch-all serverless function.
// All /api/* requests are routed here and dispatched via Fastify's inject().
// This replaces 14+ standalone serverless functions with a single function,
// keeping Vercel well under the 12-function Hobby tier limit.

let _app;

async function getApp() {
  if (_app) return _app;
  // Dynamic import — server/app.ts is compiled by Vercel's build step
  const { buildApp } = await import('../server/app.js');
  _app = await buildApp();
  return _app;
}

export default async function handler(req, res) {
  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-telegram-bot-api-secret-token, x-qn-api-key, x-quicknode-signature');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const app = await getApp();

    // Build the URL path Fastify expects
    const url = req.url || '/api/health';

    // Collect headers (lowercase keys, as Fastify expects)
    const headers = {};
    for (const [key, value] of Object.entries(req.headers)) {
      headers[key.toLowerCase()] = value;
    }

    // Build the body payload
    let payload;
    if (req.body !== undefined && req.body !== null) {
      payload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    // Dispatch through Fastify's inject (in-memory, no TCP)
    const response = await app.inject({
      method: req.method,
      url,
      headers,
      payload,
    });

    // Forward status code
    res.status(response.statusCode);

    // Forward response headers (skip transfer-encoding, connection)
    const skip = new Set(['transfer-encoding', 'connection']);
    for (const [key, value] of Object.entries(response.headers)) {
      if (!skip.has(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    }

    // Handle redirects
    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
      res.setHeader('Location', response.headers.location);
      res.end();
      return;
    }

    // Send body
    res.end(response.body);
  } catch (err) {
    console.error('[catch-all] Error:', err);
    res.status(500).json({ ok: false, error: 'Internal server error', details: err.message });
  }
}
