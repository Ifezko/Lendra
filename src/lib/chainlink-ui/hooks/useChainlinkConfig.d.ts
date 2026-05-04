/**
 * Shape of VITE_CHAINLINK_CONFIG injected by Eitherway's preview controller.
 * Platform persists Services Hub subscriptions and auto-deployed upkeeps here.
 */
export interface ChainlinkConfig {
    vrf: Record<string, ChainlinkServiceEntry>;
    functions: Record<string, ChainlinkServiceEntry>;
    automation: Record<string, ChainlinkAutomationEntry[]>;
}
export interface ChainlinkServiceEntry {
    subscriptionId: string;
    coordinator: string;
    linkToken: string;
    contractAddress: string | null;
    fundedLinkAmount: string;
    chainName: string;
    metadata: {
        keyHash?: string;
        donId?: string;
        imported?: boolean;
        [k: string]: any;
    };
}
export interface ChainlinkAutomationEntry extends ChainlinkServiceEntry {
    upkeepId: string;
}
/**
 * Tracks the user's currently-connected chain via EIP-1193 chainChanged event,
 * falling back to VITE_CHAINLINK_DEFAULT_CHAIN_ID when no wallet is connected.
 *
 * Shared across all Chainlink services so UI filtering stays consistent.
 */
export declare function useActiveChainId(): number;
/**
 * Returns the Chainlink config scoped to the active chain. Generated apps read
 * this rather than parsing VITE_CHAINLINK_CONFIG directly so they don't have to
 * worry about schema drift.
 */
export declare function useChainlinkConfig(): {
    chainId: number;
    vrf: ChainlinkServiceEntry | null;
    functions: ChainlinkServiceEntry | null;
    automation: ChainlinkAutomationEntry[];
    raw: ChainlinkConfig;
};
/**
 * Scoped variant for Automation apps: finds the upkeep that matches THIS
 * contract's address. Generated apps use this so they don't show stale upkeeps
 * from other apps the same user built.
 */
export declare function useAppUpkeep(contractAddress?: string): ChainlinkAutomationEntry | null;
