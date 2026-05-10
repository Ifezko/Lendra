import { useState, useCallback, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { insertPartnerEvent, getPartnerEvents, upsertWalletProfile } from '../lib/db';
import { useDevnetMemo } from './useDevnetMemo';

// Encrypt Protocol integration (pre-alpha)
// Uses a real Solana devnet memo transaction to record an immutable
// on-chain proof when the user enables or disables Private Mode.
// The memo is sent via the Memo Program v2 and the tx signature is
// persisted to the DB + localStorage for future verification.

export function usePrivateMode() {
  const [isPrivate, setIsPrivate] = useState(false);
  const [encryptionTx, setEncryptionTx] = useState(null);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [encryptError, setEncryptError] = useState(null);
  const { publicKey } = useWallet();
  const { sendMemo, ready: memoReady } = useDevnetMemo();

  // Load from DB on wallet connect, fallback to localStorage
  useEffect(() => {
    if (!publicKey) return;
    const wallet = publicKey.toBase58();
    (async () => {
      try {
        const events = await getPartnerEvents(wallet, 'encrypt');
        const latest = events.find((e) => e.event_type === 'private_mode_enabled' || e.event_type === 'private_mode_disabled');
        if (latest) {
          setIsPrivate(latest.event_type === 'private_mode_enabled');
          if (latest.metadata?.txSignature) setEncryptionTx(latest.metadata.txSignature);
        } else {
          try {
            setIsPrivate(localStorage.getItem('lendra-private-mode') === 'true');
            setEncryptionTx(localStorage.getItem('lendra-encrypt-tx') || null);
          } catch { /* ignore */ }
        }
      } catch {
        try {
          setIsPrivate(localStorage.getItem('lendra-private-mode') === 'true');
          setEncryptionTx(localStorage.getItem('lendra-encrypt-tx') || null);
        } catch { /* ignore */ }
      }
    })();
  }, [publicKey]);

  const enablePrivateMode = useCallback(async () => {
    if (!publicKey) {
      setEncryptError('Connect your wallet first');
      return false;
    }
    if (!memoReady) {
      setEncryptError('Wallet not ready to sign. Please reconnect.');
      return false;
    }

    setIsEncrypting(true);
    setEncryptError(null);

    try {
      const wallet = publicKey.toBase58();
      const ts = Date.now();
      const memo = `LENDRA_PRIVATE_MODE_ENABLED:${wallet}:${ts}`;

      // Send real devnet memo transaction — wallet will prompt for signature
      const txSignature = await sendMemo(memo);

      setEncryptionTx(txSignature);
      setIsPrivate(true);
      localStorage.setItem('lendra-private-mode', 'true');
      localStorage.setItem('lendra-encrypt-tx', txSignature);

      // Persist to partner_events + wallet_profiles
      insertPartnerEvent({
        wallet_address: wallet,
        partner: 'encrypt',
        event_type: 'private_mode_enabled',
        metadata: { txSignature, memo, timestamp: ts },
      }).catch(() => {});
      upsertWalletProfile(wallet, { encrypt_private_mode: true }).catch(() => {});

      return true;
    } catch (err) {
      console.error('Encrypt private mode failed:', err);
      setEncryptError(err.message || 'Failed to enable private mode');
      return false;
    } finally {
      setIsEncrypting(false);
    }
  }, [publicKey, sendMemo, memoReady]);

  const disablePrivateMode = useCallback(async () => {
    if (!publicKey) {
      setIsPrivate(false);
      localStorage.setItem('lendra-private-mode', 'false');
      return;
    }

    setIsEncrypting(true);
    setEncryptError(null);

    const wallet = publicKey.toBase58();

    try {
      if (memoReady) {
        const ts = Date.now();
        const memo = `LENDRA_PRIVATE_MODE_DISABLED:${wallet}:${ts}`;
        const txSignature = await sendMemo(memo);

        insertPartnerEvent({
          wallet_address: wallet,
          partner: 'encrypt',
          event_type: 'private_mode_disabled',
          metadata: { txSignature, memo, timestamp: ts },
        }).catch(() => {});
      } else {
        // Fallback: persist without on-chain proof if wallet can't sign
        insertPartnerEvent({
          wallet_address: wallet,
          partner: 'encrypt',
          event_type: 'private_mode_disabled',
          metadata: {},
        }).catch(() => {});
      }
    } catch (err) {
      console.warn('Disable memo tx failed, persisting off-chain only:', err.message);
      insertPartnerEvent({
        wallet_address: wallet,
        partner: 'encrypt',
        event_type: 'private_mode_disabled',
        metadata: { error: err.message },
      }).catch(() => {});
    } finally {
      setIsPrivate(false);
      setIsEncrypting(false);
      localStorage.setItem('lendra-private-mode', 'false');
      upsertWalletProfile(wallet, { encrypt_private_mode: false }).catch(() => {});
    }
  }, [publicKey, sendMemo, memoReady]);

  const togglePrivateMode = useCallback(async () => {
    if (isPrivate) {
      await disablePrivateMode();
      return true;
    }
    return enablePrivateMode();
  }, [isPrivate, enablePrivateMode, disablePrivateMode]);

  return {
    isPrivate,
    encryptionTx,
    isEncrypting,
    encryptError,
    enablePrivateMode,
    disablePrivateMode,
    togglePrivateMode,
  };
}
