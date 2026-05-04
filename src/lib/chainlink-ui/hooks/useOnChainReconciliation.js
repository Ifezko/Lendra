import { useEffect, useRef, useState } from 'react';
/**
 * Reconciles a local "pending" UI state against an on-chain read that eventually
 * flips when the async callback (VRF fulfillment, Functions DON response, Automation
 * performUpkeep) lands on chain.
 *
 * useWatchContractEvent in wagmi only sees events that fire AFTER it mounts, so if
 * the user closes the tab or reloads mid-pending, the UI stays stuck forever despite
 * the on-chain state being resolved. This hook polls the read function (typically a
 * view like `getBet(requestId)` or `lastUpdatedAt`) and calls `onResolved` once the
 * read returns a resolved value.
 *
 * Usage:
 *   useOnChainReconciliation({
 *     enabled: oracleStatus === 'pending',
 *     read: () => publicClient.readContract({ address, abi, functionName: 'lastUpdatedAt' }),
 *     isResolved: (ts) => Number(ts) > pendingSince,
 *     onResolved: () => setOracleStatus('success'),
 *     intervalMs: 5000,
 *     timeoutMs: 180000,
 *     onTimeout: () => setOracleStatus('timeout'),
 *   });
 */
/// 10 minutes. Most Chainlink async callbacks (VRF, Functions, Automation) that
/// haven't resolved in 10 minutes are either stuck on sub funding or lost, at
/// which point continued polling just burns RPC quota.
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
export function useOnChainReconciliation(opts) {
    const { enabled, read, isResolved, onResolved, intervalMs = 5000, timeoutMs = DEFAULT_TIMEOUT_MS, onTimeout, } = opts;
    const [lastValue, setLastValue] = useState(null);
    const startedAt = useRef(null);
    useEffect(() => {
        if (!enabled) {
            startedAt.current = null;
            return;
        }
        if (startedAt.current === null)
            startedAt.current = Date.now();
        let cancelled = false;
        const tick = async () => {
            try {
                const v = await read();
                if (cancelled)
                    return;
                setLastValue(v);
                if (isResolved(v)) {
                    onResolved(v);
                    return;
                }
                if (startedAt.current && Date.now() - startedAt.current > timeoutMs) {
                    onTimeout?.();
                    return;
                }
            }
            catch {
                // swallow transient RPC errors; next tick will retry
            }
            if (!cancelled)
                setTimeout(tick, intervalMs);
        };
        tick();
        return () => { cancelled = true; };
    }, [enabled, read, isResolved, onResolved, intervalMs, timeoutMs, onTimeout]);
    return { lastValue };
}
