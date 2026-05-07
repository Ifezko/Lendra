import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '../lib/supabase';
import { upsertWalletProfile } from '../lib/db';

const PREFS_KEY = 'lendra_alert_prefs';

const DEFAULT_PREFS = {
  telegramEnabled: false,
  scoreDropAlerts: true,
  loanAlerts: true,
  bondAlerts: true,
  repaymentReminders: true,
  levelAlerts: true,
};

// Map DB rows → UI notification shape.
// The DB schema uses: channel, event_type, status, recipient, message, metadata.
// Extra UI fields (title, read, cta_label, cta_route) live in metadata JSONB.
function dbRowToNotification(row) {
  const meta = row.metadata || {};
  return {
    ...row,
    title: meta.title || row.event_type,
    read: meta.read === true,
    cta_label: meta.cta_label || null,
    cta_route: meta.cta_route || null,
    delivery_channel: row.channel,
    delivery_status: row.status,
  };
}

export function useNotifications() {
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58() || '';
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [telegram, setTelegram] = useState({ connected: false, chatId: null });

  // Load prefs from localStorage (lightweight, no DB table needed)
  useEffect(() => {
    if (!wallet) return;
    try {
      const stored = JSON.parse(localStorage.getItem(`${PREFS_KEY}_${wallet}`) || 'null');
      if (stored) setPrefs(stored);
    } catch { /* ignore */ }
  }, [wallet]);

  // Load telegram state from wallet_profiles
  useEffect(() => {
    if (!wallet) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('wallet_profiles')
          .select('telegram_connected, telegram_chat_id, telegram_username')
          .eq('wallet_address', wallet)
          .maybeSingle();
        if (data) {
          setTelegram({
            connected: data.telegram_connected || false,
            chatId: data.telegram_chat_id || null,
            username: data.telegram_username || null,
          });
        }
      } catch { /* ignore */ }
    })();
  }, [wallet]);

  const savePrefs = useCallback((newPrefs) => {
    setPrefs(newPrefs);
    if (wallet) {
      localStorage.setItem(`${PREFS_KEY}_${wallet}`, JSON.stringify(newPrefs));
      // Sync alert flags to wallet_profiles
      upsertWalletProfile(wallet, {
        telegram_alerts_enabled: newPrefs.telegramEnabled,
        telegram_score_alerts_enabled: newPrefs.scoreDropAlerts,
        telegram_loan_alerts_enabled: newPrefs.loanAlerts,
        telegram_bond_alerts_enabled: newPrefs.bondAlerts,
        telegram_repayment_alerts_enabled: newPrefs.repaymentReminders,
        telegram_level_alerts_enabled: newPrefs.levelAlerts,
      }).catch(() => {});
    }
  }, [wallet]);

  const saveTelegram = useCallback((tgState) => {
    setTelegram(tgState);
    if (wallet) {
      upsertWalletProfile(wallet, {
        telegram_connected: tgState.connected || false,
        telegram_chat_id: tgState.chatId || null,
        telegram_username: tgState.username || null,
        telegram_connected_at: tgState.connected ? new Date().toISOString() : null,
      }).catch(() => {});
    }
  }, [wallet]);

  // Fetch notifications from Supabase
  const fetchNotifications = useCallback(async () => {
    if (!wallet) { setNotifications([]); setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notification_events')
        .select('*')
        .eq('wallet_address', wallet)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setNotifications((data || []).map(dbRowToNotification));
    } catch (err) {
      console.warn('[notifications] fetch error:', err.message || err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (id) => {
    setNotifications((prev) =>
      prev.map((n) => n.id === id ? { ...n, read: true } : n)
    );
    try {
      // Read flag stored in metadata JSONB
      const { data: row } = await supabase
        .from('notification_events')
        .select('metadata')
        .eq('id', id)
        .maybeSingle();
      const newMeta = { ...(row?.metadata || {}), read: true };
      const { error } = await supabase
        .from('notification_events')
        .update({ metadata: newMeta, status: 'read' })
        .eq('id', id);
      if (error) console.warn('[markAsRead] update error:', error.message);
    } catch (err) {
      console.warn('[markAsRead] error:', err.message);
    }
  }, []);

  const addNotification = useCallback(async (event) => {
    const meta = {
      ...(event.metadata || {}),
      title: event.title || event.event_type,
      read: false,
      cta_label: event.cta_label || null,
      cta_route: event.cta_route || null,
    };

    const row = {
      wallet_address: wallet,
      channel: event.delivery_channel || 'in_app',
      event_type: event.event_type,
      status: 'delivered',
      message: event.message || '',
      metadata: meta,
    };

    // Optimistic UI update
    const tempId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
    const optimistic = dbRowToNotification({ ...row, id: tempId, created_at: new Date().toISOString() });
    setNotifications((prev) => [optimistic, ...prev]);

    try {
      const { data, error } = await supabase
        .from('notification_events')
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      // Replace optimistic entry with real DB row
      if (data) {
        setNotifications((prev) =>
          prev.map((n) => n.id === tempId ? dbRowToNotification(data) : n)
        );
      }
      return data ? dbRowToNotification(data) : optimistic;
    } catch (err) {
      console.warn('[addNotification] insert error:', err.message);
      return optimistic;
    }
  }, [wallet]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const scoreAlerts = notifications.filter((n) =>
    ['trust_score_dropped', 'score_increased', 'level_unlocked'].includes(n.event_type)
  ).length;
  const loanAlerts = notifications.filter((n) =>
    ['loan_due_soon', 'loan_overdue', 'repayment_confirmed', 'bond_deposited', 'bond_returned', 'bond_liquidated'].includes(n.event_type)
  ).length;

  return {
    notifications,
    loading,
    unreadCount,
    scoreAlerts,
    loanAlerts,
    prefs,
    savePrefs,
    telegram,
    saveTelegram,
    markAsRead,
    addNotification,
    refresh: fetchNotifications,
  };
}
