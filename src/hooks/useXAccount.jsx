import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '../lib/supabase';
import { API_BASE_URL } from '../config';

export function useXAccount() {
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58() || '';
  const [connected, setConnected] = useState(false);
  const [username, setUsername] = useState(null);
  const [userId, setUserId] = useState(null);
  const [accountAgeDays, setAccountAgeDays] = useState(0);
  const [postsCount, setPostsCount] = useState(0);
  const [verificationScore, setVerificationScore] = useState(0);
  const [connectedAt, setConnectedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState(null);

  // Fetch X status from wallet_profiles
  const fetchStatus = useCallback(async () => {
    if (!wallet) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data } = await supabase
        .from('wallet_profiles')
        .select('x_connected, x_username, x_user_id, x_account_age_days, x_posts_count, x_verification_score, x_connected_at')
        .eq('wallet_address', wallet)
        .maybeSingle();
      if (data) {
        setConnected(data.x_connected || false);
        setUsername(data.x_username || null);
        setUserId(data.x_user_id || null);
        setAccountAgeDays(data.x_account_age_days || 0);
        setPostsCount(data.x_posts_count || 0);
        setVerificationScore(data.x_verification_score || 0);
        setConnectedAt(data.x_connected_at || null);
      }
    } catch (err) {
      console.warn('[useXAccount] fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // Also check server-side status endpoint for fresh data
  const fetchServerStatus = useCallback(async () => {
    if (!wallet) return;
    try {
      const url = API_BASE_URL
        ? `${API_BASE_URL}/api/auth/x/status?wallet_address=${wallet}`
        : `/api/auth/x/status?wallet_address=${wallet}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.ok && (json.connected || json.x_connected)) {
          setConnected(true);
          setUsername(json.username || json.x_username || null);
          setUserId(json.user_id || json.x_user_id || null);
          setAccountAgeDays(json.account_age_days || json.x_account_age_days || 0);
          setPostsCount(json.posts_count || json.x_posts_count || 0);
          setVerificationScore(json.verification_score || json.x_verification_score || 0);
          setConnectedAt(json.connected_at || json.x_connected_at || null);
        }
      }
    } catch (err) {
      console.warn('[useXAccount] server status error:', err.message);
    }
  }, [wallet]);

  useEffect(() => {
    if (wallet) fetchServerStatus();
  }, [wallet, fetchServerStatus]);

  // Start X OAuth — browser redirect
  const startConnect = useCallback(() => {
    if (!wallet) return;
    const url = API_BASE_URL
      ? `${API_BASE_URL}/api/auth/x/start?wallet_address=${wallet}`
      : `/api/auth/x/start?wallet_address=${wallet}`;
    window.location.href = url;
  }, [wallet]);

  // Disconnect X
  const disconnect = useCallback(async () => {
    if (!wallet) return;
    setDisconnecting(true);
    setError(null);
    try {
      const url = API_BASE_URL
        ? `${API_BASE_URL}/api/auth/x/disconnect`
        : '/api/auth/x/disconnect';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: wallet }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'X connection failed. Please try again.');
      }
      setConnected(false);
      setUsername(null);
      setUserId(null);
      setAccountAgeDays(0);
      setPostsCount(0);
      setVerificationScore(0);
      setConnectedAt(null);
    } catch (err) {
      setError(err.message || 'Failed to disconnect X account.');
    } finally {
      setDisconnecting(false);
    }
  }, [wallet]);

  // Score breakdown for UI
  const scoreBreakdown = {
    oauthConnected: connected ? 15 : 0,
    stableUserId: userId ? 15 : 0,
    accountAge: accountAgeDays >= 730 ? 35 : 0,
    activity: postsCount >= 100 ? 35 : 0,
  };

  // Full refresh — calls server status (authoritative) then Supabase cache
  const refresh = useCallback(async () => {
    await fetchServerStatus();
    await fetchStatus();
  }, [fetchServerStatus, fetchStatus]);

  return {
    connected,
    username,
    userId,
    accountAgeDays,
    postsCount,
    verificationScore,
    connectedAt,
    loading,
    disconnecting,
    error,
    scoreBreakdown,
    startConnect,
    disconnect,
    refresh,
    clearError: () => setError(null),
  };
}
