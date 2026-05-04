import { useWriteContract, usePublicClient } from 'wagmi';
import { CHAINLINK_GAS_CAPS } from '../abis/index.js';
import { getBumpedFees } from '../utils/gas-fees.js';
export function useChainlinkWrite() {
    const inner = useWriteContract();
    const publicClient = usePublicClient();
    const applyGasLimit = (args) => {
        const { chainlinkAction, ...rest } = args;
        const hasExplicitGas = rest.gas !== undefined;
        const gas = hasExplicitGas
            ? rest.gas
            : chainlinkAction
                ? CHAINLINK_GAS_CAPS[chainlinkAction]
                : undefined;
        return gas !== undefined ? { ...rest, gas } : rest;
    };
    const applyGasFees = async (args) => {
        if (args.maxFeePerGas !== undefined || args.gasPrice !== undefined)
            return args;
        if (!publicClient)
            return args;
        try {
            const fees = await getBumpedFees(publicClient);
            return { ...args, ...fees };
        }
        catch {
            // Fall back to wallet default if the RPC hiccups — still better than
            // blocking the user.
            return args;
        }
    };
    return {
        // Sync path skips the fee bump (the resolve would need to be async and
        // wagmi's non-async mutation can't await). Call writeContractAsync if
        // you want the platform-signed tx to carry explicit gas fees, which
        // every Chainlink flow should be using anyway.
        writeContract: (args) => inner.writeContract(applyGasLimit(args)),
        writeContractAsync: async (args) => {
            const withGas = applyGasLimit(args);
            const withFees = await applyGasFees(withGas);
            return inner.writeContractAsync(withFees);
        },
        isPending: inner.isPending,
        isSuccess: inner.isSuccess,
        isError: inner.isError,
        error: inner.error,
        data: inner.data,
        reset: inner.reset,
    };
}
