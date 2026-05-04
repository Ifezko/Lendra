import type { Abi } from 'viem';
/**
 * Per-bet entry as returned by useWalletBetHistory. The raw bet tuple is
 * exposed verbatim so the game component can index it however the contract
 * struct is shaped (roulette has a result field; coin flip has a won field;
 * etc). `resolved` is the one flag the hook unwraps because every VRF game
 * needs it to split pending vs resolved.
 */
export interface WalletBetEntry {
    requestId: string;
    txHash: `0x${string}`;
    blockNumber: bigint;
    timestamp: number;
    resolved: boolean;
    /** The bet struct read from the public `betGetter` mapping, as a tuple. */
    rawBet: readonly unknown[];
}
export interface UseWalletBetHistoryOptions {
    contractAddress: `0x${string}` | undefined;
    abi: Abi;
    /** Event name emitted by the contract on bet placement. Must have indexed
     *  `requestId` (uint256) and indexed `player` (address). */
    betPlacedEvent: string;
    /** Public mapping getter that returns the bet struct. Typically "bets". */
    betGetter: string;
    /** Tuple index of the `resolved` bool field in the bet struct. */
    resolvedIndex: number;
    /** How many blocks back to scan on mount. Default 50_000 (~7 days on Sepolia). */
    fromBlockLookback?: bigint;
    /** Polling interval for resolving pending bets. Default 4s. */
    pollIntervalMs?: number;
}
/**
 * Reconstructs the connected wallet's bet history from on-chain events + reads.
 * No localStorage. Survives refresh. Works across devices.
 *
 * - On mount, scans the last `fromBlockLookback` blocks for BetPlaced events
 *   filtered by `player == connected`, then reads each bet's current state
 *   via the public getter.
 * - While any bet is unresolved, polls its state every `pollIntervalMs` until
 *   it resolves.
 * - Auto re-scans logs every 6s so freshly-placed bets land in history without
 *   requiring a page reload.
 *
 * `history` is always sorted NEWEST FIRST (by blockNumber DESC). Do NOT reverse
 * it when looking for the latest resolved/pending bet — use `latestResolved`
 * and `latestPending` which are pre-computed for convenience, or call
 * `.find()` directly on `history` (without reverse). Reversing and then
 * finding returns the OLDEST match, which is usually not what you want.
 */
export interface UseWalletBetHistoryResult {
    history: WalletBetEntry[];
    /** Most-recently-placed bet that is still unresolved. Drives the "waiting for VRF" animation. */
    latestPending: WalletBetEntry | null;
    /** Most-recently-resolved bet. Drives the result display. */
    latestResolved: WalletBetEntry | null;
    pendingCount: number;
    isLoading: boolean;
    refetch: () => void;
    /** Populated when any getLogs chunk failed. Treat the history as possibly
     *  incomplete while this is non-null. UI should surface a "some bets may
     *  be missing, retry" affordance rather than pretending the list is whole. */
    error: Error | null;
    /** True when at least one chunk failed during the most recent scan. Separate
     *  from `error` so UI can distinguish "never errored" from "errored then recovered". */
    historyIncomplete: boolean;
}
export declare function useWalletBetHistory(opts: UseWalletBetHistoryOptions): UseWalletBetHistoryResult;
