/**
 * Minimal ABIs for the EitherwayChainlinkBase family and Chainlink coordinator/router
 * contracts the React components need to read and write.
 *
 * These match the EitherwayChainlinkBase.sol / EitherwayVRFGame.sol / etc. contracts
 * shipped under packages/database/src/templates/chainlink/. If you change the Solidity,
 * update these too.
 */
export declare const EITHERWAY_CHAINLINK_BASE_ABI: readonly [{
    readonly type: "function";
    readonly name: "claimOwnership";
    readonly inputs: readonly [];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "transferHouseOperator";
    readonly inputs: readonly [{
        readonly name: "newOperator";
        readonly type: "address";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "acceptHouseOperator";
    readonly inputs: readonly [];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "houseOperator";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "pendingOperator";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "ownershipClaimed";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "withdrawHouse";
    readonly inputs: readonly [{
        readonly name: "amount";
        readonly type: "uint256";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "claim";
    readonly inputs: readonly [];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "pendingWithdrawals";
    readonly inputs: readonly [{
        readonly name: "recipient";
        readonly type: "address";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "reservedForWithdrawals";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "event";
    readonly name: "OwnershipClaimed";
    readonly inputs: readonly [{
        readonly name: "operator";
        readonly type: "address";
        readonly indexed: true;
    }];
}, {
    readonly type: "event";
    readonly name: "HouseOperatorTransferStarted";
    readonly inputs: readonly [{
        readonly name: "previousOperator";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "newOperator";
        readonly type: "address";
        readonly indexed: true;
    }];
}, {
    readonly type: "event";
    readonly name: "HouseOperatorTransferred";
    readonly inputs: readonly [{
        readonly name: "previousOperator";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "newOperator";
        readonly type: "address";
        readonly indexed: true;
    }];
}, {
    readonly type: "event";
    readonly name: "HouseFunded";
    readonly inputs: readonly [{
        readonly name: "funder";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
    }];
}, {
    readonly type: "event";
    readonly name: "HouseWithdrawn";
    readonly inputs: readonly [{
        readonly name: "operator";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
    }];
}, {
    readonly type: "event";
    readonly name: "WinnerCredited";
    readonly inputs: readonly [{
        readonly name: "winner";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
    }];
}, {
    readonly type: "event";
    readonly name: "Claimed";
    readonly inputs: readonly [{
        readonly name: "recipient";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
    }];
}, {
    readonly type: "error";
    readonly name: "NotHouse";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "AlreadyClaimed";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "NotPendingOperator";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "ZeroAddressNotAllowed";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "ZeroAmount";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "HouseTooLow";
    readonly inputs: readonly [{
        readonly name: "available";
        readonly type: "uint256";
    }, {
        readonly name: "required";
        readonly type: "uint256";
    }];
}, {
    readonly type: "error";
    readonly name: "NothingToClaim";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "TransferFailed";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "Reentrant";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "InvalidCoverageMultiple";
    readonly inputs: readonly [];
}];
export declare const EITHERWAY_VRF_ABI: readonly [{
    readonly type: "function";
    readonly name: "claimOwnership";
    readonly inputs: readonly [];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "transferHouseOperator";
    readonly inputs: readonly [{
        readonly name: "newOperator";
        readonly type: "address";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "acceptHouseOperator";
    readonly inputs: readonly [];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "houseOperator";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "pendingOperator";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "ownershipClaimed";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "withdrawHouse";
    readonly inputs: readonly [{
        readonly name: "amount";
        readonly type: "uint256";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "claim";
    readonly inputs: readonly [];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "pendingWithdrawals";
    readonly inputs: readonly [{
        readonly name: "recipient";
        readonly type: "address";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "reservedForWithdrawals";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "event";
    readonly name: "OwnershipClaimed";
    readonly inputs: readonly [{
        readonly name: "operator";
        readonly type: "address";
        readonly indexed: true;
    }];
}, {
    readonly type: "event";
    readonly name: "HouseOperatorTransferStarted";
    readonly inputs: readonly [{
        readonly name: "previousOperator";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "newOperator";
        readonly type: "address";
        readonly indexed: true;
    }];
}, {
    readonly type: "event";
    readonly name: "HouseOperatorTransferred";
    readonly inputs: readonly [{
        readonly name: "previousOperator";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "newOperator";
        readonly type: "address";
        readonly indexed: true;
    }];
}, {
    readonly type: "event";
    readonly name: "HouseFunded";
    readonly inputs: readonly [{
        readonly name: "funder";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
    }];
}, {
    readonly type: "event";
    readonly name: "HouseWithdrawn";
    readonly inputs: readonly [{
        readonly name: "operator";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
    }];
}, {
    readonly type: "event";
    readonly name: "WinnerCredited";
    readonly inputs: readonly [{
        readonly name: "winner";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
    }];
}, {
    readonly type: "event";
    readonly name: "Claimed";
    readonly inputs: readonly [{
        readonly name: "recipient";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
    }];
}, {
    readonly type: "error";
    readonly name: "NotHouse";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "AlreadyClaimed";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "NotPendingOperator";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "ZeroAddressNotAllowed";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "ZeroAmount";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "HouseTooLow";
    readonly inputs: readonly [{
        readonly name: "available";
        readonly type: "uint256";
    }, {
        readonly name: "required";
        readonly type: "uint256";
    }];
}, {
    readonly type: "error";
    readonly name: "NothingToClaim";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "TransferFailed";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "Reentrant";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "InvalidCoverageMultiple";
    readonly inputs: readonly [];
}, {
    readonly type: "function";
    readonly name: "s_subscriptionId";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "s_keyHash";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "bytes32";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "totalRequests";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "totalFulfilled";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "totalSettlementFailures";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "requestPending";
    readonly inputs: readonly [{
        readonly name: "requestId";
        readonly type: "uint256";
    }];
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "settlementDeferred";
    readonly inputs: readonly [{
        readonly name: "requestId";
        readonly type: "uint256";
    }];
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "retrySettlement";
    readonly inputs: readonly [{
        readonly name: "requestId";
        readonly type: "uint256";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "vrfStats";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "subscriptionId";
        readonly type: "uint256";
    }, {
        readonly name: "keyHash";
        readonly type: "bytes32";
    }, {
        readonly name: "callbackGasLimit";
        readonly type: "uint32";
    }, {
        readonly name: "_totalRequests";
        readonly type: "uint256";
    }, {
        readonly name: "_totalFulfilled";
        readonly type: "uint256";
    }, {
        readonly name: "contractBalance";
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "vrfStatsExt";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "subscriptionId";
        readonly type: "uint256";
    }, {
        readonly name: "keyHash";
        readonly type: "bytes32";
    }, {
        readonly name: "callbackGasLimit";
        readonly type: "uint32";
    }, {
        readonly name: "_totalRequests";
        readonly type: "uint256";
    }, {
        readonly name: "_totalFulfilled";
        readonly type: "uint256";
    }, {
        readonly name: "_totalSettlementFailures";
        readonly type: "uint256";
    }, {
        readonly name: "contractBalance";
        readonly type: "uint256";
    }, {
        readonly name: "_reservedForWithdrawals";
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "event";
    readonly name: "RandomnessRequested";
    readonly inputs: readonly [{
        readonly name: "requestId";
        readonly type: "uint256";
        readonly indexed: true;
    }, {
        readonly name: "origin";
        readonly type: "address";
        readonly indexed: true;
    }];
}, {
    readonly type: "event";
    readonly name: "RandomnessFulfilled";
    readonly inputs: readonly [{
        readonly name: "requestId";
        readonly type: "uint256";
        readonly indexed: true;
    }];
}, {
    readonly type: "event";
    readonly name: "BetSettled";
    readonly inputs: readonly [{
        readonly name: "requestId";
        readonly type: "uint256";
        readonly indexed: true;
    }];
}, {
    readonly type: "event";
    readonly name: "SettlementFailed";
    readonly inputs: readonly [{
        readonly name: "requestId";
        readonly type: "uint256";
        readonly indexed: true;
    }, {
        readonly name: "reason";
        readonly type: "bytes";
    }];
}, {
    readonly type: "event";
    readonly name: "SettlementRetried";
    readonly inputs: readonly [{
        readonly name: "requestId";
        readonly type: "uint256";
        readonly indexed: true;
    }];
}];
export declare const VRF_COORDINATOR_V2_5_ABI: readonly [{
    readonly type: "function";
    readonly name: "addConsumer";
    readonly inputs: readonly [{
        readonly name: "subId";
        readonly type: "uint256";
    }, {
        readonly name: "consumer";
        readonly type: "address";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "removeConsumer";
    readonly inputs: readonly [{
        readonly name: "subId";
        readonly type: "uint256";
    }, {
        readonly name: "consumer";
        readonly type: "address";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "fundSubscriptionWithNative";
    readonly inputs: readonly [{
        readonly name: "subId";
        readonly type: "uint256";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "payable";
}, {
    readonly type: "function";
    readonly name: "getSubscription";
    readonly inputs: readonly [{
        readonly name: "subId";
        readonly type: "uint256";
    }];
    readonly outputs: readonly [{
        readonly name: "balance";
        readonly type: "uint96";
    }, {
        readonly name: "nativeBalance";
        readonly type: "uint96";
    }, {
        readonly name: "reqCount";
        readonly type: "uint64";
    }, {
        readonly name: "owner";
        readonly type: "address";
    }, {
        readonly name: "consumers";
        readonly type: "address[]";
    }];
    readonly stateMutability: "view";
}];
export declare const EITHERWAY_FUNCTIONS_ABI: readonly [{
    readonly type: "function";
    readonly name: "claimOwnership";
    readonly inputs: readonly [];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "transferHouseOperator";
    readonly inputs: readonly [{
        readonly name: "newOperator";
        readonly type: "address";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "acceptHouseOperator";
    readonly inputs: readonly [];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "houseOperator";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "pendingOperator";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "ownershipClaimed";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "withdrawHouse";
    readonly inputs: readonly [{
        readonly name: "amount";
        readonly type: "uint256";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "claim";
    readonly inputs: readonly [];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "pendingWithdrawals";
    readonly inputs: readonly [{
        readonly name: "recipient";
        readonly type: "address";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "reservedForWithdrawals";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "event";
    readonly name: "OwnershipClaimed";
    readonly inputs: readonly [{
        readonly name: "operator";
        readonly type: "address";
        readonly indexed: true;
    }];
}, {
    readonly type: "event";
    readonly name: "HouseOperatorTransferStarted";
    readonly inputs: readonly [{
        readonly name: "previousOperator";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "newOperator";
        readonly type: "address";
        readonly indexed: true;
    }];
}, {
    readonly type: "event";
    readonly name: "HouseOperatorTransferred";
    readonly inputs: readonly [{
        readonly name: "previousOperator";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "newOperator";
        readonly type: "address";
        readonly indexed: true;
    }];
}, {
    readonly type: "event";
    readonly name: "HouseFunded";
    readonly inputs: readonly [{
        readonly name: "funder";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
    }];
}, {
    readonly type: "event";
    readonly name: "HouseWithdrawn";
    readonly inputs: readonly [{
        readonly name: "operator";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
    }];
}, {
    readonly type: "event";
    readonly name: "WinnerCredited";
    readonly inputs: readonly [{
        readonly name: "winner";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
    }];
}, {
    readonly type: "event";
    readonly name: "Claimed";
    readonly inputs: readonly [{
        readonly name: "recipient";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
    }];
}, {
    readonly type: "error";
    readonly name: "NotHouse";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "AlreadyClaimed";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "NotPendingOperator";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "ZeroAddressNotAllowed";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "ZeroAmount";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "HouseTooLow";
    readonly inputs: readonly [{
        readonly name: "available";
        readonly type: "uint256";
    }, {
        readonly name: "required";
        readonly type: "uint256";
    }];
}, {
    readonly type: "error";
    readonly name: "NothingToClaim";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "TransferFailed";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "Reentrant";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "InvalidCoverageMultiple";
    readonly inputs: readonly [];
}, {
    readonly type: "function";
    readonly name: "s_subscriptionId";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint64";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "s_donId";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "bytes32";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "lastUpdatedAt";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "totalRequests";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "totalFulfilled";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "totalFailed";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "event";
    readonly name: "RequestSent";
    readonly inputs: readonly [{
        readonly name: "requestId";
        readonly type: "bytes32";
        readonly indexed: true;
    }, {
        readonly name: "origin";
        readonly type: "address";
        readonly indexed: true;
    }];
}, {
    readonly type: "event";
    readonly name: "ResponseReceived";
    readonly inputs: readonly [{
        readonly name: "requestId";
        readonly type: "bytes32";
        readonly indexed: true;
    }, {
        readonly name: "response";
        readonly type: "bytes";
    }, {
        readonly name: "err";
        readonly type: "bytes";
    }];
}];
export declare const FUNCTIONS_ROUTER_ABI: readonly [{
    readonly type: "function";
    readonly name: "addConsumer";
    readonly inputs: readonly [{
        readonly name: "subscriptionId";
        readonly type: "uint64";
    }, {
        readonly name: "consumer";
        readonly type: "address";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "removeConsumer";
    readonly inputs: readonly [{
        readonly name: "subscriptionId";
        readonly type: "uint64";
    }, {
        readonly name: "consumer";
        readonly type: "address";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "getSubscription";
    readonly inputs: readonly [{
        readonly name: "subscriptionId";
        readonly type: "uint64";
    }];
    readonly outputs: readonly [{
        readonly type: "tuple";
        readonly name: "subscription";
        readonly components: readonly [{
            readonly name: "balance";
            readonly type: "uint96";
        }, {
            readonly name: "owner";
            readonly type: "address";
        }, {
            readonly name: "blockedBalance";
            readonly type: "uint96";
        }, {
            readonly name: "proposedOwner";
            readonly type: "address";
        }, {
            readonly name: "consumers";
            readonly type: "address[]";
        }, {
            readonly name: "flags";
            readonly type: "bytes32";
        }];
    }];
    readonly stateMutability: "view";
}];
export declare const LINK_TOKEN_ABI: readonly [{
    readonly type: "function";
    readonly name: "approve";
    readonly inputs: readonly [{
        readonly name: "spender";
        readonly type: "address";
    }, {
        readonly name: "amount";
        readonly type: "uint256";
    }];
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "balanceOf";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "transferAndCall";
    readonly inputs: readonly [{
        readonly name: "to";
        readonly type: "address";
    }, {
        readonly name: "value";
        readonly type: "uint256";
    }, {
        readonly name: "data";
        readonly type: "bytes";
    }];
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
    readonly stateMutability: "nonpayable";
}];
export declare const EITHERWAY_AUTOMATION_ABI: readonly [{
    readonly type: "function";
    readonly name: "claimOwnership";
    readonly inputs: readonly [];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "transferHouseOperator";
    readonly inputs: readonly [{
        readonly name: "newOperator";
        readonly type: "address";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "acceptHouseOperator";
    readonly inputs: readonly [];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "houseOperator";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "pendingOperator";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "ownershipClaimed";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "withdrawHouse";
    readonly inputs: readonly [{
        readonly name: "amount";
        readonly type: "uint256";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "claim";
    readonly inputs: readonly [];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "pendingWithdrawals";
    readonly inputs: readonly [{
        readonly name: "recipient";
        readonly type: "address";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "reservedForWithdrawals";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "event";
    readonly name: "OwnershipClaimed";
    readonly inputs: readonly [{
        readonly name: "operator";
        readonly type: "address";
        readonly indexed: true;
    }];
}, {
    readonly type: "event";
    readonly name: "HouseOperatorTransferStarted";
    readonly inputs: readonly [{
        readonly name: "previousOperator";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "newOperator";
        readonly type: "address";
        readonly indexed: true;
    }];
}, {
    readonly type: "event";
    readonly name: "HouseOperatorTransferred";
    readonly inputs: readonly [{
        readonly name: "previousOperator";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "newOperator";
        readonly type: "address";
        readonly indexed: true;
    }];
}, {
    readonly type: "event";
    readonly name: "HouseFunded";
    readonly inputs: readonly [{
        readonly name: "funder";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
    }];
}, {
    readonly type: "event";
    readonly name: "HouseWithdrawn";
    readonly inputs: readonly [{
        readonly name: "operator";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
    }];
}, {
    readonly type: "event";
    readonly name: "WinnerCredited";
    readonly inputs: readonly [{
        readonly name: "winner";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
    }];
}, {
    readonly type: "event";
    readonly name: "Claimed";
    readonly inputs: readonly [{
        readonly name: "recipient";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
    }];
}, {
    readonly type: "error";
    readonly name: "NotHouse";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "AlreadyClaimed";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "NotPendingOperator";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "ZeroAddressNotAllowed";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "ZeroAmount";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "HouseTooLow";
    readonly inputs: readonly [{
        readonly name: "available";
        readonly type: "uint256";
    }, {
        readonly name: "required";
        readonly type: "uint256";
    }];
}, {
    readonly type: "error";
    readonly name: "NothingToClaim";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "TransferFailed";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "Reentrant";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "InvalidCoverageMultiple";
    readonly inputs: readonly [];
}, {
    readonly type: "function";
    readonly name: "INTERVAL";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "lastRun";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "totalRuns";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "getTimeUntilNextRun";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "event";
    readonly name: "TaskRan";
    readonly inputs: readonly [{
        readonly name: "runNumber";
        readonly type: "uint256";
        readonly indexed: true;
    }, {
        readonly name: "timestamp";
        readonly type: "uint256";
    }];
}];
export declare const AUTOMATION_REGISTRAR_ABI: readonly [{
    readonly type: "function";
    readonly name: "registerUpkeep";
    readonly inputs: readonly [{
        readonly type: "tuple";
        readonly name: "requestParams";
        readonly components: readonly [{
            readonly name: "name";
            readonly type: "string";
        }, {
            readonly name: "encryptedEmail";
            readonly type: "bytes";
        }, {
            readonly name: "upkeepContract";
            readonly type: "address";
        }, {
            readonly name: "gasLimit";
            readonly type: "uint32";
        }, {
            readonly name: "adminAddress";
            readonly type: "address";
        }, {
            readonly name: "triggerType";
            readonly type: "uint8";
        }, {
            readonly name: "checkData";
            readonly type: "bytes";
        }, {
            readonly name: "triggerConfig";
            readonly type: "bytes";
        }, {
            readonly name: "offchainConfig";
            readonly type: "bytes";
        }, {
            readonly name: "amount";
            readonly type: "uint96";
        }];
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "event";
    readonly name: "RegistrationApproved";
    readonly inputs: readonly [{
        readonly name: "hash";
        readonly type: "bytes32";
        readonly indexed: true;
    }, {
        readonly name: "displayName";
        readonly type: "string";
    }, {
        readonly name: "upkeepId";
        readonly type: "uint256";
        readonly indexed: true;
    }];
}];
export declare const AUTOMATION_REGISTRY_ABI: readonly [{
    readonly type: "function";
    readonly name: "getUpkeep";
    readonly inputs: readonly [{
        readonly name: "id";
        readonly type: "uint256";
    }];
    readonly outputs: readonly [{
        readonly type: "tuple";
        readonly components: readonly [{
            readonly name: "target";
            readonly type: "address";
        }, {
            readonly name: "performGas";
            readonly type: "uint32";
        }, {
            readonly name: "checkData";
            readonly type: "bytes";
        }, {
            readonly name: "balance";
            readonly type: "uint96";
        }, {
            readonly name: "admin";
            readonly type: "address";
        }, {
            readonly name: "maxValidBlocknumber";
            readonly type: "uint64";
        }, {
            readonly name: "lastPerformedBlockNumber";
            readonly type: "uint32";
        }, {
            readonly name: "amountSpent";
            readonly type: "uint96";
        }, {
            readonly name: "paused";
            readonly type: "bool";
        }, {
            readonly name: "offchainConfig";
            readonly type: "bytes";
        }];
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "addFunds";
    readonly inputs: readonly [{
        readonly name: "id";
        readonly type: "uint256";
    }, {
        readonly name: "amount";
        readonly type: "uint96";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "pauseUpkeep";
    readonly inputs: readonly [{
        readonly name: "id";
        readonly type: "uint256";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "unpauseUpkeep";
    readonly inputs: readonly [{
        readonly name: "id";
        readonly type: "uint256";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "cancelUpkeep";
    readonly inputs: readonly [{
        readonly name: "id";
        readonly type: "uint256";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}];
export declare const INSUFFICIENT_BALANCE_SELECTOR: "0xf4d678b8";
export declare const CHAINLINK_GAS_CAPS: {
    readonly claimOwnership: 80000n;
    readonly transferHouseOperator: 60000n;
    readonly acceptHouseOperator: 80000n;
    readonly withdrawHouse: 80000n;
    readonly claim: 100000n;
    readonly retrySettlement: 250000n;
    readonly fundHouse: 60000n;
    readonly vrfAddConsumer: 120000n;
    readonly vrfFundNative: 100000n;
    readonly vrfRequest: 250000n;
    readonly functionsAddConsumer: 120000n;
    readonly functionsFundLINK: 200000n;
    readonly functionsSendRequest: 500000n;
    readonly automationRegister: 500000n;
    readonly automationAddFunds: 120000n;
    readonly automationApproveLINK: 80000n;
};
export type ChainlinkGasKey = keyof typeof CHAINLINK_GAS_CAPS;
