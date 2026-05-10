import { useState, useCallback, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { insertPartnerEvent, getPartnerEvents, upsertWalletProfile } from '../lib/db';
import { useDevnetMemo } from './useDevnetMemo';

// Ika dWallet cross-chain identity integration (pre-alpha)
// Uses a real Solana devnet memo transaction to record an immutable
// on-chain proof when the user binds an external wallet identity.
// The memo is sent via the Memo Program v2 and the tx signature is
// persisted to the DB + localStorage for future verification.

// Simulated external wallet analysis based on address patterns
function analyzeExternalWallet(address, chain) {
  // Deterministic "analysis" based on address hash for demo consistency
  const hash = address.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const ageDays = 120 + (hash % 800);
  const txVolume = 50 + (hash % 2000);
  const ageBoost = Math.min(30, Math.floor((ageDays / 365) * 30));
  const volumeBoost = Math.min(20, Math.floor((txVolume / 500) * 20));
  return {
    chain,
    address,
    ageDays,
    txVolume,
    ageBoost,
    volumeBoost,
    totalBoost: ageBoost + volumeBoost,
  };
}

export function useIkaCrossChain() {
  const [connectedChains, setConnectedChains] = useState([]);
  const [bindingTx, setBindingTx] = useState(null);
  const [isBinding, setIsBinding] = useState(false);
  const [bindError, setBindError] = useState(null);
  const { publicKey } = useWallet();
  const { sendMemo, ready: memoReady } = useDevnetMemo();

  // Load connected chains from DB on wallet connect
  useEffect(() => {
    if (!publicKey) return;
    const wallet = publicKey.toBase58();
    (async () => {
      try {
        const events = await getPartnerEvents(wallet, 'ika');
        const bindings = events
          .filter((e) => e.event_type === 'cross_chain_bind')
          .map((e) => e.metadata)
          .filter(Boolean);
        if (bindings.length > 0) {
          setConnectedChains(bindings);
          const lastTx = events[0]?.metadata?.txSignature || null;
          if (lastTx) setBindingTx(lastTx);
        }
      } catch {
        // Fall back to localStorage
        try {
          const stored = localStorage.getItem('lendra-ika-chains');
          if (stored) setConnectedChains(JSON.parse(stored));
        } catch { /* ignore */ }
      }
    })();
  }, [publicKey]);

  const totalCrossChainBoost = connectedChains.reduce((sum, c) => sum + (c.totalBoost || 0), 0);

  const connectExternalWallet = useCallback(async (externalAddress, chain = 'ETH') => {
    if (!publicKey) {
      setBindError('Connect your Solana wallet first');
      return null;
    }

    // Check if already connected
    if (connectedChains.find((c) => c.address === externalAddress && c.chain === chain)) {
      setBindError('This wallet is already connected');
      return null;
    }

    // Basic address validation
    if (chain === 'ETH' && !/^0x[a-fA-F0-9]{40}$/.test(externalAddress)) {
      setBindError('Invalid Ethereum address. Must start with 0x followed by 40 hex characters.');
      return null;
    }
    if (chain === 'BTC' && externalAddress.length < 26) {
      setBindError('Invalid Bitcoin address.');
      return null;
    }

    if (!memoReady) {
      setBindError('Wallet not ready to sign. Please reconnect.');
      return null;
    }

    setIsBinding(true);
    setBindError(null);

    try {
      const wallet = publicKey.toBase58();
      const ts = Date.now();
      const memo = `LENDRA_CROSS_CHAIN:${wallet}:${chain.toLowerCase()}:${externalAddress}:${ts}`;

      // Send real devnet memo transaction — wallet will prompt for signature
      const txSignature = await sendMemo(memo);

      // Analyze external wallet for score boost
      const analysis = analyzeExternalWallet(externalAddress, chain);

      const updated = [...connectedChains, analysis];
      setConnectedChains(updated);
      setBindingTx(txSignature);
      localStorage.setItem('lendra-ika-chains', JSON.stringify(updated));
      localStorage.setItem('lendra-ika-tx', txSignature);

      // Persist to partner_events
      insertPartnerEvent({
        wallet_address: wallet,
        partner: 'ika',
        event_type: 'cross_chain_bind',
        metadata: { ...analysis, txSignature, memo, timestamp: ts },
      }).catch(() => {});

      // Update wallet profile with cross-chain boost
      upsertWalletProfile(wallet, {
        ika_connected: true,
        ika_chains_count: updated.length,
      }).catch(() => {});

      return { ...analysis, txSignature };
    } catch (err) {
      console.error('Ika cross-chain binding failed:', err);
      setBindError(err.message || 'Failed to bind external wallet');
      return null;
    } finally {
      setIsBinding(false);
    }
  }, [publicKey, connectedChains, sendMemo, memoReady]);

  const disconnectChain = useCallback((address, chain) => {
    const updated = connectedChains.filter(
      (c) => !(c.address === address && c.chain === chain)
    );
    setConnectedChains(updated);
    localStorage.setItem('lendra-ika-chains', JSON.stringify(updated));

    if (publicKey) {
      const wallet = publicKey.toBase58();
      insertPartnerEvent({
        wallet_address: wallet,
        partner: 'ika',
        event_type: 'cross_chain_unbind',
        metadata: { address, chain },
      }).catch(() => {});
    }
  }, [connectedChains, publicKey]);

  return {
    connectedChains,
    totalCrossChainBoost,
    bindingTx,
    isBinding,
    bindError,
    connectExternalWallet,
    disconnectChain,
  };
}
