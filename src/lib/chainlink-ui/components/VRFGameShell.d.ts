import { type ReactNode } from 'react';
export interface VRFGameStatus {
    canBet: boolean;
    reason: string | null;
    isActivated: boolean;
    isConsumer: boolean;
    isOperator: boolean;
    contractAddress: `0x${string}` | undefined;
    bankrollETH: string;
    subNativeETH: string;
    chainId: number;
    betError: Error | null;
    setBetError: (e: Error | null) => void;
    clearBetError: () => void;
    /** Live on-chain bet counts from vrfStatsExt. Polled every 2s. */
    totalBets: number;
    totalResolved: number;
    pendingCount: number;
    /** Count of VRF callbacks whose `_settleBet` reverted and are awaiting
     *  `retrySettlement` by the operator. Non-zero = something went wrong with
     *  domain settlement logic and at least one bet is stuck deferred. */
    totalSettlementFailures: number;
    /** Max ETH payout the bankroll can currently cover (bankroll / 2). */
    maxAffordablePayoutETH: number;
    /**
     * Client-side bankroll precheck. Pass the gross payout in ETH (agent computes
     * however it wants — flat multiple, jackpot calc, sum across multi-bet spins).
     * Call before firing the bet tx to avoid silent HouseTooLow reverts. Example:
     *   const payout = betAmount * 36; // single-number roulette
     *   const check = precheckBet(String(payout));
     *   if (!check.ok) { setBetError(new Error(check.reason)); return; }
     */
    precheckBet: (grossPayoutETH: string) => {
        ok: boolean;
        reason: string;
    };
    /**
     * Optimistic-pending registration. Call this RIGHT AFTER `writeContractAsync`
     * resolves with a tx hash for a bet. Bridges the 0-15s gap between "tx
     * submitted" and "vrfStats poll picks up the new request" so the pending
     * banner / spinner stays continuously visible during the entire flow
     * instead of dropping back to idle in between. Auto-expires after 90s if
     * the on-chain stats never catch up (defensive against RPC drops).
     *
     * Idempotent — safe to call once per bet. The shell reconciles automatically
     * once the chain's pendingCount equals or exceeds the optimistic count.
     */
    markBetSubmitted: () => void;
}
export declare function useVRFGameStatus(): VRFGameStatus;
export interface VRFGameShellProps {
    contractAddress: `0x${string}` | undefined;
    appName?: string;
    defaultBankrollETH?: string;
    defaultSubFundingETH?: string;
    bankrollCoverageHint?: number;
    children: ReactNode;
}
export declare function VRFGameShell(props: VRFGameShellProps): import("react/jsx-runtime").JSX.Element;
