import { AppIdentifier, IntentResolution, AppIntent, AppMetadata, Channel, Context, DesktopAgent, EventHandler, FDC3EventTypes, ImplementationMetadata, Intent, IntentHandler, Listener, PrivateChannel } from "@finos/fdc3";
import { getAgent as fdc3GetAgent } from "@finos/fdc3";

/**
 * An instance of this class is handed to every iframe or window loaded by electron.
 * If any FDC3 function is called on it, it performs the getAgent process and acts as a proxy.
 * 
 */
export const fdc3 = {

    _agent: null as any,

    getAgent(): Promise<DesktopAgent> {
        if (this._agent == null) {
            console.log("Getting agent");
            this._agent = fdc3GetAgent();
        }

        return this._agent;
    },


    async open(appOrName: AppIdentifier | string, context?: Context): Promise<AppIdentifier> {
        return (await this.getAgent()).open(appOrName as any, context);
    },

    async findIntent(intent: Intent, context?: Context, resultType?: string): Promise<AppIntent> {
        return (await this.getAgent()).findIntent(intent, context, resultType);
    },

    async findIntentsByContext(context: Context, resultType?: string): Promise<Array<AppIntent>> {
        return (await this.getAgent()).findIntentsByContext(context, resultType);
    },

    async findInstances(app: AppIdentifier): Promise<Array<AppIdentifier>> {
        return (await this.getAgent()).findInstances(app);
    },

    async broadcast(context: Context): Promise<void> {
        return (await this.getAgent()).broadcast(context);
    },

    async raiseIntent(intent: Intent, context: Context, name?: any): Promise<IntentResolution> {
        return (await this.getAgent()).raiseIntent(intent, context, name);
    },

    async raiseIntentForContext(context: any, name?: any): Promise<IntentResolution> {
        return (await this.getAgent()).raiseIntentForContext(context, name);
    },

    async addIntentListener(intent: Intent, handler: IntentHandler): Promise<Listener> {
        return (await this.getAgent()).addIntentListener(intent, handler);
    },

    async addContextListener(contextType: any, handler?: any): Promise<Listener> {
        return (await this.getAgent()).addContextListener(contextType, handler);
    },

    async addEventListener(type: FDC3EventTypes | null, handler: EventHandler): Promise<Listener> {
        return (await this.getAgent()).addEventListener(type, handler);
    },

    async getUserChannels(): Promise<Array<Channel>> {
        return (await this.getAgent()).getUserChannels();
    },

    async joinUserChannel(channelId: string): Promise<void> {
        return (await this.getAgent()).joinUserChannel(channelId);
    },

    async getOrCreateChannel(channelId: string): Promise<Channel> {
        return (await this.getAgent()).getOrCreateChannel(channelId);
    },

    async createPrivateChannel(): Promise<PrivateChannel> {
        return (await this.getAgent()).createPrivateChannel();
    },

    async getCurrentChannel(): Promise<Channel | null> {
        return (await this.getAgent()).getCurrentChannel();
    },

    async leaveCurrentChannel(): Promise<void> {
        return (await this.getAgent()).leaveCurrentChannel();
    },

    async getInfo(): Promise<ImplementationMetadata> {
        console.log("hello")
        return (await this.getAgent()).getInfo();
    },

    async getAppMetadata(app: AppIdentifier): Promise<AppMetadata> {
        return (await this.getAgent()).getAppMetadata(app);
    },

    async getSystemChannels(): Promise<Array<Channel>> {
        return (await this.getAgent()).getSystemChannels();
    },

    async joinChannel(channelId: string): Promise<void> {
        return (await this.getAgent()).joinChannel(channelId);
    },
}