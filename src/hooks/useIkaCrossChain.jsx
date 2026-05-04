import { useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction, SystemProgram, PublicKey } from '@solana/web3.js';

// Ika dWallet cross-chain identity integration (pre-alpha, devnet)
// In production, this would use the Ika SDK to create dWallet keys via 2PC-MPC DKG,
// then approve_message CPI to bind the external wallet identity on-chain.
// For the pre-alpha demo, we simulate the cross-chain identity binding flow.

const IKA_MARKER = new PublicKey('1nc1nerator11111111111111111111111111111111');

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
  const [connectedChains, setConnectedChains] = useState(() => {
    try {
      const stored = localStorage.getItem('lendra-ika-chains');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [bindingTx, setBindingTx] = useState(() => {
    try { return localStorage.getItem('lendra-ika-tx') || null; } catch { return null; }
  });
  const [isBinding, setIsBinding] = useState(false);
  const [bindError, setBindError] = useState(null);
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();

  const totalCrossChainBoost = connectedChains.reduce((sum, c) => sum + c.totalBoost, 0);

  const confirmWithPolling = useCallback(async (sig, timeout = 60000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const status = await connection.getSignatureStatus(sig);
      if (
        status?.value?.confirmationStatus === 'confirmed' ||
        status?.value?.confirmationStatus === 'finalized'
      ) {
        if (status.value.err) throw new Error('Identity binding transaction failed');
        return status;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    throw new Error('Transaction confirmation timeout');
  }, [connection]);

  const connectExternalWallet = useCallback(async (externalAddress, chain = 'ETH') => {
    if (!publicKey || !signTransaction) {
      setBindError('Connect your Solana wallet first');
      return null;
    }

    // Check if already connected
    if (connectedChains.find((c) => c.address === externalAddress && c.chain === chain)) {
      setBindError('This wallet is already connected');
      return null;
    }

    setIsBinding(true);
    setBindError(null);

    try {
      // In production, this would:
      // 1. Call Ika DKG to create a dWallet controlling a key pair
      // 2. The user signs a message with their external wallet proving ownership
      // 3. approve_message CPI binds the external identity to the Solana wallet
      // For pre-alpha demo, we create an on-chain transaction that records the binding.

      const tx = new Transaction();
      tx.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: IKA_MARKER,
          lamports: 5000,
        })
      );

      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signed = await signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
      });

      await confirmWithPolling(sig);

      // Analyze external wallet
      const analysis = analyzeExternalWallet(externalAddress, chain);

      const updated = [...connectedChains, analysis];
      setConnectedChains(updated);
      setBindingTx(sig);
      localStorage.setItem('lendra-ika-chains', JSON.stringify(updated));
      localStorage.setItem('lendra-ika-tx', sig);

      return { ...analysis, txSignature: sig };
    } catch (err) {
      console.error('Ika cross-chain binding failed:', err);
      setBindError(err.message || 'Failed to bind external wallet');
      return null;
    } finally {
      setIsBinding(false);
    }
  }, [publicKey, signTransaction, connection, connectedChains, confirmWithPolling]);

  const disconnectChain = useCallback((address, chain) => {
    const updated = connectedChains.filter(
      (c) => !(c.address === address && c.chain === chain)
    );
    setConnectedChains(updated);
    localStorage.setItem('lendra-ika-chains', JSON.stringify(updated));
  }, [connectedChains]);

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
