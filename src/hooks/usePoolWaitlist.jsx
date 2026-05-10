import { useState, useCallback, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '../lib/supabase';

const TABLE = 'pool_launch_waitlist';

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
    (async () => {
      try {
        const { data } = await supabase
          .from(TABLE)
          .select('*')
          .eq('wallet_address', wallet)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        setEntry(data || null);
      } catch {
        setEntry(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [wallet]);

  const joinWaitlist = useCallback(async (data) => {
    if (!wallet) return null;

    const row = {
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
      eligible: data.eligible || false,
      telegram_connected: data.telegramConnected || false,
      x_connected: data.xConnected || false,
      x_username: data.xUsername || '',
      notification_channel: data.notifyVia || 'x',
      wants_telegram: data.wantsTelegram || false,
      status: 'waiting',
    };

    const { data: inserted, error } = await supabase
      .from(TABLE)
      .insert(row)
      .select()
      .single();

    if (error) {
      console.warn('[usePoolWaitlist] insert error:', error.message);
      return null;
    }
    if (inserted) setEntry(inserted);
    return inserted;
  }, [wallet]);

  const updateEntry = useCallback(async (updates) => {
    if (!wallet || !entry) return;
    try {
      const { data } = await supabase
        .from(TABLE)
        .update(updates)
        .eq('id', entry.id)
        .select()
        .single();
      if (data) setEntry(data);
    } catch (err) {
      console.warn('[updateEntry] error:', err.message);
    }
  }, [wallet, entry]);

  const getAllEntries = useCallback(async () => {
    try {
      const { data } = await supabase
        .from(TABLE)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      return data || [];
    } catch {
      return [];
    }
  }, []);

  const isOnWaitlist = !!entry;

  return {
    entry,
    loading,
    isOnWaitlist,
    joinWaitlist,
    updateEntry,
    getAllEntries,
  };
}
