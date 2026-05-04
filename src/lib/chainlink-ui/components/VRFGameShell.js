import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAccount, useReadContract, useBalance } from 'wagmi';
import { formatEther } from 'viem';
import { EITHERWAY_VRF_ABI, VRF_COORDINATOR_V2_5_ABI, INSUFFICIENT_BALANCE_SELECTOR, } from '../abis/index.js';
import { useChainlinkConfig } from '../hooks/useChainlinkConfig.js';
import { VRFOperatorPanel } from './VRFOperatorPanel.js';
const VRFGameContext = createContext(null);
export function useVRFGameStatus() {
    const ctx = useContext(VRFGameContext);
    if (!ctx)
        throw new Error('useVRFGameStatus must be used inside <VRFGameShell>');
    return ctx;
}
export function VRFGameShell(props) {
    const { contractAddress, appName, defaultBankrollETH = '0.005', defaultSubFundingETH = '0.25', bankrollCoverageHint = 5, children, } = props;
    const { address: connected, isConnected } = useAccount();
    const { vrf, chainId } = useChainlinkConfig();
    const [betError, setBetError] = useState(null);
    const subId = vrf?.subscriptionId ? BigInt(vrf.subscriptionId) : null;
    const coordinator = vrf?.coordinator;
    const { data: houseOperator } = useReadContract({
        address: contractAddress,
        abi: EITHERWAY_VRF_ABI,
        functionName: 'houseOperator',
        query: { enabled: !!contractAddress },
    });
    const { data: claimed, isLoading: claimedLoading } = useReadContract({
        address: contractAddress,
        abi: EITHERWAY_VRF_ABI,
        functionName: 'ownershipClaimed',
        // Refetch on focus so an F5 / tab-switch picks up post-activation state
        // promptly. Default wagmi keeps the read alive but doesn't auto-refresh
        // unless we ask, which is what made the banner feel sticky after a refresh.
        query: { enabled: !!contractAddress, refetchOnWindowFocus: true, refetchInterval: 8000 },
    });
    const { data: contractBalance } = useBalance({
        address: contractAddress,
        query: { enabled: !!contractAddress, refetchInterval: 10000 },
    });
    const { data: subData } = useReadContract({
        address: coordinator,
        abi: VRF_COORDINATOR_V2_5_ABI,
        functionName: 'getSubscription',
        args: subId ? [subId] : undefined,
        query: { enabled: !!subId && !!coordinator, refetchInterval: 10000 },
    });
    // Live on-chain bet counters. Polled every 2s so the pending banner appears
    // promptly after a bet tx mines (typical ~5-15s click→mined); 5s felt laggy.
    // useWatchContractEvent misses events, so polling is the source of truth.
    // Uses the extended view so we can also surface deferred-settlement count
    // and reserve the pull-withdrawal balance against the bankroll precheck.
    const { data: vrfStatsData } = useReadContract({
        address: contractAddress,
        abi: EITHERWAY_VRF_ABI,
        functionName: 'vrfStatsExt',
        query: { enabled: !!contractAddress, refetchInterval: 2000 },
    });
    const isActivated = !!claimed;
    const isOperator = isActivated && houseOperator?.toLowerCase() === connected?.toLowerCase();
    const consumers = subData ? (subData[4] ?? []) : [];
    const isConsumer = !!contractAddress && consumers.some((c) => c.toLowerCase() === contractAddress.toLowerCase());
    const subNativeETH = subData ? formatEther(subData[1]) : '0';
    // vrfStatsExt layout:
    //   [0] subscriptionId, [1] keyHash, [2] callbackGasLimit,
    //   [3] totalRequests, [4] totalFulfilled, [5] totalSettlementFailures,
    //   [6] contractBalance, [7] reservedForWithdrawals
    const totalBets = vrfStatsData ? Number(vrfStatsData[3]) : 0;
    const totalResolved = vrfStatsData ? Number(vrfStatsData[4]) : 0;
    const totalSettlementFailures = vrfStatsData ? Number(vrfStatsData[5]) : 0;
    const reservedWei = vrfStatsData ? vrfStatsData[7] : 0n;
    const balanceWei = vrfStatsData
        ? vrfStatsData[6]
        : contractBalance
            ? contractBalance.value
            : 0n;
    // Effective bankroll = balance minus wei earmarked for pending pull-claims
    // (operator withdrawals + unclaimed winner payouts). New bets should only
    // reserve against this, not the full balance, otherwise precheckBet can
    // approve a bet the settlement can't actually cover.
    const effectiveBankrollWei = balanceWei > reservedWei ? balanceWei - reservedWei : 0n;
    const bankrollETH = formatEther(effectiveBankrollWei);
    const pendingCount = Math.max(0, totalBets - totalResolved);
    // Base contract requires bankroll >= 2 * payout, so max affordable payout is bankroll / 2.
    const maxAffordablePayoutETH = Math.max(0, Number(bankrollETH) / 2);
    const precheckBet = (grossPayoutETH) => {
        const payout = parseFloat(grossPayoutETH);
        if (!isFinite(payout) || payout <= 0) {
            return { ok: false, reason: 'Invalid payout amount' };
        }
        if (payout > maxAffordablePayoutETH) {
            return {
                ok: false,
                reason: `Bankroll too low to cover a ${payout.toFixed(4)} ETH payout. Max affordable payout right now: ${maxAffordablePayoutETH.toFixed(4)} ETH. Operator needs to top up the bankroll.`,
            };
        }
        return { ok: true, reason: '' };
    };
    // Are the on-chain reads complete enough to make a verdict on activation /
    // consumer / sub state? Without this, the gate fires "Game not activated"
    // banners during the initial load window because `claimed === undefined`
    // looks the same as `claimed === false`. After F5 the wagmi cache may take
    // a moment to populate and we don't want the user staring at a misleading
    // banner during that window.
    const statusKnown = contractAddress !== undefined &&
        !claimedLoading &&
        claimed !== undefined &&
        (subData !== undefined || !subId);
    // Optimistic pending — bumped by markBetSubmitted() right after the bet tx
    // is broadcast, cleared once the on-chain pendingCount catches up or after
    // a generous timeout. Bridges the 0-15s window between "tx submitted" and
    // "polled stats reflect the new request" so the UI never falsely returns
    // to an idle state mid-flow.
    const [optimisticPending, setOptimisticPending] = useState([]);
    // Drop expired optimistic entries (defensive — if the on-chain stat never
    // catches up because of an RPC issue, we still let the UI recover).
    useEffect(() => {
        if (optimisticPending.length === 0)
            return;
        const t = setTimeout(() => {
            const now = Date.now();
            setOptimisticPending((cur) => cur.filter((e) => e.expiresAt > now));
        }, 5000);
        return () => clearTimeout(t);
    }, [optimisticPending]);
    // Reconcile against on-chain: if the chain pendingCount is at least as high
    // as our optimistic count, drop our entries — the chain has caught up.
    useEffect(() => {
        if (optimisticPending.length > 0 && pendingCount >= optimisticPending.length) {
            setOptimisticPending([]);
        }
    }, [pendingCount, optimisticPending.length]);
    const markBetSubmitted = useCallback(() => {
        setOptimisticPending((cur) => [
            ...cur,
            { id: Date.now() + Math.random(), expiresAt: Date.now() + 90000 },
        ]);
    }, []);
    const effectivePendingCount = Math.max(pendingCount, optimisticPending.length);
    const status = useMemo(() => {
        let canBet = true;
        let reason = null;
        if (!contractAddress) {
            canBet = false;
            reason = 'Preparing your contract… this takes a few seconds after the app boots.';
        }
        else if (!isConnected) {
            canBet = false;
            reason = 'Connect your wallet to play.';
        }
        else if (!vrf) {
            canBet = false;
            reason = 'Chainlink VRF not configured. Set it up in Services Hub.';
        }
        else if (!statusKnown) {
            // On-chain reads still in flight. Suppress the gate banner — we don't
            // know the activation/consumer/sub state yet and a "not activated"
            // banner during loading is worse than no banner at all.
            canBet = false;
            reason = null;
        }
        else if (!isActivated) {
            canBet = false;
            reason = 'Game not activated yet. The operator needs to click Activate below.';
        }
        else if (!isConsumer) {
            canBet = false;
            reason = 'Contract not registered as VRF consumer. Operator must complete activation.';
        }
        else if (Number(subNativeETH) <= 0) {
            canBet = false;
            reason = 'VRF subscription empty. Operator needs to top up.';
        }
        return {
            canBet,
            reason,
            isActivated,
            isConsumer,
            isOperator,
            contractAddress,
            bankrollETH,
            subNativeETH,
            chainId,
            betError,
            setBetError,
            clearBetError: () => setBetError(null),
            totalBets,
            totalResolved,
            pendingCount: effectivePendingCount,
            totalSettlementFailures,
            maxAffordablePayoutETH,
            precheckBet,
            markBetSubmitted,
        };
    }, [
        contractAddress, isConnected, vrf, statusKnown, isActivated, isConsumer, isOperator,
        bankrollETH, subNativeETH, chainId, betError,
        totalBets, totalResolved, effectivePendingCount, totalSettlementFailures,
        maxAffordablePayoutETH, markBetSubmitted,
    ]);
    const isInsufficientBalance = betError && isInsufficientBalanceError(betError);
    return (_jsxs(VRFGameContext.Provider, { value: status, children: [_jsx("style", { children: `@keyframes ewclSpin { to { transform: rotate(360deg); } }` }), _jsx(VRFOperatorPanel, { contractAddress: contractAddress, appName: appName, defaultBankrollETH: defaultBankrollETH, defaultSubFundingETH: defaultSubFundingETH, bankrollCoverageHint: bankrollCoverageHint }), !status.canBet && status.reason && contractAddress && isConnected && (_jsxs("div", { style: gateStyle, children: [_jsx("div", { style: { fontSize: 14, fontWeight: 600, color: '#fb923c', marginBottom: 6 }, children: isActivated ? 'Game paused' : 'Activation required' }), _jsx("div", { style: { fontSize: 12, opacity: 0.7, color: '#fff', lineHeight: 1.5 }, children: status.reason })] })), isInsufficientBalance && (_jsxs("div", { style: insufficientStyle, children: [_jsx("div", { style: { fontSize: 13, fontWeight: 600, color: '#fb923c', marginBottom: 4 }, children: "VRF subscription out of funds" }), _jsx("div", { style: { fontSize: 12, opacity: 0.7, color: '#fff', lineHeight: 1.5 }, children: "The Chainlink VRF subscription has insufficient balance. The operator needs to top it up before bets can be placed." })] })), betError && !isInsufficientBalance && (_jsx("div", { style: errorStyle, children: _jsx("div", { style: { fontSize: 12, color: '#ef4444', lineHeight: 1.5 }, children: betError.message?.slice(0, 300) ?? 'Transaction failed. Check your balance and try again.' }) })), effectivePendingCount > 0 && (_jsxs("div", { style: pendingStyle, children: [_jsx("span", { style: pendingSpinnerStyle }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 13, fontWeight: 600, color: '#60a5fa', marginBottom: 2 }, children: "Waiting for Chainlink VRF" }), _jsxs("div", { style: { fontSize: 12, opacity: 0.7, color: '#fff', lineHeight: 1.5 }, children: [effectivePendingCount, " bet", effectivePendingCount === 1 ? '' : 's', " awaiting verifiable randomness. Chainlink takes 30-60 seconds to fulfill. Safe to wait or close this tab."] })] })] })), children] }));
}
function isInsufficientBalanceError(error) {
    if (!error)
        return false;
    try {
        const blob = JSON.stringify(error).toLowerCase();
        return blob.includes(INSUFFICIENT_BALANCE_SELECTOR.toLowerCase());
    }
    catch {
        return false;
    }
}
const gateStyle = {
    padding: 16,
    background: 'rgba(251, 146, 60, 0.08)',
    border: '1px solid rgba(251, 146, 60, 0.25)',
    borderRadius: 12,
    margin: '12px 0',
    fontFamily: "'Montserrat', -apple-system, sans-serif",
};
const insufficientStyle = {
    ...gateStyle,
    background: 'rgba(251, 146, 60, 0.1)',
    border: '1px solid rgba(251, 146, 60, 0.3)',
};
const errorStyle = {
    padding: 12,
    background: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: 10,
    margin: '12px 0',
    fontFamily: "'Montserrat', -apple-system, sans-serif",
};
const pendingStyle = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    background: 'rgba(96, 165, 250, 0.08)',
    border: '1px solid rgba(96, 165, 250, 0.25)',
    borderRadius: 12,
    margin: '12px 0',
    fontFamily: "'Montserrat', -apple-system, sans-serif",
};
const pendingSpinnerStyle = {
    width: 16,
    height: 16,
    marginTop: 2,
    border: '2px solid rgba(96, 165, 250, 0.3)',
    borderTopColor: '#60a5fa',
    borderRadius: '50%',
    animation: 'ewclSpin 0.8s linear infinite',
    flexShrink: 0,
};
