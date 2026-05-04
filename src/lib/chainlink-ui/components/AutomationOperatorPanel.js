import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { EITHERWAY_AUTOMATION_ABI, AUTOMATION_REGISTRAR_ABI, AUTOMATION_REGISTRY_ABI, LINK_TOKEN_ABI, } from '../abis/index.js';
import { useChainlinkConfig, useAppUpkeep } from '../hooks/useChainlinkConfig.js';
import { useChainlinkWrite } from '../hooks/useChainlinkWrite.js';
/**
 * Automation setup + operator control panel.
 *
 * Unlike VRF/Functions, Automation doesn't use a pre-created subscription. Instead,
 * registerUpkeep mints an upkeepId in one tx, funded with LINK from the caller.
 *
 * Activation flow:
 *   1. approve(registrar, LINK)
 *   2. claimOwnership on the task contract
 *   3. registerUpkeep (mints upkeepId, funds in same tx)
 *
 * The resulting upkeepId needs to be captured from the RegistrationApproved event;
 * Eitherway's preview controller watches for this and writes it back to the config,
 * so useAppUpkeep picks it up on the next refresh.
 */
export function AutomationOperatorPanel(props) {
    const { contractAddress, registrar, registry, linkToken, defaultRegisterLINK = '5', performGas = 500000, appName, } = props;
    const { address: connected, isConnected } = useAccount();
    const { chainId } = useChainlinkConfig();
    const appUpkeep = useAppUpkeep(contractAddress);
    const { writeContractAsync, isPending } = useChainlinkWrite();
    const [isActivating, setIsActivating] = useState(false);
    const { data: houseOperator, refetch: refetchOperator } = useReadContract({
        address: contractAddress,
        abi: EITHERWAY_AUTOMATION_ABI,
        functionName: 'houseOperator',
    });
    const { data: claimed, refetch: refetchClaimed } = useReadContract({
        address: contractAddress,
        abi: EITHERWAY_AUTOMATION_ABI,
        functionName: 'ownershipClaimed',
    });
    const { data: totalRuns } = useReadContract({
        address: contractAddress,
        abi: EITHERWAY_AUTOMATION_ABI,
        functionName: 'totalRuns',
        query: { refetchInterval: 15000 },
    });
    const { data: timeUntilNext } = useReadContract({
        address: contractAddress,
        abi: EITHERWAY_AUTOMATION_ABI,
        functionName: 'getTimeUntilNextRun',
        query: { refetchInterval: 5000 },
    });
    const upkeepId = appUpkeep?.upkeepId ? BigInt(appUpkeep.upkeepId) : null;
    const { data: upkeepData, refetch: refetchUpkeep } = useReadContract({
        address: registry,
        abi: AUTOMATION_REGISTRY_ABI,
        functionName: 'getUpkeep',
        args: upkeepId ? [upkeepId] : undefined,
        query: { enabled: !!upkeepId, refetchInterval: 15000 },
    });
    const { data: linkBalance } = useReadContract({
        address: linkToken,
        abi: LINK_TOKEN_ABI,
        functionName: 'balanceOf',
        args: connected ? [connected] : undefined,
        query: { enabled: !!connected, refetchInterval: 15000 },
    });
    const state = useMemo(() => {
        if (!isConnected)
            return 'disconnected';
        if (claimed === undefined || houseOperator === undefined)
            return 'loading';
        const isHouseOperator = houseOperator?.toLowerCase() === connected?.toLowerCase();
        if (!claimed || !upkeepId) {
            // Anyone currently connected can activate, but we only want the intended operator.
            // In practice the first-claimer wins via claimOwnership, so we gate rendering on "not
            // yet activated" rather than identity.
            return 'activate';
        }
        return isHouseOperator ? 'dashboard' : 'hidden';
    }, [isConnected, claimed, houseOperator, connected, upkeepId]);
    const activate = async () => {
        const linkAmount = parseEther(defaultRegisterLINK);
        setIsActivating(true);
        try {
            // 1. approve registrar to pull LINK
            await writeContractAsync({
                chainlinkAction: 'automationApproveLINK',
                address: linkToken,
                abi: LINK_TOKEN_ABI,
                functionName: 'approve',
                args: [registrar, linkAmount],
            });
            // 2. claim ownership on the task contract
            await writeContractAsync({
                chainlinkAction: 'claimOwnership',
                address: contractAddress,
                abi: EITHERWAY_AUTOMATION_ABI,
                functionName: 'claimOwnership',
            });
            // 3. registerUpkeep
            await writeContractAsync({
                chainlinkAction: 'automationRegister',
                address: registrar,
                abi: AUTOMATION_REGISTRAR_ABI,
                functionName: 'registerUpkeep',
                args: [{
                        name: appName || 'Eitherway task',
                        encryptedEmail: '0x',
                        upkeepContract: contractAddress,
                        gasLimit: performGas,
                        adminAddress: connected,
                        triggerType: 0, // conditional
                        checkData: '0x',
                        triggerConfig: '0x',
                        offchainConfig: '0x',
                        amount: linkAmount,
                    }],
            });
            await Promise.all([refetchClaimed(), refetchOperator(), refetchUpkeep()]);
        }
        finally {
            setIsActivating(false);
        }
    };
    const topUpUpkeep = async (linkAmount) => {
        if (!upkeepId)
            return;
        const amount = parseEther(linkAmount);
        // addFunds pulls via allowance, so approve first.
        await writeContractAsync({
            chainlinkAction: 'automationApproveLINK',
            address: linkToken,
            abi: LINK_TOKEN_ABI,
            functionName: 'approve',
            args: [registry, amount],
        });
        await writeContractAsync({
            chainlinkAction: 'automationAddFunds',
            address: registry,
            abi: AUTOMATION_REGISTRY_ABI,
            functionName: 'addFunds',
            args: [upkeepId, amount],
        });
        await refetchUpkeep();
    };
    const pauseToggle = async () => {
        if (!upkeepId || !upkeepData)
            return;
        const paused = upkeepData.paused;
        await writeContractAsync({
            chainlinkAction: 'automationRegister', // safe conservative cap
            address: registry,
            abi: AUTOMATION_REGISTRY_ABI,
            functionName: paused ? 'unpauseUpkeep' : 'pauseUpkeep',
            args: [upkeepId],
        });
        await refetchUpkeep();
    };
    if (state === 'hidden' || state === 'disconnected')
        return null;
    if (state === 'loading') {
        return _jsx("div", { style: panelStyle, children: _jsx("div", { style: { opacity: 0.5, fontSize: 13 }, children: "Loading Automation operator panel\u2026" }) });
    }
    if (state === 'activate') {
        const userLink = linkBalance ? Number(formatEther(linkBalance)) : 0;
        const needed = parseFloat(defaultRegisterLINK);
        const lowLink = userLink < needed;
        return (_jsxs("div", { style: panelStyle, children: [_jsxs("h3", { style: titleStyle, children: ["Activate ", appName || 'task'] }), _jsxs("p", { style: descStyle, children: ["Approve LINK, claim ownership, and register the upkeep with ", defaultRegisterLINK, " LINK. Your wallet will sign 3 transactions."] }), lowLink && (_jsxs("div", { style: warnStyle, children: ["You have ", userLink.toFixed(2), " LINK in this wallet but need ", needed, ". Fund with LINK first (Chainlink Faucet on testnets)."] })), _jsx("button", { style: primaryButtonStyle, onClick: activate, disabled: isPending || isActivating || lowLink, children: isActivating ? 'Activating… (check your wallet for signatures)' : `Activate (${defaultRegisterLINK} LINK)` })] }));
    }
    const upkeepBalance = upkeepData ? formatEther(upkeepData.balance) : '0';
    const upkeepPaused = upkeepData ? upkeepData.paused : false;
    const lowBalance = Number(upkeepBalance) < 1;
    const nextSec = timeUntilNext ? Number(timeUntilNext) : 0;
    const nextLabel = nextSec === 0 ? 'ready' : `${nextSec}s`;
    return (_jsxs("div", { style: panelStyle, children: [_jsxs("h3", { style: titleStyle, children: ["Operator dashboard", appName ? ` — ${appName}` : ''] }), _jsxs("div", { style: rowStyle, children: [_jsx(Stat, { label: "Upkeep LINK", value: `${Number(upkeepBalance).toFixed(2)}`, warn: lowBalance }), _jsx(Stat, { label: "Runs", value: totalRuns !== undefined ? String(totalRuns) : '—' }), _jsx(Stat, { label: "Next run", value: nextLabel })] }), upkeepPaused && (_jsx("div", { style: warnStyle, children: "Upkeep paused. Click Resume to re-enable." })), lowBalance && !upkeepPaused && (_jsx("div", { style: warnStyle, children: "Upkeep balance below 1 LINK. Top up or the network will stop running your task." })), _jsxs("div", { style: actionsStyle, children: [_jsx(ActionRow, { label: "Top up upkeep (LINK)", defaultVal: "2", onSubmit: topUpUpkeep }), _jsx("div", { style: { display: 'flex', justifyContent: 'flex-end', marginTop: 8 }, children: _jsx("button", { style: buttonStyle, onClick: pauseToggle, disabled: isPending, children: upkeepPaused ? 'Resume upkeep' : 'Pause upkeep' }) })] })] }));
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
