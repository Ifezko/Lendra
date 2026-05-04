import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { parseEther, formatEther, encodeAbiParameters } from 'viem';
import { EITHERWAY_FUNCTIONS_ABI, FUNCTIONS_ROUTER_ABI, LINK_TOKEN_ABI, } from '../abis/index.js';
import { useChainlinkConfig } from '../hooks/useChainlinkConfig.js';
import { useChainlinkWrite } from '../hooks/useChainlinkWrite.js';
/**
 * All-in-one Functions setup + operator control panel.
 *
 * Functions subs differ from VRF in two important ways:
 *  - No native ETH funding: the sub only accepts LINK via transferAndCall.
 *  - getSubscription returns a TUPLE struct, not flat outputs (silent-decode footgun).
 *
 * Both are baked into the ABIs; this component just wires them.
 */
export function FunctionsOperatorPanel(props) {
    const { contractAddress, defaultSubFundingLINK = '2', appName, } = props;
    const { address: connected, isConnected } = useAccount();
    const { functions, chainId } = useChainlinkConfig();
    const { writeContractAsync, isPending } = useChainlinkWrite();
    const [isActivating, setIsActivating] = useState(false);
    const subId = functions?.subscriptionId ? BigInt(functions.subscriptionId) : null;
    const router = functions?.coordinator;
    const linkToken = functions?.linkToken;
    const { data: houseOperator, refetch: refetchOperator } = useReadContract({
        address: contractAddress,
        abi: EITHERWAY_FUNCTIONS_ABI,
        functionName: 'houseOperator',
    });
    const { data: claimed, refetch: refetchClaimed } = useReadContract({
        address: contractAddress,
        abi: EITHERWAY_FUNCTIONS_ABI,
        functionName: 'ownershipClaimed',
    });
    const { data: subData, refetch: refetchSub } = useReadContract({
        address: router,
        abi: FUNCTIONS_ROUTER_ABI,
        functionName: 'getSubscription',
        args: subId ? [subId] : undefined,
        query: { enabled: !!subId && !!router, refetchInterval: 10000 },
    });
    const { data: linkBalance } = useReadContract({
        address: linkToken,
        abi: LINK_TOKEN_ABI,
        functionName: 'balanceOf',
        args: connected ? [connected] : undefined,
        query: { enabled: !!linkToken && !!connected, refetchInterval: 15000 },
    });
    const state = useMemo(() => {
        if (!isConnected)
            return 'disconnected';
        if (!functions)
            return 'hidden';
        if (!contractAddress)
            return 'hidden';
        if (!subData || claimed === undefined || houseOperator === undefined)
            return 'loading';
        const subOwner = subData?.owner;
        const isSubOwner = subOwner?.toLowerCase() === connected?.toLowerCase();
        const isHouseOperator = houseOperator?.toLowerCase() === connected?.toLowerCase();
        if (!claimed)
            return isSubOwner ? 'activate' : 'wrong-sub-owner';
        return isHouseOperator ? 'dashboard' : 'hidden';
    }, [isConnected, functions, subData, claimed, houseOperator, connected]);
    const activate = async () => {
        if (!subId || !router || !linkToken)
            return;
        setIsActivating(true);
        try {
            // Step 1: claim ownership on the consumer
            await writeContractAsync({
                chainlinkAction: 'claimOwnership',
                address: contractAddress,
                abi: EITHERWAY_FUNCTIONS_ABI,
                functionName: 'claimOwnership',
            });
            // Step 2: register contract as consumer on the sub
            await writeContractAsync({
                chainlinkAction: 'functionsAddConsumer',
                address: router,
                abi: FUNCTIONS_ROUTER_ABI,
                functionName: 'addConsumer',
                args: [subId, contractAddress],
            });
            // Step 3: top up sub with LINK via transferAndCall (Functions is LINK-only).
            if (parseFloat(defaultSubFundingLINK) > 0) {
                const encoded = encodeAbiParameters([{ type: 'uint64' }], [subId]);
                await writeContractAsync({
                    chainlinkAction: 'functionsFundLINK',
                    address: linkToken,
                    abi: LINK_TOKEN_ABI,
                    functionName: 'transferAndCall',
                    args: [router, parseEther(defaultSubFundingLINK), encoded],
                });
            }
            await Promise.all([refetchClaimed(), refetchOperator(), refetchSub()]);
        }
        finally {
            setIsActivating(false);
        }
    };
    const topUpSubLINK = async (linkAmount) => {
        if (!subId || !router || !linkToken)
            return;
        const encoded = encodeAbiParameters([{ type: 'uint64' }], [subId]);
        await writeContractAsync({
            chainlinkAction: 'functionsFundLINK',
            address: linkToken,
            abi: LINK_TOKEN_ABI,
            functionName: 'transferAndCall',
            args: [router, parseEther(linkAmount), encoded],
        });
        await refetchSub();
    };
    if (state === 'hidden' || state === 'disconnected')
        return null;
    if (state === 'loading') {
        return _jsx("div", { style: panelStyle, children: _jsx("div", { style: { opacity: 0.5, fontSize: 13 }, children: "Loading Functions operator panel\u2026" }) });
    }
    if (state === 'wrong-sub-owner') {
        const subOwner = subData?.owner;
        return (_jsxs("div", { style: panelStyle, children: [_jsx("h3", { style: titleStyle, children: "Activation required" }), _jsxs("p", { style: descStyle, children: ["This ", appName || 'oracle', " must be activated by the wallet that owns the Chainlink Functions subscription on chain ", chainId, ". Reconnect as ", _jsx("code", { style: codeStyle, children: subOwner }), "."] }), subOwner && (_jsx("button", { style: buttonStyle, onClick: () => navigator.clipboard?.writeText(subOwner), children: "Copy sub owner address" }))] }));
    }
    if (state === 'activate') {
        const userLink = linkBalance ? Number(formatEther(linkBalance)) : 0;
        const needed = parseFloat(defaultSubFundingLINK);
        const lowLink = userLink < needed;
        return (_jsxs("div", { style: panelStyle, children: [_jsxs("h3", { style: titleStyle, children: ["Activate ", appName || 'oracle'] }), _jsxs("p", { style: descStyle, children: ["Claim ownership, register this contract as a Functions consumer, and top up the subscription with ", defaultSubFundingLINK, " LINK. Your wallet will sign 3 transactions."] }), lowLink && (_jsxs("div", { style: warnStyle, children: ["You have ", userLink.toFixed(2), " LINK in this wallet but need ", needed, ". Fund the wallet with LINK first (Chainlink Faucet on testnets)."] })), _jsx("button", { style: primaryButtonStyle, onClick: activate, disabled: isPending || isActivating || lowLink, children: isActivating ? 'Activating… (check your wallet for signatures)' : `Activate (${defaultSubFundingLINK} LINK)` })] }));
    }
    const subLink = subData ? formatEther(subData.balance) : '0';
    const subBlocked = subData ? formatEther(subData.blockedBalance) : '0';
    const available = Math.max(0, Number(subLink) - Number(subBlocked));
    const subLow = available < 0.5;
    return (_jsxs("div", { style: panelStyle, children: [_jsxs("h3", { style: titleStyle, children: ["Operator dashboard", appName ? ` — ${appName}` : ''] }), _jsxs("div", { style: rowStyle, children: [_jsx(Stat, { label: "Sub LINK", value: `${Number(subLink).toFixed(2)}`, warn: subLow }), _jsx(Stat, { label: "Available", value: `${available.toFixed(2)}`, warn: subLow }), _jsx(Stat, { label: "Wallet LINK", value: linkBalance ? Number(formatEther(linkBalance)).toFixed(2) : '—' })] }), subLow && (_jsx("div", { style: warnStyle, children: "Subscription balance low. DON requests will revert with InsufficientBalance. Top up to keep requests flowing." })), _jsx("div", { style: actionsStyle, children: _jsx(ActionRow, { label: "Top up sub (LINK)", defaultVal: defaultSubFundingLINK, onSubmit: topUpSubLINK }) })] }));
}
function Stat({ label, value, warn }) {
    return (_jsxs("div", { style: { flex: 1, padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }, children: [_jsx("div", { style: { fontSize: 10, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }, children: label }), _jsx("div", { style: { fontSize: 16, fontWeight: 600, color: warn ? '#fb923c' : '#fff' }, children: value })] }));
}
function ActionRow({ label, defaultVal, onSubmit }) {
    const inputId = `ewcl-${label.replace(/\s+/g, '-').toLowerCase()}`;
    return (_jsxs("div", { style: { display: 'flex', gap: 8, alignItems: 'center', margin: '8px 0' }, children: [_jsx("label", { htmlFor: inputId, style: { fontSize: 12, opacity: 0.7, flex: 1 }, children: label }), _jsx("input", { id: inputId, defaultValue: defaultVal, style: { width: 80, padding: '4px 8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontSize: 12 } }), _jsx("button", { style: smallButtonStyle, onClick: (e) => {
                    const input = e.currentTarget.previousElementSibling;
                    const v = input?.value?.trim();
                    if (v)
                        onSubmit(v);
                }, children: "Go" })] }));
}
const panelStyle = {
    padding: 16,
    background: 'rgba(13, 13, 13, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    color: '#fff',
    fontFamily: "'Montserrat', -apple-system, sans-serif",
};
const titleStyle = { margin: '0 0 8px', fontSize: 15, fontWeight: 600 };
const descStyle = { margin: '0 0 12px', fontSize: 12, opacity: 0.7, lineHeight: 1.5 };
const codeStyle = { fontFamily: 'monospace', fontSize: 11, background: 'rgba(255,255,255,0.05)', padding: '1px 4px', borderRadius: 4 };
const buttonStyle = {
    padding: '8px 14px', fontSize: 12, cursor: 'pointer',
    background: 'rgba(255,255,255,0.05)', color: '#fff',
    border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8,
};
const primaryButtonStyle = {
    ...buttonStyle,
    background: '#0D00FF', border: '1px solid #0D00FF', color: '#fff', fontWeight: 600,
};
const smallButtonStyle = { ...buttonStyle, padding: '4px 10px', fontSize: 11 };
const rowStyle = { display: 'flex', gap: 8, margin: '12px 0' };
const warnStyle = {
    padding: 8, background: 'rgba(251, 146, 60, 0.1)', border: '1px solid rgba(251, 146, 60, 0.3)',
    borderRadius: 6, fontSize: 11, color: '#fb923c', margin: '8px 0',
};
const actionsStyle = { marginTop: 8 };
