import { useState, useCallback, useRef } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Encrypt Protocol integration (pre-alpha, devnet)
// In production, this would use the Encrypt SDK to create FHE ciphertext accounts.
// For now, we simulate the encryption flow with a real on-chain transaction that
// stores an encrypted data marker, demonstrating the privacy concept.

const ENCRYPT_PROGRAM_ID = 'enc1yptNativeProgram111111111111111111111';
const DEVNET_MARKER = new PublicKey('1nc1nerator11111111111111111111111111111111');

export function usePrivateMode() {
  const [isPrivate, setIsPrivate] = useState(() => {
    try { return localStorage.getItem('lendra-private-mode') === 'true'; } catch { return false; }
  });
  const [encryptionTx, setEncryptionTx] = useState(() => {
    try { return localStorage.getItem('lendra-encrypt-tx') || null; } catch { return null; }
  });
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [encryptError, setEncryptError] = useState(null);
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();

  const confirmWithPolling = useCallback(async (sig, timeout = 60000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const status = await connection.getSignatureStatus(sig);
      if (
        status?.value?.confirmationStatus === 'confirmed' ||
        status?.value?.confirmationStatus === 'finalized'
      ) {
        if (status.value.err) throw new Error('Encryption transaction failed');
        return status;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    throw new Error('Encryption transaction confirmation timeout');
  }, [connection]);

  const enablePrivateMode = useCallback(async () => {
    if (!publicKey || !signTransaction) {
      setEncryptError('Connect your wallet first');
      return false;
    }

    setIsEncrypting(true);
    setEncryptError(null);

    try {
      // Create an on-chain transaction that represents the encryption operation.
      // In production with Encrypt SDK, this would create FHE ciphertext accounts
      // via execute_graph. For the pre-alpha demo, we send a minimal SOL transaction
      // with a memo-like marker to prove the privacy intent on-chain.
      const tx = new Transaction();

      // Minimal transfer to mark the encryption event on-chain
      tx.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: DEVNET_MARKER,
          lamports: 5000, // ~0.000005 SOL, minimal dust
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

      // Persist state
      setEncryptionTx(sig);
      setIsPrivate(true);
      localStorage.setItem('lendra-private-mode', 'true');
      localStorage.setItem('lendra-encrypt-tx', sig);

      return true;
    } catch (err) {
      console.error('Encrypt private mode failed:', err);
      setEncryptError(err.message || 'Failed to enable private mode');
      return false;
    } finally {
      setIsEncrypting(false);
    }
  }, [publicKey, signTransaction, connection, confirmWithPolling]);

  const disablePrivateMode = useCallback(() => {
    setIsPrivate(false);
    localStorage.setItem('lendra-private-mode', 'false');
    // Keep the tx hash for history
  }, []);

  const togglePrivateMode = useCallback(async () => {
    if (isPrivate) {
      disablePrivateMode();
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
