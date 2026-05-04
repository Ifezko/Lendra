const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.eitherway.ai';
export const PROXY_API = (url) => `${API_BASE_URL}/api/proxy-api?url=${encodeURIComponent(url)}`;
export const PROXY_CDN = (url) => `${API_BASE_URL}/api/proxy-cdn?url=${encodeURIComponent(url)}`;
export const QUICKNODE_RPC = `${API_BASE_URL}/api/quicknode/rpc/solana`;
export const SOLANA_RPC = `${API_BASE_URL}/api/solana/rpc/mainnet`;
export { API_BASE_URL };
