/**
 * Ensures every platform-signed EVM tx carries an explicit maxFeePerGas and
 * maxPriorityFeePerGas. Without this, MetaMask sometimes lands at 1.5-2 gwei
 * on Sepolia which is below the network base fee, leaving txs stuck in the
 * mempool for hours and blocking every subsequent nonce.
 *
 * Bumps viem's estimate by 20% and floors at 3 gwei.
 */
import { parseGwei } from 'viem';
const MIN_FEE = parseGwei('3');
function bump(value, percent) {
    return (value * (100n + percent)) / 100n;
}
// Permissive on the client shape because wagmi's usePublicClient() narrows
// to chain-specific types and a strict `PublicClient` signature trips the
// union. Every flavor of public client exposes estimateFeesPerGas().
export async function getBumpedFees(publicClient) {
    const fees = await publicClient.estimateFeesPerGas();
    const maxFeePerGas = bump(fees.maxFeePerGas ?? 0n, 20n);
    const maxPriorityFeePerGas = bump(fees.maxPriorityFeePerGas ?? 0n, 20n);
    return {
        maxFeePerGas: maxFeePerGas < MIN_FEE ? MIN_FEE : maxFeePerGas,
        maxPriorityFeePerGas: maxPriorityFeePerGas < MIN_FEE ? MIN_FEE : maxPriorityFeePerGas,
    };
}
