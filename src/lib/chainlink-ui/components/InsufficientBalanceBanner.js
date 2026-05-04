import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { INSUFFICIENT_BALANCE_SELECTOR } from '../abis/index.js';
/**
 * Decodes Chainlink's InsufficientBalance() custom error (selector 0xf4d678b8) out of
 * any error shape viem/wagmi throws (plain Error, ContractFunctionRevertedError,
 * nested cause chain). Without this the user just sees "gas limit too high" from the
 * wallet RPC, which is wrong — the real issue is the subscription is empty.
 *
 * Returns null when the error doesn't match, so it's safe to always mount.
 */
export function InsufficientBalanceBanner(props) {
    const { error, service, onTopUp } = props;
    if (!error)
        return null;
    if (!isInsufficientBalance(error))
        return null;
    const label = service === 'vrf'
        ? 'VRF subscription'
        : service === 'functions'
            ? 'Functions subscription'
            : service === 'automation'
                ? 'Upkeep'
                : 'Subscription';
    return (_jsxs("div", { style: bannerStyle, children: [_jsxs("div", { style: { fontSize: 13, fontWeight: 600, color: '#fb923c', marginBottom: 4 }, children: [label, " out of funds"] }), _jsxs("div", { style: { fontSize: 12, opacity: 0.7, color: '#fff', lineHeight: 1.5 }, children: ["Chainlink rejected the request because the ", label.toLowerCase(), " has insufficient balance. Top it up and retry."] }), onTopUp && (_jsx("button", { style: topUpButtonStyle, onClick: onTopUp, children: "Top up now" }))] }));
}
/** Extracted for reuse — useful in useEffect error handlers outside this component. */
export function isInsufficientBalance(error) {
    if (!error)
        return false;
    // Walk through common shapes: Error.message, error.data, error.cause.data, stringified.
    const asAny = error;
    const candidates = [
        asAny.data,
        asAny.cause?.data,
        asAny.cause?.cause?.data,
        asAny.details,
        asAny.shortMessage,
        asAny.message,
        typeof error === 'string' ? error : '',
    ];
    for (const c of candidates) {
        if (typeof c === 'string' && c.toLowerCase().includes(INSUFFICIENT_BALANCE_SELECTOR.toLowerCase())) {
            return true;
        }
    }
    // Last resort: stringify the whole thing (covers nested viem error objects).
    try {
        const blob = JSON.stringify(error).toLowerCase();
        return blob.includes(INSUFFICIENT_BALANCE_SELECTOR.toLowerCase());
    }
    catch {
        return false;
    }
}
const bannerStyle = {
    padding: 12,
    background: 'rgba(251, 146, 60, 0.1)',
    border: '1px solid rgba(251, 146, 60, 0.3)',
    borderRadius: 8,
    margin: '12px 0',
    fontFamily: "'Montserrat', -apple-system, sans-serif",
};
const topUpButtonStyle = {
    marginTop: 10,
    padding: '6px 14px',
    fontSize: 12,
    cursor: 'pointer',
    background: '#0D00FF',
    color: '#fff',
    border: '1px solid #0D00FF',
    borderRadius: 8,
    fontWeight: 600,
};
