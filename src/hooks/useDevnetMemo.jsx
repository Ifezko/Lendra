import { useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Transaction, TransactionInstruction, PublicKey } from '@solana/web3.js';
import { DEVNET_RPC } from '../config';

// Solana Memo Program v2
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

/**
 * Raw JSON-RPC helper that calls our devnet proxy via fetch().
 * Using fetch() directly instead of @solana/web3.js Connection avoids
 * CORS / proxy-routing issues in eitherway preview and Vercel production.
 */
async function rpcCall(method, params = []) {
  const res = await fetch(DEVNET_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Devnet RPC ${method} failed (${res.status}): ${text}`);
  }
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || `RPC error: ${method}`);
  return json.result;
}

/**
 * Shared hook for sending memo transactions on Solana devnet.
 * Both Private Mode (Encrypt) and Cross-Chain Credit (Ika) use this
 * to record an immutable on-chain proof-of-action via the Memo Program.
 *
 * The wallet signs the tx client-side, then the raw bytes are sent to
 * our devnet RPC proxy via plain fetch() — works in both eitherway
 * preview and Vercel production.
 */
export function useDevnetMemo() {
  const { publicKey, signTransaction, connected } = useWallet();

  const sendMemo = useCallback(async (memoText) => {
    if (!publicKey || !signTransaction || !connected) {
      throw new Error('Wallet not connected');
    }

    // 1. Get recent blockhash via our proxy
    const blockhashResult = await rpcCall('getLatestBlockhash', [{ commitment: 'confirmed' }]);
    const blockhash = blockhashResult?.value?.blockhash;
    if (!blockhash) throw new Error('Failed to get recent blockhash from devnet');

    // 2. Build memo instruction
    const memoIx = new TransactionInstruction({
      keys: [{ pubkey: publicKey, isSigner: true, isWritable: false }],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(memoText, 'utf-8'),
    });

    const tx = new Transaction().add(memoIx);
    tx.recentBlockhash = blockhash;
    tx.feePayer = publicKey;

    // 3. Wallet signs client-side (Phantom / Solflare prompt)
    const signed = await signTransaction(tx);
    const rawTx = signed.serialize();

    // 4. Send via devnet proxy using sendTransaction JSON-RPC
    const b64 = Buffer.from(rawTx).toString('base64');
    const signature = await rpcCall('sendTransaction', [
      b64,
      { encoding: 'base64', skipPreflight: false, preflightCommitment: 'confirmed' },
    ]);

    if (!signature || typeof signature !== 'string') {
      throw new Error('sendTransaction did not return a signature');
    }

    // 5. Confirm via HTTP polling (no WebSocket needed)
    const start = Date.now();
    const timeout = 60_000;
    while (Date.now() - start < timeout) {
      const statusResult = await rpcCall('getSignatureStatuses', [[signature]]);
      const val = statusResult?.value?.[0];
      if (val?.confirmationStatus === 'confirmed' || val?.confirmationStatus === 'finalized') {
        if (val.err) throw new Error(`Transaction failed on-chain: ${JSON.stringify(val.err)}`);
        return signature;
      }
      await new Promise((r) => setTimeout(r, 2500));
    }
    // If timed out but tx was sent, return signature so user can check explorer
    console.warn('Devnet memo tx confirmation timed out, returning signature:', signature);
    return signature;
  }, [publicKey, signTransaction, connected]);

  return { sendMemo, ready: connected && !!publicKey && !!signTransaction };
}
