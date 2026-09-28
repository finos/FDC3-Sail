import { Channel, Context, Listener, DesktopAgent } from '@finos/fdc3';
import { ChannelControl } from '../support/channel-control';
export declare class ChannelControlImpl implements ChannelControl {
    private readonly testAppChannelName;
    private readonly fdc3;
    constructor(fdc3: DesktopAgent);
    getNonGlobalUserChannels: () => Promise<Channel[]>;
    getNonGlobalUserChannel: () => Promise<Channel>;
    leaveChannel: () => Promise<void>;
    joinChannel: (channel: Channel) => Promise<void>;
    createRandomTestChannel: () => Promise<Channel>;
    getCurrentChannel: () => Promise<Channel | null>;
    unsubscribeListeners: (listeners: Listener[]) => Promise<void>;
    initCompleteListener: (testId: string) => Promise<import("../../context-types").AppControlContext>;
    openChannelApp: (testId: string, channelId: string, commands: string[], historyItems?: number, notify?: boolean, contextId?: string) => Promise<void>;
    closeMockApp(testId: string): Promise<void>;
    setupAndValidateListener: (channel: Channel | null, listenContextType: string | null, expectedContextType: string | null, errorMessage: string, onComplete: (ctx: Context) => void) => Promise<Listener>;
    setupContextChecker: (channel: Channel, requestedContextType: string | null, expectedContextType: string, errorMessage: string, onComplete: (ctx: Context) => void) => Promise<void>;
    getRandomId(): string;
}
