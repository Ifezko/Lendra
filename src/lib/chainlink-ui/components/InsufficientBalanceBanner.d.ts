export interface InsufficientBalanceBannerProps {
    /** Error thrown by wagmi/viem. Banner shows iff this decodes to InsufficientBalance. */
    error: unknown;
    /** Which service the error came from. Adjusts copy (VRF/Functions/Automation). */
    service?: 'vrf' | 'functions' | 'automation';
    /** Optional callback wired to the operator panel's top-up action. */
    onTopUp?: () => void;
}
/**
 * Decodes Chainlink's InsufficientBalance() custom error (selector 0xf4d678b8) out of
 * any error shape viem/wagmi throws (plain Error, ContractFunctionRevertedError,
 * nested cause chain). Without this the user just sees "gas limit too high" from the
 * wallet RPC, which is wrong — the real issue is the subscription is empty.
 *
 * Returns null when the error doesn't match, so it's safe to always mount.
 */
export declare function InsufficientBalanceBanner(props: InsufficientBalanceBannerProps): import("react/jsx-runtime").JSX.Element | null;
/** Extracted for reuse — useful in useEffect error handlers outside this component. */
export declare function isInsufficientBalance(error: unknown): boolean;
