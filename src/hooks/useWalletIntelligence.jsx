import { useState, useCallback, useRef } from 'react';
import { API_BASE_URL } from '../config';

// Wallet Intelligence (PRD 5.6): loads the full-report dataset (90-day exact
// fees, stablecoin flow, protocol activity by category) from the dedicated
// /api/wallet/intelligence endpoint. Display-only — never a score input.
export function useWalletIntelligence() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [cached, setCached] = useState(false);
  const inFlightRef = useRef(null);

  const load = useCallback(async (walletAddress, { refresh = false } = {}) => {
    if (!walletAddress) return;
    // Collapse duplicate/concurrent requests for the same wallet (avoids RPC 429s).
    if (inFlightRef.current === walletAddress && !refresh) return;
    inFlightRef.current = walletAddress;
    setLoading(true);
    setError(null);

    try {
      const url = API_BASE_URL
        ? `${API_BASE_URL}/api/wallet/intelligence`
        : '/api/wallet/intelligence';

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: walletAddress, refresh }),
      });

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `Wallet Intelligence failed (${res.status})`);
      }

      const json = await res.json();
      if (!json.ok || !json.data) throw new Error(json.error || 'No data returned');

      setData(json.data);
      setCached(!!json.cached);
    } catch (err) {
      console.error('Wallet Intelligence load error:', err);
      setError(err.message || 'Failed to load Wallet Intelligence');
    } finally {
      setLoading(false);
      inFlightRef.current = null;
    }
  }, []);

  return { loading, error, data, cached, load };
}
