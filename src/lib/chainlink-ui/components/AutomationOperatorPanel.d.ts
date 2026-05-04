export interface AutomationOperatorPanelProps {
    contractAddress: `0x${string}`;
    /** Registrar address on the active chain. Sepolia: 0xb0E49c5D0d05cbc241d68c05BC5BA1d1B7B72976 */
    registrar: `0x${string}`;
    /** Registry address for addFunds / pause / cancel. */
    registry: `0x${string}`;
    /** LINK token (same chain as registrar/registry). */
    linkToken: `0x${string}`;
    /** Default LINK for registerUpkeep. 5 LINK is the Sepolia minimum at 500k gas. */
    defaultRegisterLINK?: string;
    /** Perform gas the registry will cap at. Match the contract's expected work. */
    performGas?: number;
    appName?: string;
}
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
export declare function AutomationOperatorPanel(props: AutomationOperatorPanelProps): import("react/jsx-runtime").JSX.Element | null;
