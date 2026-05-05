import { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fallback to localStorage when Supabase table not available
const STORAGE_KEY = 'lendra_notifications';
const PREFS_KEY = 'lendra_alert_prefs';
const TELEGRAM_KEY = 'lendra_telegram';

function getStoredNotifications(wallet) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return all[wallet] || [];
  } catch { return []; }
}

function storeNotification(wallet, notification) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (!all[wallet]) all[wallet] = [];
    all[wallet].unshift(notification);
    if (all[wallet].length > 100) all[wallet] = all[wallet].slice(0, 100);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (e) { console.error('Failed to store notification:', e); }
}

function markReadInStorage(wallet, id) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (all[wallet]) {
      all[wallet] = all[wallet].map((n) => n.id === id ? { ...n, read: true } : n);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    }
  } catch (e) { console.error('Failed to mark read:', e); }
}

const DEFAULT_PREFS = {
  telegramEnabled: false,
  scoreDropAlerts: true,
  loanAlerts: true,
  bondAlerts: true,
  repaymentReminders: true,
  levelAlerts: true,
};

export function useNotifications() {
  const { publicKey, connected } = useWallet();
  const wallet = publicKey?.toBase58() || '';
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [telegram, setTelegram] = useState({ connected: false, chatId: null });
  const supabaseAvailable = useRef(false);

  // Load preferences from localStorage
  useEffect(() => {
    if (!wallet) return;
    try {
      const stored = JSON.parse(localStorage.getItem(`${PREFS_KEY}_${wallet}`) || 'null');
      if (stored) setPrefs(stored);
      const tg = JSON.parse(localStorage.getItem(`${TELEGRAM_KEY}_${wallet}`) || 'null');
      if (tg) setTelegram(tg);
    } catch { /* ignore */ }
  }, [wallet]);

  const savePrefs = useCallback((newPrefs) => {
    setPrefs(newPrefs);
    if (wallet) {
      localStorage.setItem(`${PREFS_KEY}_${wallet}`, JSON.stringify(newPrefs));
    }
  }, [wallet]);

  const saveTelegram = useCallback((tgState) => {
    setTelegram(tgState);
    if (wallet) {
      localStorage.setItem(`${TELEGRAM_KEY}_${wallet}`, JSON.stringify(tgState));
    }
  }, [wallet]);

  // Try fetching from Supabase, fall back to localStorage
  const fetchNotifications = useCallback(async () => {
    if (!wallet) { setNotifications([]); setLoading(false); return; }
    setLoading(true);

    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/notification_events?wallet_address=eq.${wallet}&order=created_at.desc&limit=50`,
          {
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
          }
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            supabaseAvailable.current = true;
            setNotifications(data);
            setLoading(false);
            return;
          }
        }
      } catch { /* fall through */ }
    }

    // Fallback to localStorage
    supabaseAvailable.current = false;
    const local = getStoredNotifications(wallet);
    setNotifications(local);
    setLoading(false);
  }, [wallet]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (id) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    if (supabaseAvailable.current && SUPABASE_URL && SUPABASE_ANON_KEY) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/notification_events?id=eq.${id}`, {
          method: 'PATCH',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({ read: true }),
        });
      } catch { /* ignore */ }
    } else {
      markReadInStorage(wallet, id);
    }
  }, [wallet]);

  const addNotification = useCallback(async (event) => {
    const notification = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      wallet_address: wallet,
      event_type: event.event_type,
      title: event.title,
      message: event.message,
      delivery_channel: event.delivery_channel || 'in_app',
      delivery_status: event.delivery_status || 'delivered',
      read: false,
      cta_label: event.cta_label || null,
      cta_route: event.cta_route || null,
      metadata: event.metadata || {},
      created_at: new Date().toISOString(),
    };

    setNotifications((prev) => [notification, ...prev]);

    if (supabaseAvailable.current && SUPABASE_URL && SUPABASE_ANON_KEY) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/notification_events`, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify(notification),
        });
      } catch { /* ignore */ }
    } else {
      storeNotification(wallet, notification);
    }

    return notification;
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
