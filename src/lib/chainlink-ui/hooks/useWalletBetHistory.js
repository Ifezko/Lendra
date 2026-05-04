import { useEffect, useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
export function useWalletBetHistory(opts) {
    const { contractAddress, abi, betPlacedEvent, betGetter, resolvedIndex, fromBlockLookback = 50000n, pollIntervalMs = 4000, } = opts;
    const { address } = useAccount();
    const publicClient = usePublicClient();
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [error, setError] = useState(null);
    const [historyIncomplete, setHistoryIncomplete] = useState(false);
    // ── Initial load + refetch on wallet/contract change ──────────────────────
    useEffect(() => {
        if (!publicClient || !contractAddress || !address) {
            setHistory([]);
            return;
        }
        let cancelled = false;
        const load = async () => {
            setIsLoading(true);
            let anyChunkFailed = false;
            let firstChunkErr = null;
            try {
                const latestBlock = await publicClient.getBlockNumber();
                const fromBlock = latestBlock > fromBlockLookback
                    ? latestBlock - fromBlockLookback
                    : 0n;
                const eventFragment = abi.find((i) => i.type === 'event' && i.name === betPlacedEvent);
                if (!eventFragment) {
                    const e = new Error(`Event "${betPlacedEvent}" not found in ABI`);
                    console.warn('[useWalletBetHistory]', e.message);
                    setError(e);
                    return;
                }
                // Some RPCs (publicnode Sepolia) cap getLogs range at ~500 blocks. Chunk
                // the scan to stay under that. We chunk from newest to oldest and stop
                // once we've found a few entries to keep the history load snappy.
                const CHUNK_SIZE = 500n;
                const allLogs = [];
                let cursor = latestBlock;
                while (cursor > fromBlock) {
                    const chunkFrom = cursor > CHUNK_SIZE ? cursor - CHUNK_SIZE : 0n;
                    try {
                        const chunkLogs = await publicClient.getLogs({
                            address: contractAddress,
                            event: eventFragment,
                            args: { player: address },
                            fromBlock: chunkFrom < fromBlock ? fromBlock : chunkFrom,
                            toBlock: cursor,
                        });
                        allLogs.push(...chunkLogs);
                    }
                    catch (chunkErr) {
                        anyChunkFailed = true;
                        if (!firstChunkErr)
                            firstChunkErr = chunkErr;
                        console.warn(`[useWalletBetHistory] chunk ${chunkFrom}-${cursor} failed`, chunkErr);
                    }
                    cursor = chunkFrom - 1n;
                    // Small early-exit — most players have < 50 recent bets
                    if (allLogs.length >= 50)
                        break;
                }
                const logs = allLogs;
                console.log(`[useWalletBetHistory] found ${logs.length} BetPlaced logs for ${address}`);
                const entries = await Promise.all(logs.map(async (log) => {
                    const requestId = log.args?.requestId;
                    if (!requestId)
                        return null;
                    const rawBet = (await publicClient.readContract({
                        address: contractAddress,
                        abi,
                        functionName: betGetter,
                        args: [requestId],
                    }));
                    const resolved = Boolean(rawBet[resolvedIndex]);
                    const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
                    return {
                        requestId: requestId.toString(),
                        txHash: log.transactionHash,
                        blockNumber: log.blockNumber,
                        timestamp: Number(block.timestamp) * 1000,
                        resolved,
                        rawBet,
                    };
                }));
                if (cancelled)
                    return;
                const clean = entries.filter((e) => e !== null);
                clean.sort((a, b) => Number(b.blockNumber - a.blockNumber));
                setHistory(clean);
                setHistoryIncomplete(anyChunkFailed);
                if (anyChunkFailed && firstChunkErr) {
                    setError(firstChunkErr);
                }
                else {
                    setError(null);
                }
            }
            catch (err) {
                console.error('[useWalletBetHistory] load failed', err);
                if (!cancelled)
                    setError(err);
            }
            finally {
                if (!cancelled)
                    setIsLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [publicClient, contractAddress, address, betPlacedEvent, betGetter, resolvedIndex, fromBlockLookback, refreshKey]);
    // The previous version of this hook re-ran the full getLogs scan every 6
    // seconds to auto-pick-up newly placed bets. With the default 50k-block
    // lookback and a 500-block CHUNK_SIZE that meant ~100 getLogs calls every
    // 6s per mounted instance, which saturated public RPCs, starved useBalance
    // (showing a 0 ETH balance to wallets that actually had funds), and spammed
    // CORS errors into the console (QA round 3 BUG-005 / BUG-016).
    //
    // The polling effect below already reconciles unresolved bets as they
    // settle, so the only thing we lose by dropping the re-scan is: brand-new
    // bets placed in this session don't auto-appear in `history` until the
    // caller calls `refetch()`. Callers should invoke `refetch()` right after
    // the place-bet transaction lands; that's already the natural trigger
    // because they were going to refresh UI state anyway.
    // ── Poll unresolved bets until they settle ────────────────────────────────
    useEffect(() => {
        if (!publicClient || !contractAddress)
            return;
        const pending = history.filter((h) => !h.resolved);
        if (pending.length === 0)
            return;
        let cancelled = false;
        const tick = async () => {
            try {
                const updated = await Promise.all(pending.map(async (entry) => {
                    const rawBet = (await publicClient.readContract({
                        address: contractAddress,
                        abi,
                        functionName: betGetter,
                        args: [BigInt(entry.requestId)],
                    }));
                    const resolved = Boolean(rawBet[resolvedIndex]);
                    return { ...entry, rawBet, resolved };
                }));
                if (cancelled)
                    return;
                const changed = updated.some((u, i) => u.resolved !== pending[i].resolved);
                if (changed) {
                    setHistory((prev) => prev.map((h) => {
                        const match = updated.find((u) => u.requestId === h.requestId);
                        return match && match.resolved !== h.resolved ? match : h;
                    }));
                }
            }
            catch {
                // swallow transient RPC errors
            }
            if (!cancelled)
                setTimeout(tick, pollIntervalMs);
        };
        const handle = setTimeout(tick, pollIntervalMs);
        return () => { cancelled = true; clearTimeout(handle); };
    }, [publicClient, contractAddress, abi, betGetter, resolvedIndex, history, pollIntervalMs]);
    const pendingCount = history.filter((h) => !h.resolved).length;
    // history is sorted newest-first by blockNumber, so .find() returns the newest match.
    const latestPending = history.find((h) => !h.resolved) ?? null;
    const latestResolved = history.find((h) => h.resolved) ?? null;
    return {
        history,
        latestPending,
        latestResolved,
        pendingCount,
        isLoading,
        refetch: () => setRefreshKey((k) => k + 1),
        error,
        historyIncomplete,
    };
}
