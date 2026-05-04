export interface VRFOperatorPanelProps {
    /** Deployed address of the user's contract that inherits EitherwayVRFGame. */
    contractAddress: `0x${string}`;
    /** Suggested starting bankroll when the operator activates. Defaults to
     *  0.005 ETH. Kept small on purpose: this is contract-side funds for
     *  paying out winners, separate from the VRF sub. Top up more after the
     *  first run if payouts start draining it. */
    defaultBankrollETH?: string;
    /** Suggested VRF sub top-up. Defaults to 0.25 ETH. Sized to cover one
     *  worst-case Sepolia request reserve: the coordinator holds back
     *  `maxCost = (callbackGasLimit + verifyOverhead) * maxGasPrice * (1 + premium)`,
     *  and on Sepolia maxGasPrice is capped at 500 Gwei even though real gas
     *  usually lands closer to 1-2 Gwei. Real gas cost per callback is tiny,
     *  but the coordinator refuses to dispatch until the sub balance covers
     *  the reserve, so anything below ~0.2 ETH leaves requests pending
     *  indefinitely. (Mainnet maxCost is much lower; when we add mainnet
     *  support this should become chain-aware.) */
    defaultSubFundingETH?: string;
    /** Required multiple of PAYOUT the contract wants covered before accepting bets. Default 5x. */
    bankrollCoverageHint?: number;
    /** Optional label appended to the panel title. */
    appName?: string;
}
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
export declare function VRFOperatorPanel(props: VRFOperatorPanelProps): import("react/jsx-runtime").JSX.Element | null;
