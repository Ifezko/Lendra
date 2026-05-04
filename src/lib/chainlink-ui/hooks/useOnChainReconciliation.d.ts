export declare function useOnChainReconciliation<T>(opts: {
    enabled: boolean;
    read: () => Promise<T>;
    isResolved: (value: T) => boolean;
    onResolved: (value: T) => void;
    intervalMs?: number;
    timeoutMs?: number;
    onTimeout?: () => void;
}): {
    lastValue: T | null;
};
