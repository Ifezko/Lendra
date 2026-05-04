export interface GasPriceOverride {
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
}
export declare function getBumpedFees(publicClient: any): Promise<GasPriceOverride>;
