export declare function failAfterTimeout(timeoutMs?: number): Promise<void>;
export declare function wait(timeoutMs?: number): Promise<void>;
export declare function wrapPromise(): {
    promise: Promise<void>;
    resolve: () => void;
    reject: (reason?: unknown) => void;
};
export declare function handleFail(documentation: string, ex: unknown): never;
/**
 * Checks whether a received appId matches an expected unqualified appId.
 * Accepts either an exact match (e.g. 'MockAppId') or a fully qualified
 * appId with the current hostname (e.g. 'MockAppId@localhost').
 */
export declare function appIdMatches(received: string, expected: string): boolean;
