import { useState, useCallback, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { insertLoanEvent } from '../lib/db';
import { supabase } from '../lib/supabase';

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
    // Fetch existing waitlist entry from DB
    (async () => {
      try {
        const { data } = await supabase
          .from('loan_events')
          .select('*')
          .eq('wallet_address', wallet)
          .eq('event_type', 'waitlist_join')
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

    const eventRow = {
      wallet_address: wallet,
      event_type: 'waitlist_join',
      borrow_asset: data.borrowAsset || 'USDC',
      loan_amount: data.amount || 0,
      bond_amount: data.bondAmount || 0,
      bond_percentage: 30,
      loan_level: data.loanLevel || 0,
      level_name: data.levelName || '',
      loan_purpose_text: data.purposeText || '',
      loan_purpose_tags: data.purposeTags || [],
      status: 'waiting',
    };

    const result = await insertLoanEvent(eventRow);
    if (result) setEntry(result);
    return result;
  }, [wallet]);

  const updateEntry = useCallback(async (updates) => {
    if (!wallet || !entry) return;
    try {
      const { data } = await supabase
        .from('loan_events')
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
        .from('loan_events')
        .select('*')
        .eq('event_type', 'waitlist_join')
        .order('created_at', { ascending: false })
        .limit(200);
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
