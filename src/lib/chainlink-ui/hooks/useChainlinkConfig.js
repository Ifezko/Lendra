import { useEffect, useState } from 'react';
function parseConfig() {
    const raw = import.meta.env?.VITE_CHAINLINK_CONFIG;
    if (!raw) {
        // Not a hard error — many apps don't need Chainlink and the env var is absent by design.
        return { vrf: {}, functions: {}, automation: {} };
    }
    try {
        const parsed = JSON.parse(raw);
        return {
            vrf: parsed.vrf ?? {},
            functions: parsed.functions ?? {},
            automation: parsed.automation ?? {},
        };
    }
    catch (err) {
        // Malformed config is a real misconfiguration — surface it loudly so the
        // user doesn't silently get an empty Services Hub with no indication why.
        console.warn('[chainlink-ui] VITE_CHAINLINK_CONFIG is set but failed to parse as JSON. ' +
            'Services Hub state will be empty until this is fixed.', err);
        return { vrf: {}, functions: {}, automation: {} };
    }
}
const DEFAULT_CHAIN_ID = () => {
    const v = import.meta.env?.VITE_CHAINLINK_DEFAULT_CHAIN_ID;
    return v ? Number(v) : 11155111;
};
/**
 * Tracks the user's currently-connected chain via EIP-1193 chainChanged event,
 * falling back to VITE_CHAINLINK_DEFAULT_CHAIN_ID when no wallet is connected.
 *
 * Shared across all Chainlink services so UI filtering stays consistent.
 */
export function useActiveChainId() {
    const [chainId, setChainId] = useState(DEFAULT_CHAIN_ID);
    useEffect(() => {
        const eth = globalThis.ethereum;
        if (!eth)
            return;
        eth.request({ method: 'eth_chainId' })
            .then((hex) => setChainId(parseInt(hex, 16)))
            .catch(() => { });
        const onChainChanged = (hex) => setChainId(parseInt(hex, 16));
        eth.on?.('chainChanged', onChainChanged);
        return () => { eth.removeListener?.('chainChanged', onChainChanged); };
    }, []);
    return chainId;
}
/**
 * Returns the Chainlink config scoped to the active chain. Generated apps read
 * this rather than parsing VITE_CHAINLINK_CONFIG directly so they don't have to
 * worry about schema drift.
 */
export function useChainlinkConfig() {
    const chainId = useActiveChainId();
    const [cfg] = useState(() => parseConfig());
    return {
        chainId,
        vrf: cfg.vrf[chainId] ?? null,
        functions: cfg.functions[chainId] ?? null,
        automation: cfg.automation[chainId] ?? [],
        raw: cfg,
    };
}
/**
 * Scoped variant for Automation apps: finds the upkeep that matches THIS
 * contract's address. Generated apps use this so they don't show stale upkeeps
 * from other apps the same user built.
 */
export function useAppUpkeep(contractAddress) {
    const { automation } = useChainlinkConfig();
    if (!contractAddress)
        return null;
    const needle = contractAddress.toLowerCase();
    return automation.find((u) => {
        const candidate = (u.contractAddress || u.metadata?.upkeepContract || '').toLowerCase();
        return candidate === needle;
    }) ?? null;
}
