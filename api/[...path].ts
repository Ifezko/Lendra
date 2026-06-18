// Single Vercel catch-all serverless function (TypeScript).
//
// All /api/* requests route here (see vercel.json rewrite
//   { "source": "/api/(.*)", "destination": "/api/[...path]" })
// and are dispatched into the Fastify app via app.inject().
//
// We import the Fastify app from ../server/app.js. The ".js" specifier is the
// standard TypeScript-ESM convention: it resolves to server/app.ts under both
// Vercel's TypeScript build and esbuild bundling, and at runtime loads the
// compiled server/app.js. The previous version imported "../server/app"
// extensionlessly and relied on a server/app.js stub that re-exported
// "./app.ts"; in this ESM project ("type":"module") Node cannot load a .ts
// module at runtime, so cold start crashed with ERR_MODULE_NOT_FOUND.

import { buildApp } from '../server/app.js';

let _app: any;

async function getApp() {
  if (_app) return _app;
  _app = await buildApp();
  return _app;
}

export default async function handler(req: any, res: any) {
  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, x-telegram-bot-api-secret-token, x-qn-api-key, x-quicknode-signature'
  );
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const app = await getApp();

    // Build the URL path Fastify expects
    const url = req.url || '/api/health';

    // Collect headers (lowercase keys, as Fastify expects)
    const headers: Record<string, any> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      headers[key.toLowerCase()] = value;
    }

    // Build the body payload
    let payload: string | undefined;
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
        res.setHeader(key, value as any);
      }
    }

    // Handle redirects
    if (
      response.statusCode >= 300 &&
      response.statusCode < 400 &&
      response.headers.location
    ) {
      res.setHeader('Location', response.headers.location as string);
      res.end();
      return;
    }

    // Send body
    res.end(response.body);
  } catch (err: any) {
    console.error('[catch-all] Error:', err);
    res
      .status(500)
      .json({ ok: false, error: 'Internal server error', details: err?.message });
  }
}