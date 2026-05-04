export interface FunctionsOperatorPanelProps {
    contractAddress: `0x${string}`;
    /** Default LINK top-up for the Functions subscription. Sepolia DON charges are LINK-only. */
    defaultSubFundingLINK?: string;
    appName?: string;
}
/**
 * All-in-one Functions setup + operator control panel.
 *
 * Functions subs differ from VRF in two important ways:
 *  - No native ETH funding: the sub only accepts LINK via transferAndCall.
 *  - getSubscription returns a TUPLE struct, not flat outputs (silent-decode footgun).
 *
 * Both are baked into the ABIs; this component just wires them.
 */
export declare function FunctionsOperatorPanel(props: FunctionsOperatorPanelProps): import("react/jsx-runtime").JSX.Element | null;
