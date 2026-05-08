import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '../lib/supabase';
import { API_BASE_URL } from '../config';

export function useTelegram() {
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58() || '';
  const [connected, setConnected] = useState(false);
  const [username, setUsername] = useState(null);
  const [connectedAt, setConnectedAt] = useState(null);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState(null);
  const [testResult, setTestResult] = useState(null);

  // Preferences from DB
  const [prefs, setPrefs] = useState({
    all: true,
    score: true,
    loan: true,
    bond: true,
    repayment: true,
    level: true,
    pool_launch: true,
  });
  const [prefsLoading, setPrefsLoading] = useState(false);

  // Load telegram state from wallet_profiles
  const fetchStatus = useCallback(async () => {
    if (!wallet) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data } = await supabase
        .from('wallet_profiles')
        .select('telegram_connected, telegram_username, telegram_alerts_enabled, telegram_connected_at')
        .eq('wallet_address', wallet)
        .maybeSingle();
      if (data) {
        setConnected(data.telegram_connected || false);
        setUsername(data.telegram_username || null);
        setConnectedAt(data.telegram_connected_at || null);
        setAlertsEnabled(data.telegram_alerts_enabled || false);
      }
    } catch (err) {
      console.warn('[useTelegram] fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // Load notification preferences from server
  const fetchPrefs = useCallback(async () => {
    if (!wallet) return;
    setPrefsLoading(true);
    try {
      const url = API_BASE_URL
        ? `${API_BASE_URL}/api/notifications/preferences?wallet_address=${wallet}`
        : `/api/notifications/preferences?wallet_address=${wallet}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.ok && json.preferences) {
          setPrefs({
            all: json.preferences.telegram_alerts_enabled ?? true,
            score: json.preferences.telegram_score_alerts_enabled ?? true,
            loan: json.preferences.telegram_loan_alerts_enabled ?? true,
            bond: json.preferences.telegram_bond_alerts_enabled ?? true,
            repayment: json.preferences.telegram_repayment_alerts_enabled ?? true,
            level: json.preferences.telegram_level_alerts_enabled ?? true,
            pool_launch: json.preferences.telegram_pool_launch_alerts_enabled ?? true,
          });
        }
      }
    } catch (err) {
      console.warn('[useTelegram] prefs fetch error:', err.message);
    } finally {
      setPrefsLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    if (connected) fetchPrefs();
  }, [connected, fetchPrefs]);

  // Start Telegram link flow
  const startLink = useCallback(async () => {
    if (!wallet) return;
    setLinking(true);
    setError(null);
    try {
      const url = API_BASE_URL
        ? `${API_BASE_URL}/api/telegram/link/start`
        : '/api/telegram/link/start';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: wallet }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Telegram setup failed. Please try again.');
      }
      if (json.telegramUrl) {
        window.open(json.telegramUrl, '_blank', 'noopener,noreferrer');
      }
      return json;
    } catch (err) {
      setError(err.message || 'Telegram setup failed. Please try again.');
      return null;
    } finally {
      setLinking(false);
    }
  }, [wallet]);

  // Send test alert
  const sendTest = useCallback(async () => {
    if (!wallet) return;
    setTesting(true);
    setTestResult(null);
    try {
      const url = API_BASE_URL
        ? `${API_BASE_URL}/api/telegram/test`
        : '/api/telegram/test';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: wallet }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Test alert failed. Check Telegram connection.');
      }
      setTestResult('success');
      return json;
    } catch (err) {
      setTestResult('error');
      setError(err.message || 'Test alert failed. Check Telegram connection.');
      return null;
    } finally {
      setTesting(false);
    }
  }, [wallet]);

  // Save notification preferences
  const savePrefs = useCallback(async (newPrefs) => {
    setPrefs(newPrefs);
    if (!wallet) return;
    try {
      const url = API_BASE_URL
        ? `${API_BASE_URL}/api/notifications/preferences`
        : '/api/notifications/preferences';
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: wallet,
          telegram_alerts_enabled: newPrefs.all,
          telegram_score_alerts_enabled: newPrefs.score,
          telegram_loan_alerts_enabled: newPrefs.loan,
          telegram_bond_alerts_enabled: newPrefs.bond,
          telegram_repayment_alerts_enabled: newPrefs.repayment,
          telegram_level_alerts_enabled: newPrefs.level,
          telegram_pool_launch_alerts_enabled: newPrefs.pool_launch,
        }),
      });
    } catch (err) {
      console.warn('[useTelegram] savePrefs error:', err.message);
    }
  }, [wallet]);

  // Poll for connection status after link flow
  const pollConnection = useCallback(async (maxAttempts = 15, intervalMs = 3000) => {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, intervalMs));
      try {
        const { data } = await supabase
          .from('wallet_profiles')
          .select('telegram_connected, telegram_username, telegram_connected_at')
          .eq('wallet_address', wallet)
          .maybeSingle();
        if (data?.telegram_connected) {
          setConnected(true);
          setUsername(data.telegram_username || null);
          setConnectedAt(data.telegram_connected_at || null);
          setAlertsEnabled(true);
          return true;
        }
      } catch { /* continue polling */ }
    }
    return false;
  }, [wallet]);

  return {
    connected,
    username,
    connectedAt,
    alertsEnabled,
    loading,
    linking,
    testing,
    error,
    testResult,
    prefs,
    prefsLoading,
    startLink,
    sendTest,
    savePrefs,
    refresh: fetchStatus,
    pollConnection,
    clearError: () => setError(null),
    clearTestResult: () => setTestResult(null),
  };
}
