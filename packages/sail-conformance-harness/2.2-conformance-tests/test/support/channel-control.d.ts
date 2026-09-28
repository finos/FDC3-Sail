import { Context, Channel, Listener } from '@finos/fdc3';
/**
 * This interface wraps channel functionality
 */
export interface ChannelControl {
    getNonGlobalUserChannels(): Promise<Channel[]>;
    leaveChannel(): Promise<void>;
    getNonGlobalUserChannel(): Promise<Channel>;
    joinChannel(channel: Channel): Promise<void>;
    createRandomTestChannel(): Promise<Channel>;
    getCurrentChannel(): Promise<Channel | null>;
    unsubscribeListeners(listeners: Listener[]): void;
    openChannelApp(testId: string, channelId: string, commands: string[], historyItems?: number, notify?: boolean, contextId?: string): Promise<void>;
    closeMockApp(testId: string): Promise<void>;
    initCompleteListener(testId: string): Promise<Context>;
    setupAndValidateListener(channel: Channel | null, listenContextType: string | null, expectedContextType: string | null, errorMessage: string, onComplete: (ctx: Context) => void): Promise<Listener>;
    setupContextChecker(channel: Channel, requestedContextType: string | null, expectedContextType: string, errorMessage: string, onComplete: (ctx: Context) => void): Promise<void>;
    getRandomId(): string;
}
export type ChannelsAppContext = Context & {
    commands: string[];
    config: {
        testId: string;
        notifyAppAOnCompletion: boolean;
        historyItems: number;
        channelId: string;
        contextId?: string;
    };
};
export type ChannelsAppConfig = {
    testId: string;
    notifyAppAOnCompletion?: boolean;
    historyItems?: number;
    channelId: string;
    contextId?: string;
};
export declare const commands: {
    joinRetrievedUserChannel: string;
    retrieveTestAppChannel: string;
    broadcastInstrumentContext: string;
    broadcastContactContext: string;
};
export declare const APP_CHANNEL_AND_BROADCAST: string[];
export declare const APP_CHANNEL_AND_BROADCAST_TWICE: string[];
export declare const JOIN_AND_BROADCAST: string[];
export declare const JOIN_AND_BROADCAST_TWICE: string[];
