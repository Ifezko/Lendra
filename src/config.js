// In eitherway preview, VITE_API_BASE_URL points to the eitherway backend.
// In Vercel production, it is empty → all /api/* calls hit Vercel serverless functions.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// External API proxy: in eitherway use the proxy; in production call directly (CORS-friendly)
export const PROXY_API = (url) => {
  if (API_BASE_URL) return `${API_BASE_URL}/api/proxy-api?url=${encodeURIComponent(url)}`;
  return url; // Direct call — CoinGecko etc. allow browser CORS
};
export const PROXY_CDN = (url) => {
  if (API_BASE_URL) return `${API_BASE_URL}/api/proxy-cdn?url=${encodeURIComponent(url)}`;
  return url;
};

// Solana RPC: in eitherway, use eitherway proxy; in production, use our own Vercel proxy
export const QUICKNODE_RPC = API_BASE_URL
  ? `${API_BASE_URL}/api/quicknode/rpc/solana`
  : '/api/quicknode/rpc/solana';

export const SOLANA_RPC = API_BASE_URL
  ? `${API_BASE_URL}/api/solana/rpc/mainnet`
  : '/api/quicknode/rpc/solana';

export { API_BASE_URL };
