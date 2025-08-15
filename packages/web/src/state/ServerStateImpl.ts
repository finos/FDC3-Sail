import { DirectoryApp } from "@finos/fdc3-web-impl";
import { io, Socket } from "socket.io-client"
import { AppIdentifier, ResolveError } from "@finos/fdc3-standard";
import { HandshakeMessages, AppManagementMessages, IntentMessages, ChannelMessages, ContextMessages, DesktopAgentDirectoryListingArgs, DesktopAgentHelloArgs, DesktopAgentRegisterAppLaunchArgs, SailAppOpenArgs, SailAppOpenResponse, SailAppStateArgs, SailBroadcastContextArgs, SailChannelChangeArgs, SailClientStateArgs, SailIntentResolveArgs, SailIntentResolveResponse } from "@finos/fdc3-sail-shared";
import { AppHosting } from "@finos/fdc3-sail-shared";
import { ServerState } from "../types";
import { AppState } from "../types";
import { WebClientState } from "../types";

export class ServerStateImpl implements ServerState {

    socket: Socket | null = null
    resolveCallback: (x: SailIntentResolveResponse) => void = () => { }
    cs: WebClientState | null = null
    as: AppState | null = null

    init(cs: WebClientState, as: AppState): void {
        if (this.cs == null) {
            this.cs = cs;
            this.as = as;
        }
    }

    async getApplications(): Promise<DirectoryApp[]> {
        if (!this.socket) {
            throw new Error("Desktop Agent not registered")
        }

        const userSessionId = this.cs!.getUserSessionID()
        const response = await this.socket.emitWithAck(AppManagementMessages.DA_DIRECTORY_LISTING, { userSessionId } as DesktopAgentDirectoryListingArgs)
        const out = response as DirectoryApp[]
        this.cs!.setKnownApps(out).catch(e => {
            console.error("Error setting known apps", e)
        })
        return out
    }

    async registerAppLaunch(appId: string, hosting: AppHosting, channel: string | null, instanceTitle: string): Promise<string> {
        if (!this.socket) {
            throw new Error("Desktop Agent not registered")
        }

        const userSessionId = this.cs!.getUserSessionID()
        const instanceId: string = await this.socket.emitWithAck(AppManagementMessages.DA_REGISTER_APP_LAUNCH, { userSessionId, appId, hosting, channel, instanceTitle } as DesktopAgentRegisterAppLaunchArgs)
        return instanceId
    }

    async sendClientState(cs: SailClientStateArgs): Promise<void> {
        if (!this.socket) {
            return
        }

        await this.socket.emitWithAck(HandshakeMessages.SAIL_CLIENT_STATE, cs)
    }

    registerDesktopAgent(props: DesktopAgentHelloArgs): Promise<void> {
        // the socket is used for messages returning from the desktop
        // agent server to the client, such as requests to change
        // the user channel, open a new app, resolve an intent, etc.
        this.socket = io()
        this.socket.on("connect", () => {
            this.socket?.emit(HandshakeMessages.DA_HELLO, props, () => {
                this.sendClientState(this.cs!.createArgs()).then(async () => {
                    await this.getApplications()
                }).catch(e => {
                    console.error("Error sending client state", e)
                })
            })

            this.socket?.on(AppManagementMessages.SAIL_APP_OPEN, async (data: SailAppOpenArgs, callback: (response: SailAppOpenResponse) => void) => {
                //console.log(`SAIL_APP_OPEN: ${JSON.stringify(data)}`)
                if (data.channel) {
                    // opening in a panel inside sail
                    await this.cs?.setActiveTabId(data.channel)
                    const openDetails = await this.as!.open(data.appDRecord, AppHosting.Frame)
                    callback(openDetails)
                } else {
                    // opening in a new tab
                    const openDetails = await this.as!.open(data.appDRecord, AppHosting.Tab)
                    callback(openDetails)
                }
            })

            this.socket?.on(AppManagementMessages.SAIL_APP_STATE, (data: SailAppStateArgs) => {
                //console.log(`SAIL_APP_STATE: ${JSON.stringify(data)}`)
                this.as!.setAppState(data)
            })

            this.socket?.on(ChannelMessages.SAIL_CHANNEL_SETUP, async (instanceId: string) => {
                //console.log(`SAIL_CHANNEL_SETUP: ${instanceId}`)
                const panel = this.cs!.getPanels().find(p => p.panelId === instanceId)
                if (panel) {
                    await this.setUserChannel(instanceId, panel.tabId)
                }
            })

            this.socket?.on(IntentMessages.SAIL_INTENT_RESOLVE, (data: SailIntentResolveArgs, callback) => {
                console.log(`SAIL_INTENT_RESOLVE: ${JSON.stringify(data)}`)
                this.cs!.setIntentResolution({
                    appIntents: data.appIntents,
                    context: data.context,
                    requestId: data.requestId
                })

                this.resolveCallback = callback
            })

            this.socket?.on(ContextMessages.SAIL_BROADCAST_CONTEXT, (data: SailBroadcastContextArgs) => {
                console.log(`SAIL_BROADCAST_CONTEXT: ${JSON.stringify(data)}`)
                this.cs!.appendContextHistory(data.channelId, data.context)
            })
        })

        return Promise.resolve()
    }

    async setUserChannel(instanceId: string, channelId: string): Promise<void> {
        await this.socket?.emitWithAck(ChannelMessages.SAIL_CHANNEL_CHANGE, {
            instanceId,
            channel: channelId,
            userSessionId: this.cs!.getUserSessionID()
        } as SailChannelChangeArgs)
    }

    intentChosen(requestId: string, ai: AppIdentifier | null, intent: string | null, channel: string | null) {
        if (this.resolveCallback) {
            if (ai && intent) {
                this.resolveCallback({
                    appIntents: [
                        {
                            intent: {
                                name: intent,
                            },
                            apps: [
                                ai
                            ]
                        }
                    ],
                    channel,
                    requestId,
                    error: null
                })
            } else {
                this.resolveCallback({
                    appIntents: [],
                    channel: null,
                    requestId,
                    error: ResolveError.UserCancelled
                })
            }
        }
    }
}
