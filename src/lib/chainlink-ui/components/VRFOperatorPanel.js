import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState, useEffect } from 'react';
import { useAccount, useReadContract, useBalance } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { EITHERWAY_VRF_ABI, VRF_COORDINATOR_V2_5_ABI, } from '../abis/index.js';
import { useChainlinkConfig } from '../hooks/useChainlinkConfig.js';
import { useChainlinkWrite } from '../hooks/useChainlinkWrite.js';
/**
 * All-in-one VRF setup + operator control panel.
 *
 * Renders:
 * - Nothing (null) when the connected wallet is a regular player on an activated contract.
 * - Loading skeleton while reads are in flight.
 * - "Wrong wallet" instruction when sub owner doesn't match connected wallet pre-activation.
 * - Activate flow for the sub owner: claimOwnership + addConsumer + fund bankroll + fund sub.
 * - Ongoing dashboard for the operator: balances, top-ups, withdraw.
 */
export function VRFOperatorPanel(props) {
    const { contractAddress, defaultBankrollETH = '0.005', defaultSubFundingETH = '0.25', bankrollCoverageHint = 5, appName, } = props;
    const { address: connected, isConnected } = useAccount();
    const { vrf, chainId } = useChainlinkConfig();
    const { writeContractAsync, isPending } = useChainlinkWrite();
    const [isActivating, setIsActivating] = useState(false);
    // Collapsed-by-default for operators who've already activated. The pre-activation
    // flow always renders the full panel because the user needs the Activate button
    // front-and-center. Post-activation it lives as a small floating chip you tap
    // to expand. Expansion is sticky per-session via state (no localStorage).
    const [dashboardOpen, setDashboardOpen] = useState(false);
    // ── Contract + sub reads ───────────────────────────────────────────────────
    const { data: houseOperator, refetch: refetchOperator } = useReadContract({
        address: contractAddress,
        abi: EITHERWAY_VRF_ABI,
        functionName: 'houseOperator',
    });
    const { data: claimed, refetch: refetchClaimed } = useReadContract({
        address: contractAddress,
        abi: EITHERWAY_VRF_ABI,
        functionName: 'ownershipClaimed',
    });
    const { data: contractBalance, refetch: refetchBankroll } = useBalance({
        address: contractAddress,
        query: { refetchInterval: 10000 },
    });
    // Amount of contract balance already earmarked for pending pull-withdrawals
    // (operator past-withdraws + unclaimed winners). Needed so we show the
    // operator the EFFECTIVE bankroll rather than the full on-chain balance.
    const { data: reservedWei, refetch: refetchReserved } = useReadContract({
        address: contractAddress,
        abi: EITHERWAY_VRF_ABI,
        functionName: 'reservedForWithdrawals',
        query: { enabled: !!contractAddress, refetchInterval: 10000 },
    });
    // Operator's own pending-withdrawal balance. Populated by prior withdrawHouse
    // calls that have not yet been claim()ed. Surfaces as a "claim X ETH" CTA.
    const { data: operatorClaimable, refetch: refetchClaimable } = useReadContract({
        address: contractAddress,
        abi: EITHERWAY_VRF_ABI,
        functionName: 'pendingWithdrawals',
        args: connected ? [connected] : undefined,
        query: { enabled: !!contractAddress && !!connected, refetchInterval: 10000 },
    });
    const subId = vrf?.subscriptionId ? BigInt(vrf.subscriptionId) : null;
    const coordinator = vrf?.coordinator;
    const { data: subData, refetch: refetchSub } = useReadContract({
        address: coordinator,
        abi: VRF_COORDINATOR_V2_5_ABI,
        functionName: 'getSubscription',
        args: subId ? [subId] : undefined,
        query: { enabled: !!subId && !!coordinator, refetchInterval: 10000 },
    });
    // Auto-expand the dashboard when bankroll runs critically low. Top-level hook
    // (before any conditional return) — Rules of Hooks compliance.
    const bankrollCriticalLow = contractBalance
        ? contractBalance.value < parseEther('0.002')
        : false;
    useEffect(() => {
        if (bankrollCriticalLow)
            setDashboardOpen(true);
    }, [bankrollCriticalLow]);
    // ── State machine ──────────────────────────────────────────────────────────
    const state = useMemo(() => {
        if (!isConnected)
            return 'disconnected';
        // No VRF sub configured in Services Hub → render nothing. The host app should
        // show its own "Connect Chainlink VRF" CTA. We don't want to double up on that.
        if (!vrf)
            return 'hidden';
        // Contract not deployed yet (no VITE_X_ADDRESS) → nothing to operate on.
        if (!contractAddress)
            return 'hidden';
        // While activate() is mid-flight, keep the activate UI visible. Without this,
        // as soon as step 1 (claimOwnership) refetches, claimed=true and the state
        // flips to 'dashboard' — leaving steps 2-4 running silently with no feedback.
        if (isActivating)
            return 'activate';
        if (!subData || claimed === undefined || houseOperator === undefined)
            return 'loading';
        const subOwner = subData[3];
        const isSubOwner = subOwner?.toLowerCase() === connected?.toLowerCase();
        const isHouseOperator = houseOperator?.toLowerCase() === connected?.toLowerCase();
        if (!claimed) {
            return isSubOwner ? 'activate' : 'wrong-sub-owner';
        }
        // Activated — only show dashboard to the current operator. Players see nothing.
        return isHouseOperator ? 'dashboard' : 'hidden';
    }, [isConnected, vrf, subData, claimed, houseOperator, connected, contractAddress, isActivating]);
    // ── Actions ────────────────────────────────────────────────────────────────
    const activate = async () => {
        if (!subId || !coordinator)
            return;
        setIsActivating(true);
        try {
            // Step 1: claim ownership locally
            await writeContractAsync({
                chainlinkAction: 'claimOwnership',
                address: contractAddress,
                abi: EITHERWAY_VRF_ABI,
                functionName: 'claimOwnership',
            });
            // Step 2: register contract as consumer on the sub
            await writeContractAsync({
                chainlinkAction: 'vrfAddConsumer',
                address: coordinator,
                abi: VRF_COORDINATOR_V2_5_ABI,
                functionName: 'addConsumer',
                args: [subId, contractAddress],
            });
            // Step 3: fund the contract bankroll
            if (parseFloat(defaultBankrollETH) > 0) {
                const eth = globalThis.ethereum;
                if (eth && connected) {
                    await eth.request({
                        method: 'eth_sendTransaction',
                        params: [{
                                from: connected,
                                to: contractAddress,
                                value: '0x' + parseEther(defaultBankrollETH).toString(16),
                                gas: '0x14820',
                            }],
                    });
                }
            }
            // Step 4: fund the VRF subscription with ETH
            if (parseFloat(defaultSubFundingETH) > 0) {
                await writeContractAsync({
                    chainlinkAction: 'vrfFundNative',
                    address: coordinator,
                    abi: VRF_COORDINATOR_V2_5_ABI,
                    functionName: 'fundSubscriptionWithNative',
                    args: [subId],
                    value: parseEther(defaultSubFundingETH),
                });
            }
            await Promise.all([refetchClaimed(), refetchOperator(), refetchBankroll(), refetchSub()]);
        }
        finally {
            setIsActivating(false);
        }
    };
    const topUpBankroll = async (ethAmount) => {
        const eth = globalThis.ethereum;
        if (!eth || !connected)
            return;
        await eth.request({
            method: 'eth_sendTransaction',
            params: [{
                    from: connected,
                    to: contractAddress,
                    value: '0x' + parseEther(ethAmount).toString(16),
                    gas: '0x14820',
                }],
        });
        await refetchBankroll();
    };
    const topUpSub = async (ethAmount) => {
        if (!subId || !coordinator)
            return;
        await writeContractAsync({
            chainlinkAction: 'vrfFundNative',
            address: coordinator,
            abi: VRF_COORDINATOR_V2_5_ABI,
            functionName: 'fundSubscriptionWithNative',
            args: [subId],
            value: parseEther(ethAmount),
        });
        await refetchSub();
    };
    const withdraw = async (ethAmount) => {
        // Pull-payment model: withdrawHouse just credits pendingWithdrawals[operator],
        // then a second tx calls claim() to actually pull the ETH. Chain both here so
        // the operator sees it as a single conceptual "withdraw N ETH" action.
        await writeContractAsync({
            chainlinkAction: 'withdrawHouse',
            address: contractAddress,
            abi: EITHERWAY_VRF_ABI,
            functionName: 'withdrawHouse',
            args: [parseEther(ethAmount)],
        });
        await writeContractAsync({
            chainlinkAction: 'claim',
            address: contractAddress,
            abi: EITHERWAY_VRF_ABI,
            functionName: 'claim',
        });
        await Promise.all([refetchBankroll(), refetchReserved(), refetchClaimable()]);
    };
    /**
     * Pull any already-credited balance (from a prior withdrawHouse that wasn't
     * claimed, or from winnings if the operator wallet is also a player). The
     * two-step withdraw flow above calls this automatically, so this button is
     * only visible when there's a dangling credit — e.g. a prior claim() failed,
     * or the user reloaded between the two txs.
     */
    const claimPending = async () => {
        await writeContractAsync({
            chainlinkAction: 'claim',
            address: contractAddress,
            abi: EITHERWAY_VRF_ABI,
            functionName: 'claim',
        });
        await Promise.all([refetchBankroll(), refetchReserved(), refetchClaimable()]);
    };
    // ── Render ─────────────────────────────────────────────────────────────────
    if (state === 'hidden' || state === 'disconnected')
        return null;
    if (state === 'loading') {
        return (_jsx("div", { style: panelStyle, children: _jsx("div", { style: { opacity: 0.5, fontSize: 13 }, children: "Loading VRF operator panel\u2026" }) }));
    }
    if (state === 'wrong-sub-owner') {
        const subOwner = subData?.[3];
        return (_jsxs("div", { style: panelStyle, children: [_jsx("h3", { style: titleStyle, children: "Activation required" }), _jsxs("p", { style: descStyle, children: ["This ", appName || 'app', " must be activated by the wallet that owns your Chainlink VRF subscription. Disconnect your current wallet and reconnect with", ' ', _jsx("code", { style: codeStyle, children: subOwner }), " (the wallet you used in Services Hub \u2192 Chainlink \u2192 VRF to create or import the subscription)."] }), subOwner && (_jsx("button", { style: buttonStyle, onClick: () => navigator.clipboard?.writeText(subOwner), children: "Copy sub owner address" }))] }));
    }
    if (state === 'activate') {
        return (_jsxs("div", { style: panelStyle, children: [_jsxs("h3", { style: titleStyle, children: ["Activate ", appName || 'app'] }), _jsxs("p", { style: descStyle, children: ["Claim ownership, register this app as a VRF consumer, fund the bankroll (", defaultBankrollETH, " ETH), and top up your subscription with ", defaultSubFundingETH, " ETH. Your wallet will sign 4 transactions in sequence."] }), _jsx("button", { style: primaryButtonStyle, onClick: activate, disabled: isPending || isActivating, children: isActivating ? 'Activating… (check your wallet for signatures)' : `Activate (${defaultBankrollETH} + ${defaultSubFundingETH} ETH)` })] }));
    }
    // state === 'dashboard' — floating chip by default, tap to expand full panel.
    // Effective bankroll = on-chain balance minus what's already earmarked for
    // pull-withdrawals. Operator should see how much is ACTUALLY available for
    // future bet payouts, not the gross balance which includes winners' credits.
    const balanceWei = contractBalance?.value ?? 0n;
    const reserved = reservedWei ?? 0n;
    const effectiveWei = balanceWei > reserved ? balanceWei - reserved : 0n;
    const bankrollEth = formatEther(effectiveWei);
    const subNativeEth = subData ? formatEther(subData[1]) : '0';
    const subLinkBal = subData ? formatEther(subData[0]) : '0';
    const bankrollLow = effectiveWei < parseEther('0.002');
    const claimableWei = operatorClaimable ?? 0n;
    const claimableEth = formatEther(claimableWei);
    const hasDanglingClaim = claimableWei > 0n;
    if (!dashboardOpen) {
        return (_jsx("div", { style: chipContainerStyle, children: _jsxs("button", { style: chipStyle, onClick: () => setDashboardOpen(true), children: [_jsx("span", { style: bankrollLow ? chipDotWarnStyle : chipDotOkStyle }), _jsx("span", { style: { opacity: 0.6, marginRight: 6 }, children: "Operator" }), _jsxs("span", { style: { fontWeight: 600 }, children: [Number(bankrollEth).toFixed(4), " ETH"] }), _jsx("span", { style: { opacity: 0.4, marginLeft: 8 }, children: "\u25BE" })] }) }));
    }
    return (_jsxs("div", { style: panelStyle, children: [_jsxs("div", { style: panelHeaderStyle, children: [_jsxs("h3", { style: titleStyle, children: ["Operator dashboard", appName ? ` — ${appName}` : ''] }), _jsx("button", { style: collapseButtonStyle, onClick: () => setDashboardOpen(false), "aria-label": "Collapse", children: "\u25B4" })] }), _jsxs("div", { style: rowStyle, children: [_jsx(Stat, { label: "Bankroll", value: `${Number(bankrollEth).toFixed(4)} ETH`, warn: bankrollLow }), _jsx(Stat, { label: "Sub ETH", value: `${Number(subNativeEth).toFixed(4)}` }), _jsx(Stat, { label: "Sub LINK", value: `${Number(subLinkBal).toFixed(2)}` })] }), bankrollLow && (_jsxs("div", { style: warnStyle, children: ["Bankroll covers less than ", bankrollCoverageHint, " typical payouts. Top up to keep the game running."] })), hasDanglingClaim && (_jsxs("div", { style: claimStyle, children: [_jsxs("div", { style: { flex: 1 }, children: [_jsxs("div", { style: { fontSize: 12, color: TEXT, fontWeight: 600 }, children: [Number(claimableEth).toFixed(4), " ETH ready to pull"] }), _jsx("div", { style: { fontSize: 11, color: MUTED, marginTop: 2 }, children: "A prior withdraw or winnings credit is waiting in the pull ledger." })] }), _jsx("button", { style: smallButtonStyle, onClick: claimPending, disabled: isPending, children: "Claim" })] })), _jsxs("div", { style: actionsStyle, children: [_jsx(ActionRow, { label: "Top up bankroll", defaultVal: defaultBankrollETH, onSubmit: topUpBankroll }), _jsx(ActionRow, { label: "Top up VRF sub (ETH)", defaultVal: defaultSubFundingETH, onSubmit: topUpSub }), _jsx(ActionRow, { label: "Withdraw bankroll", defaultVal: "0.001", onSubmit: withdraw })] })] }));
}
// ── Themed helpers (all colors come from CSS vars with dark fallbacks) ──
function Stat({ label, value, warn }) {
    return (_jsxs("div", { style: { flex: 1, padding: 12, background: SURF, borderRadius: 10, border: `1px solid ${BORDER}` }, children: [_jsx("div", { style: { fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.7, fontWeight: 500 }, children: label }), _jsx("div", { style: { fontSize: 16, fontWeight: 600, color: warn ? WARN : TEXT, marginTop: 4 }, children: value })] }));
}
function ActionRow({ label, defaultVal, onSubmit }) {
    const inputId = `ewcl-${label.replace(/\s+/g, '-').toLowerCase()}`;
    return (_jsxs("div", { style: { display: 'flex', gap: 8, alignItems: 'center', margin: '8px 0' }, children: [_jsx("label", { htmlFor: inputId, style: { fontSize: 12, color: MUTED, flex: 1 }, children: label }), _jsx("input", { id: inputId, defaultValue: defaultVal, style: { width: 88, padding: '6px 10px', background: SURF, border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT, fontSize: 12, fontFamily: 'inherit' } }), _jsx("button", { style: smallButtonStyle, onClick: (e) => {
                    const input = e.currentTarget.previousElementSibling;
                    const v = input?.value?.trim();
                    if (v)
                        onSubmit(v);
                }, children: "Go" })] }));
}
// ── Styles (inline, themeable via CSS variables) ──
// Every color is `var(--eitherway-X, <fallback>)`. Set the vars in your :root CSS to
// theme the panel. No external CSS files, no build step, no library setup required.
//
// Vars the panel reads:
//   --eitherway-bg        panel/chip background (has fallback dark glass)
//   --eitherway-surface   input/button background inside panel
//   --eitherway-text      main text color
//   --eitherway-muted     secondary/label text color
//   --eitherway-border    panel borders, input borders
//   --eitherway-accent    primary button (Activate, Go) background
//   --eitherway-accent-fg primary button foreground
//   --eitherway-ok        OK status dot
//   --eitherway-warn      low-balance/warning color
//   --eitherway-font      font-family
//   --eitherway-radius    border-radius (panel + buttons)
const BG = 'var(--eitherway-bg, rgba(13, 13, 13, 0.9))';
const SURF = 'var(--eitherway-surface, rgba(255, 255, 255, 0.04))';
const TEXT = 'var(--eitherway-text, #ffffff)';
const MUTED = 'var(--eitherway-muted, rgba(255, 255, 255, 0.6))';
const BORDER = 'var(--eitherway-border, rgba(255, 255, 255, 0.12))';
const ACCENT = 'var(--eitherway-accent, #0D00FF)';
const ACCFG = 'var(--eitherway-accent-fg, #ffffff)';
const OK = 'var(--eitherway-ok, #4ade80)';
const WARN = 'var(--eitherway-warn, #fb923c)';
const FONT = "var(--eitherway-font, 'Montserrat', -apple-system, 'Segoe UI', Roboto, sans-serif)";
const RADIUS = 'var(--eitherway-radius, 12px)';
const panelStyle = {
    padding: 16,
    background: BG,
    backdropFilter: 'blur(12px)',
    border: `1px solid ${BORDER}`,
    borderRadius: RADIUS,
    color: TEXT,
    fontFamily: FONT,
    boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
};
const panelHeaderStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4,
};
const chipContainerStyle = {
    position: 'fixed',
    bottom: 16,
    right: 16,
    zIndex: 1000,
    fontFamily: FONT,
};
const chipStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '8px 14px',
    fontSize: 12,
    cursor: 'pointer',
    background: BG,
    color: TEXT,
    border: `1px solid ${BORDER}`,
    borderRadius: 999,
    backdropFilter: 'blur(12px)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
};
const chipDotOkStyle = {
    display: 'inline-block',
    width: 6, height: 6, marginRight: 8,
    borderRadius: '50%',
    background: OK,
    boxShadow: `0 0 6px ${OK}`,
};
const chipDotWarnStyle = {
    ...chipDotOkStyle,
    background: WARN,
    boxShadow: `0 0 6px ${WARN}`,
};
const collapseButtonStyle = {
    background: 'transparent',
    border: 'none',
    color: MUTED,
    cursor: 'pointer',
    fontSize: 14,
    padding: '4px 8px',
    lineHeight: 1,
};
const titleStyle = { margin: 0, fontSize: 14, fontWeight: 600, color: TEXT, letterSpacing: 0.1 };
const descStyle = { margin: '8px 0 12px', fontSize: 12, color: MUTED, lineHeight: 1.55 };
const codeStyle = { fontFamily: 'ui-monospace, monospace', fontSize: 11, background: SURF, padding: '1px 6px', borderRadius: 4, color: TEXT };
const buttonStyle = {
    padding: '8px 14px', fontSize: 12, cursor: 'pointer',
    background: SURF, color: TEXT,
    border: `1px solid ${BORDER}`, borderRadius: 8,
};
const primaryButtonStyle = {
    ...buttonStyle,
    background: ACCENT, borderColor: ACCENT, color: ACCFG, fontWeight: 600,
    padding: '10px 16px',
};
const smallButtonStyle = { ...buttonStyle, padding: '4px 12px', fontSize: 11 };
const rowStyle = { display: 'flex', gap: 8, margin: '12px 0' };
const warnStyle = {
    padding: 10, background: 'rgba(251, 146, 60, 0.08)', border: `1px solid ${WARN}40`,
    borderRadius: 8, fontSize: 11, color: WARN, margin: '8px 0',
};
const claimStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    background: 'rgba(74, 222, 128, 0.08)',
    border: `1px solid ${OK}40`,
    borderRadius: 8,
    margin: '8px 0',
};
const actionsStyle = { marginTop: 8 };
