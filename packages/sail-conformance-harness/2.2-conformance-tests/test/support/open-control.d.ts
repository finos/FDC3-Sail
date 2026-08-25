import { AppIdentifier, Context } from '@finos/fdc3';
export interface OpenControl {
    openMockApp(targetApp: AppIdentifier, context?: Context): void;
    closeMockApp(testId: string): Promise<void>;
    createTargetAppIdentifier(appId?: string): AppIdentifier;
    contextReceiver(contextType: string, expectNotToReceiveContext?: boolean): Promise<Context>;
    addListenerAndFailIfReceived(): Promise<void>;
    confirmAppNotFoundErrorReceived(exception: unknown): void;
    validateReceivedContext(contextReceiver: Context, expectedContextType: string): Promise<void>;
    expectAppTimeoutErrorOnOpen(appId: AppIdentifier): Promise<void>;
}
export declare const openApp: {
    a: {
        name: string;
        id: string;
    };
    b: {
        name: string;
        id: string;
    };
    c: {
        name: string;
        id: string;
    };
    d: {
        id: string;
    };
    e: {
        id: string;
    };
    f: {
        name: string;
        id: string;
    };
};
export type OpenCommonConfig = {
    target: string;
    targetMultiple: string;
};
