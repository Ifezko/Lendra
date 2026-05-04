/**
 * Minimal ABIs for the EitherwayChainlinkBase family and Chainlink coordinator/router
 * contracts the React components need to read and write.
 *
 * These match the EitherwayChainlinkBase.sol / EitherwayVRFGame.sol / etc. contracts
 * shipped under packages/database/src/templates/chainlink/. If you change the Solidity,
 * update these too.
 */
// Shared base: ownership lifecycle + pull-payment + status reads.
// Mirrors EitherwayChainlinkBase.sol (packages/database/src/templates/chainlink).
export const EITHERWAY_CHAINLINK_BASE_ABI = [
    // Ownership — named `transferHouseOperator`/`acceptHouseOperator` rather than
    // `transferOwnership`/`acceptOwnership` so they don't collide with
    // Chainlink's ConfirmedOwnerWithProposal on the VRF base contract. Think of
    // these as "bankroll admin" handoff, distinct from VRF-coordinator admin.
    { type: 'function', name: 'claimOwnership', inputs: [], outputs: [], stateMutability: 'nonpayable' },
    { type: 'function', name: 'transferHouseOperator', inputs: [{ name: 'newOperator', type: 'address' }], outputs: [], stateMutability: 'nonpayable' },
    { type: 'function', name: 'acceptHouseOperator', inputs: [], outputs: [], stateMutability: 'nonpayable' },
    { type: 'function', name: 'houseOperator', inputs: [], outputs: [{ type: 'address' }], stateMutability: 'view' },
    { type: 'function', name: 'pendingOperator', inputs: [], outputs: [{ type: 'address' }], stateMutability: 'view' },
    { type: 'function', name: 'ownershipClaimed', inputs: [], outputs: [{ type: 'bool' }], stateMutability: 'view' },
    // Pull-payment ledger (withdrawals accrue here; recipient calls claim())
    { type: 'function', name: 'withdrawHouse', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
    { type: 'function', name: 'claim', inputs: [], outputs: [], stateMutability: 'nonpayable' },
    { type: 'function', name: 'pendingWithdrawals', inputs: [{ name: 'recipient', type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
    { type: 'function', name: 'reservedForWithdrawals', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
    // Events
    { type: 'event', name: 'OwnershipClaimed', inputs: [{ name: 'operator', type: 'address', indexed: true }] },
    { type: 'event', name: 'HouseOperatorTransferStarted', inputs: [{ name: 'previousOperator', type: 'address', indexed: true }, { name: 'newOperator', type: 'address', indexed: true }] },
    { type: 'event', name: 'HouseOperatorTransferred', inputs: [{ name: 'previousOperator', type: 'address', indexed: true }, { name: 'newOperator', type: 'address', indexed: true }] },
    { type: 'event', name: 'HouseFunded', inputs: [{ name: 'funder', type: 'address', indexed: true }, { name: 'amount', type: 'uint256' }] },
    { type: 'event', name: 'HouseWithdrawn', inputs: [{ name: 'operator', type: 'address', indexed: true }, { name: 'amount', type: 'uint256' }] },
    { type: 'event', name: 'WinnerCredited', inputs: [{ name: 'winner', type: 'address', indexed: true }, { name: 'amount', type: 'uint256' }] },
    { type: 'event', name: 'Claimed', inputs: [{ name: 'recipient', type: 'address', indexed: true }, { name: 'amount', type: 'uint256' }] },
    // Errors
    { type: 'error', name: 'NotHouse', inputs: [] },
    { type: 'error', name: 'AlreadyClaimed', inputs: [] },
    { type: 'error', name: 'NotPendingOperator', inputs: [] },
    { type: 'error', name: 'ZeroAddressNotAllowed', inputs: [] },
    { type: 'error', name: 'ZeroAmount', inputs: [] },
    { type: 'error', name: 'HouseTooLow', inputs: [{ name: 'available', type: 'uint256' }, { name: 'required', type: 'uint256' }] },
    { type: 'error', name: 'NothingToClaim', inputs: [] },
    { type: 'error', name: 'TransferFailed', inputs: [] },
    { type: 'error', name: 'Reentrant', inputs: [] },
    { type: 'error', name: 'InvalidCoverageMultiple', inputs: [] },
];
// VRF-specific extensions layered on top of the base.
export const EITHERWAY_VRF_ABI = [
    ...EITHERWAY_CHAINLINK_BASE_ABI,
    { type: 'function', name: 's_subscriptionId', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
    { type: 'function', name: 's_keyHash', inputs: [], outputs: [{ type: 'bytes32' }], stateMutability: 'view' },
    { type: 'function', name: 'totalRequests', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
    { type: 'function', name: 'totalFulfilled', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
    { type: 'function', name: 'totalSettlementFailures', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
    { type: 'function', name: 'requestPending', inputs: [{ name: 'requestId', type: 'uint256' }], outputs: [{ type: 'bool' }], stateMutability: 'view' },
    { type: 'function', name: 'settlementDeferred', inputs: [{ name: 'requestId', type: 'uint256' }], outputs: [{ type: 'bool' }], stateMutability: 'view' },
    { type: 'function', name: 'retrySettlement', inputs: [{ name: 'requestId', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
    {
        type: 'function', name: 'vrfStats', inputs: [],
        outputs: [
            { name: 'subscriptionId', type: 'uint256' },
            { name: 'keyHash', type: 'bytes32' },
            { name: 'callbackGasLimit', type: 'uint32' },
            { name: '_totalRequests', type: 'uint256' },
            { name: '_totalFulfilled', type: 'uint256' },
            { name: 'contractBalance', type: 'uint256' },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function', name: 'vrfStatsExt', inputs: [],
        outputs: [
            { name: 'subscriptionId', type: 'uint256' },
            { name: 'keyHash', type: 'bytes32' },
            { name: 'callbackGasLimit', type: 'uint32' },
            { name: '_totalRequests', type: 'uint256' },
            { name: '_totalFulfilled', type: 'uint256' },
            { name: '_totalSettlementFailures', type: 'uint256' },
            { name: 'contractBalance', type: 'uint256' },
            { name: '_reservedForWithdrawals', type: 'uint256' },
        ],
        stateMutability: 'view',
    },
    { type: 'event', name: 'RandomnessRequested', inputs: [{ name: 'requestId', type: 'uint256', indexed: true }, { name: 'origin', type: 'address', indexed: true }] },
    { type: 'event', name: 'RandomnessFulfilled', inputs: [{ name: 'requestId', type: 'uint256', indexed: true }] },
    { type: 'event', name: 'BetSettled', inputs: [{ name: 'requestId', type: 'uint256', indexed: true }] },
    { type: 'event', name: 'SettlementFailed', inputs: [{ name: 'requestId', type: 'uint256', indexed: true }, { name: 'reason', type: 'bytes' }] },
    { type: 'event', name: 'SettlementRetried', inputs: [{ name: 'requestId', type: 'uint256', indexed: true }] },
];
// VRF Coordinator v2.5 subscription management (addConsumer, getSubscription, fund).
export const VRF_COORDINATOR_V2_5_ABI = [
    { type: 'function', name: 'addConsumer', inputs: [{ name: 'subId', type: 'uint256' }, { name: 'consumer', type: 'address' }], outputs: [], stateMutability: 'nonpayable' },
    { type: 'function', name: 'removeConsumer', inputs: [{ name: 'subId', type: 'uint256' }, { name: 'consumer', type: 'address' }], outputs: [], stateMutability: 'nonpayable' },
    { type: 'function', name: 'fundSubscriptionWithNative', inputs: [{ name: 'subId', type: 'uint256' }], outputs: [], stateMutability: 'payable' },
    {
        type: 'function', name: 'getSubscription', inputs: [{ name: 'subId', type: 'uint256' }],
        outputs: [
            { name: 'balance', type: 'uint96' },
            { name: 'nativeBalance', type: 'uint96' },
            { name: 'reqCount', type: 'uint64' },
            { name: 'owner', type: 'address' },
            { name: 'consumers', type: 'address[]' },
        ],
        stateMutability: 'view',
    },
];
// Functions-specific extensions layered on the base.
export const EITHERWAY_FUNCTIONS_ABI = [
    ...EITHERWAY_CHAINLINK_BASE_ABI,
    { type: 'function', name: 's_subscriptionId', inputs: [], outputs: [{ type: 'uint64' }], stateMutability: 'view' },
    { type: 'function', name: 's_donId', inputs: [], outputs: [{ type: 'bytes32' }], stateMutability: 'view' },
    { type: 'function', name: 'lastUpdatedAt', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
    { type: 'function', name: 'totalRequests', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
    { type: 'function', name: 'totalFulfilled', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
    { type: 'function', name: 'totalFailed', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
    { type: 'event', name: 'RequestSent', inputs: [{ name: 'requestId', type: 'bytes32', indexed: true }, { name: 'origin', type: 'address', indexed: true }] },
    { type: 'event', name: 'ResponseReceived', inputs: [{ name: 'requestId', type: 'bytes32', indexed: true }, { name: 'response', type: 'bytes' }, { name: 'err', type: 'bytes' }] },
];
// Functions Router — subscription management. getSubscription returns a TUPLE struct,
// not flat outputs. This was a silent-decode-failure footgun we hit during testing.
export const FUNCTIONS_ROUTER_ABI = [
    { type: 'function', name: 'addConsumer', inputs: [{ name: 'subscriptionId', type: 'uint64' }, { name: 'consumer', type: 'address' }], outputs: [], stateMutability: 'nonpayable' },
    { type: 'function', name: 'removeConsumer', inputs: [{ name: 'subscriptionId', type: 'uint64' }, { name: 'consumer', type: 'address' }], outputs: [], stateMutability: 'nonpayable' },
    {
        type: 'function', name: 'getSubscription', inputs: [{ name: 'subscriptionId', type: 'uint64' }],
        outputs: [{
                type: 'tuple', name: 'subscription',
                components: [
                    { name: 'balance', type: 'uint96' },
                    { name: 'owner', type: 'address' },
                    { name: 'blockedBalance', type: 'uint96' },
                    { name: 'proposedOwner', type: 'address' },
                    { name: 'consumers', type: 'address[]' },
                    { name: 'flags', type: 'bytes32' },
                ],
            }],
        stateMutability: 'view',
    },
];
// LINK token ABI (ERC-20 + ERC-677 transferAndCall used for Functions sub funding).
export const LINK_TOKEN_ABI = [
    { type: 'function', name: 'approve', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }], stateMutability: 'nonpayable' },
    { type: 'function', name: 'balanceOf', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
    { type: 'function', name: 'transferAndCall', inputs: [{ name: 'to', type: 'address' }, { name: 'value', type: 'uint256' }, { name: 'data', type: 'bytes' }], outputs: [{ type: 'bool' }], stateMutability: 'nonpayable' },
];
// Automation-specific extensions layered on the base.
export const EITHERWAY_AUTOMATION_ABI = [
    ...EITHERWAY_CHAINLINK_BASE_ABI,
    { type: 'function', name: 'INTERVAL', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
    { type: 'function', name: 'lastRun', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
    { type: 'function', name: 'totalRuns', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
    { type: 'function', name: 'getTimeUntilNextRun', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
    { type: 'event', name: 'TaskRan', inputs: [{ name: 'runNumber', type: 'uint256', indexed: true }, { name: 'timestamp', type: 'uint256' }] },
];
// Automation Registrar 2.1 — registerUpkeep(RegistrationParams) flow.
export const AUTOMATION_REGISTRAR_ABI = [
    {
        type: 'function', name: 'registerUpkeep',
        inputs: [{
                type: 'tuple', name: 'requestParams',
                components: [
                    { name: 'name', type: 'string' },
                    { name: 'encryptedEmail', type: 'bytes' },
                    { name: 'upkeepContract', type: 'address' },
                    { name: 'gasLimit', type: 'uint32' },
                    { name: 'adminAddress', type: 'address' },
                    { name: 'triggerType', type: 'uint8' },
                    { name: 'checkData', type: 'bytes' },
                    { name: 'triggerConfig', type: 'bytes' },
                    { name: 'offchainConfig', type: 'bytes' },
                    { name: 'amount', type: 'uint96' },
                ],
            }],
        outputs: [{ type: 'uint256' }],
        stateMutability: 'nonpayable',
    },
    // Emitted when Sepolia auto-approves; gives us the upkeepId.
    {
        type: 'event', name: 'RegistrationApproved',
        inputs: [
            { name: 'hash', type: 'bytes32', indexed: true },
            { name: 'displayName', type: 'string' },
            { name: 'upkeepId', type: 'uint256', indexed: true },
        ],
    },
];
// Automation Registry — upkeep management after registration.
export const AUTOMATION_REGISTRY_ABI = [
    {
        type: 'function', name: 'getUpkeep', inputs: [{ name: 'id', type: 'uint256' }],
        outputs: [{
                type: 'tuple',
                components: [
                    { name: 'target', type: 'address' },
                    { name: 'performGas', type: 'uint32' },
                    { name: 'checkData', type: 'bytes' },
                    { name: 'balance', type: 'uint96' },
                    { name: 'admin', type: 'address' },
                    { name: 'maxValidBlocknumber', type: 'uint64' },
                    { name: 'lastPerformedBlockNumber', type: 'uint32' },
                    { name: 'amountSpent', type: 'uint96' },
                    { name: 'paused', type: 'bool' },
                    { name: 'offchainConfig', type: 'bytes' },
                ],
            }],
        stateMutability: 'view',
    },
    { type: 'function', name: 'addFunds', inputs: [{ name: 'id', type: 'uint256' }, { name: 'amount', type: 'uint96' }], outputs: [], stateMutability: 'nonpayable' },
    { type: 'function', name: 'pauseUpkeep', inputs: [{ name: 'id', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
    { type: 'function', name: 'unpauseUpkeep', inputs: [{ name: 'id', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
    { type: 'function', name: 'cancelUpkeep', inputs: [{ name: 'id', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
];
// Selector for Chainlink's InsufficientBalance() custom error. Catch and translate.
export const INSUFFICIENT_BALANCE_SELECTOR = '0xf4d678b8';
// Gas override caps per Chainlink-touching write. Without these, MetaMask's wallet RPC
// will inflate auto-estimates and reject with "gas limit too high" on testnets.
export const CHAINLINK_GAS_CAPS = {
    claimOwnership: 80000n,
    transferHouseOperator: 60000n,
    acceptHouseOperator: 80000n,
    withdrawHouse: 80000n,
    claim: 100000n,
    retrySettlement: 250000n,
    fundHouse: 60000n, // raw sendTransaction to contract
    vrfAddConsumer: 120000n,
    vrfFundNative: 100000n,
    vrfRequest: 250000n, // the domain function that calls requestRandomness inside
    functionsAddConsumer: 120000n,
    functionsFundLINK: 200000n,
    functionsSendRequest: 500000n,
    automationRegister: 500000n,
    automationAddFunds: 120000n,
    automationApproveLINK: 80000n,
};
