import { AppIdentifier, Context, DesktopAgent } from '@finos/fdc3';
import { ContextSender } from '../../mock/general';
import { OpenControl } from './open-control';
export declare class OpenControlImpl implements OpenControl {
    private readonly fdc3;
    constructor(fdc3: DesktopAgent);
    contextReceiver: (contextType: string) => Promise<Context>;
    openMockApp: (targetApp: AppIdentifier, context?: Context) => Promise<AppIdentifier>;
    closeMockApp(testId: string): Promise<void>;
    createTargetAppIdentifier(appId: string): {
        appId: string;
    };
    addListenerAndFailIfReceived: () => Promise<void>;
    confirmAppNotFoundErrorReceived: (exception: unknown) => void;
    validateReceivedContext: (context: ContextSender, expectedContextType: string) => Promise<void>;
    expectAppTimeoutErrorOnOpen: (targetApp: AppIdentifier) => Promise<void>;
}
