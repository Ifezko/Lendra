import { useState, useCallback, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

const STORAGE_KEY = 'lendra_pool_waitlist';

function getStoredWaitlist() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch { return {}; }
}

function storeWaitlistEntry(wallet, entry) {
  try {
    const all = getStoredWaitlist();
    all[wallet] = { ...entry, updated_at: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.error('Failed to store waitlist entry:', e);
  }
}

function getWaitlistEntry(wallet) {
  const all = getStoredWaitlist();
  return all[wallet] || null;
}

function getAllWaitlistEntries() {
  const all = getStoredWaitlist();
  return Object.values(all).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export function usePoolWaitlist() {
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58() || '';
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!wallet) {
      setEntry(null);
      setLoading(false);
      return;
    }
    const existing = getWaitlistEntry(wallet);
    setEntry(existing);
    setLoading(false);
  }, [wallet]);

  const joinWaitlist = useCallback((data) => {
    if (!wallet) return null;

    const newEntry = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      wallet_address: wallet,
      simulated_loan_amount: data.amount || 0,
      borrow_asset: data.borrowAsset || 'USDC',
      bond_amount: data.bondAmount || 0,
      bond_percentage: 30,
      loan_level: data.loanLevel || 0,
      level_name: data.levelName || '',
      loan_purpose_text: data.purposeText || '',
      loan_purpose_tags: data.purposeTags || [],
      score: data.score || 0,
      max_score: 1000,
      eligible: data.eligible || false,
      telegram_connected: data.telegramConnected || false,
      x_connected: data.xConnected || false,
      x_username: data.xUsername || '',
      notification_channel: 'telegram_x',
      wants_telegram: data.wantsTelegram || false,
      wants_x_updates: true,
      followed_lendra_x: false,
      status: 'waiting',
      created_at: new Date().toISOString(),
      notified_at: null,
    };

    storeWaitlistEntry(wallet, newEntry);
    setEntry(newEntry);
    return newEntry;
  }, [wallet]);

  const updateEntry = useCallback((updates) => {
    if (!wallet || !entry) return;
    const updated = { ...entry, ...updates };
    storeWaitlistEntry(wallet, updated);
    setEntry(updated);
  }, [wallet, entry]);

  const isOnWaitlist = !!entry;

  return {
    entry,
    loading,
    isOnWaitlist,
    joinWaitlist,
    updateEntry,
    getAllEntries: getAllWaitlistEntries,
  };
}
