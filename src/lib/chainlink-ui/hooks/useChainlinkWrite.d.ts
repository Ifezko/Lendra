import { type ChainlinkGasKey } from '../abis/index.js';
/**
 * Wraps wagmi's useWriteContract so every call automatically carries a gas override
 * appropriate for the action. Without this, viem auto-estimate inflates to 30M+ on
 * testnets and wallet RPCs reject with "gas limit too high" before the tx is broadcast.
 *
 * Usage:
 *   const { writeContract } = useChainlinkWrite();
 *   await writeContract({
 *     chainlinkAction: 'vrfAddConsumer',
 *     address: coordinator,
 *     abi: VRF_COORDINATOR_V2_5_ABI,
 *     functionName: 'addConsumer',
 *     args: [subId, contractAddress],
 *   });
 *
 * An explicit `gas` on the call overrides the cap.
 */
type ChainlinkWriteArgs = Record<string, any> & {
    chainlinkAction?: ChainlinkGasKey;
};
export interface ChainlinkWriteReturn {
    writeContract: (args: ChainlinkWriteArgs) => void;
    writeContractAsync: (args: ChainlinkWriteArgs) => Promise<`0x${string}`>;
    isPending: boolean;
    isSuccess: boolean;
    isError: boolean;
    error: Error | null;
    data: `0x${string}` | undefined;
    reset: () => void;
}
export declare function useChainlinkWrite(): ChainlinkWriteReturn;
export {};
