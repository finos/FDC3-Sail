import { AppIdentifier, Channel, IntentResolution, IntentResult, Listener, PrivateChannel, DesktopAgent } from '@finos/fdc3';
import { AppControlContext } from '../../context-types';
export declare class RaiseIntentControl {
    private readonly fdc3;
    constructor(fdc3: DesktopAgent);
    receiveContext(contextType: string, waitTime?: number, count?: number): Promise<AppControlContext>;
    openIntentApp(appId: string): Promise<AppIdentifier>;
    createAppChannel(channelId: string): Promise<Channel>;
    createPrivateChannel(): Promise<PrivateChannel>;
    validatePrivateChannel(privChan: PrivateChannel): void;
    raiseIntent(intent: string, contextType: string, appIdentifier?: AppIdentifier, delayBeforeReturn?: number, contextId?: {
        [key: string]: string;
    }): Promise<IntentResolution>;
    findInstances(appId: string): Promise<AppIdentifier[]>;
    getIntentResult(intentResolution: IntentResolution): Promise<IntentResult>;
    failIfResponseTimesOut(): number;
    privateChannelBroadcast(privateChannel: PrivateChannel, contextType: string): Promise<void>;
    validateIntentResult(intentResult: IntentResult, expectedIntentResultType: IntentResultType, expectedContextType?: string): void;
    validateInstances(instances: AppIdentifier[], expectedInstanceCount: number, expectedInstanceId?: string, returnedInstanceId?: string): void;
    validateIntentResolution: (appId: string, intentResolution: IntentResolution) => void;
    listenForError(): Promise<Listener>;
    receiveContextStreamFromMockApp(privChannel: PrivateChannel, streamedNumberStart: number, streamedNumberEnd: number): Promise<Listener>;
    unsubscribeListener(listener: Listener): void;
    disconnectPrivateChannel(privateChannel: PrivateChannel): void;
}
export declare enum IntentResultType {
    Channel = "Channel",
    PrivateChannel = "PrivateChannel",
    Context = "Context",
    Void = "Void"
}
export declare enum IntentApp {
    IntentAppA = "IntentAppAId",
    IntentAppB = "IntentAppBId",
    IntentAppC = "IntentAppCId",
    IntentAppD = "IntentAppDId",
    IntentAppE = "IntentAppEId",
    IntentAppF = "IntentAppFId",
    IntentAppG = "IntentAppGId",
    IntentAppH = "IntentAppHId",
    IntentAppI = "IntentAppIId",
    IntentAppJ = "IntentAppJId",
    IntentAppK = "IntentAppKId",
    IntentAppL = "IntentAppLId"
}
export declare enum ContextType {
    testContextX = "testContextX",
    testContextY = "testContextY",
    testContextZ = "testContextZ",
    testContextL = "testContextL",
    nonExistentContext = "nonExistentContext",
    privateChannelDetails = "privateChannelDetails"
}
export declare enum ControlContextType {
    CONTEXT_RECEIVED = "context-received",
    ERROR = "error",
    A_TESTING_INTENT_LISTENER_TRIGGERED = "aTestingIntent-listener-triggered",
    INTENT_APP_A_OPENED = "intent-app-a-opened",
    SHARED_TESTING_INTENT1_LISTENER_TRIGGERED = "sharedTestingIntent1-listener-triggered",
    SHARED_TESTING_INTENT_2_RESULT_SENT = "sharedTestingIntent2-result-sent",
    ON_UNSUBSCRIBE_TRIGGERED = "onUnsubscribeTriggered",
    ON_DISCONNECT_TRIGGERED = "onDisconnectTriggered",
    CONTEXT_LISTENER_TRIGGERED = "context-listener-triggered",
    INTENT_LISTENER_TRIGGERED = "intent-listener-triggered"
}
export declare enum Intent {
    aTestingIntent = "aTestingIntent",
    bTestingIntent = "bTestingIntent",
    cTestingIntent = "cTestingIntent",
    kTestingIntent = "kTestingIntent",
    lTestingIntent = "LTestingIntent",
    sharedTestingIntent1 = "sharedTestingIntent1",
    sharedTestingIntent2 = "sharedTestingIntent2",
    privateChannelIsPrivate = "privateChannelIsPrivate"
}
