import { DirectoryApp } from "@kite9/fdc3-web-impl";
import { getClientState } from "./clientState";
import { DA_DIRECTORY_LISTING, DA_HELLO, DA_REGISTER_APP_LAUNCH, DesktopAgentDirectoryListingArgs, DesktopAgentHelloArgs, DesktopAgentRegisterAppLaunchArgs, SAIL_APP_OPEN, SAIL_CHANNEL_CHANGE, SAIL_INTENT_RESOLVE, SailAppOpenArgs, SailChannelChangeArgs, SailIntentResolveArgs } from "../../server/da/message-types";
import { io, Socket } from "socket.io-client"
import { AppIdentifier, ResolveError } from "@kite9/fdc3";
import { getAppState } from "./AppState";

export interface ServerState {

    /**
     * Call on startup to register the desktop agent with the server
     */
    registerDesktopAgent(props: DesktopAgentHelloArgs): Promise<void>

    /**
     * Called when an application begins the WCP handshake process.
     * Returns the instance ID of the app.
     */
    registerAppLaunch(appId: string): Promise<string>

    getApplications(): Promise<DirectoryApp[]>

    setAppChannel(instanceId: string, channel: string): Promise<void>

    intentChosen(ai: AppIdentifier | null, intent: string | null): Promise<void>
}

class ServerStateImpl implements ServerState {

    socket: Socket | null = null
    resolveCallback: any

    async getApplications(): Promise<DirectoryApp[]> {
        if (!this.socket) {
            throw new Error("Desktop Agent not registered")
        }

        const userSessionId = getClientState().getUserSessionID()
        const response = await this.socket.emitWithAck(DA_DIRECTORY_LISTING, { userSessionId } as DesktopAgentDirectoryListingArgs)
        return response as DirectoryApp[]
    }

    async registerAppLaunch(appId: string): Promise<string> {
        if (!this.socket) {
            throw new Error("Desktop Agent not registered")
        }

        const userSessionId = getClientState().getUserSessionID()
        const instanceId: string = await this.socket.emitWithAck(DA_REGISTER_APP_LAUNCH, { userSessionId, appId } as DesktopAgentRegisterAppLaunchArgs)
        return instanceId
    }

    async registerDesktopAgent(props: DesktopAgentHelloArgs): Promise<void> {
        // the socket is used for messages returning from the desktop
        // agent server to the client, such as requests to change
        // the user channel, open a new app, resolve an intent, etc.
        this.socket = io()
        const cs = getClientState()
        this.socket.on("connect", () => {
            this.socket?.emit(DA_HELLO, props)

            this.socket?.on(SAIL_APP_OPEN, async (data: SailAppOpenArgs, callback) => {
                console.log(`SAIL_APP_OPEN: ${JSON.stringify(data)}`)
                const instanceId = await getAppState().open(data.appDRecord)
                callback(instanceId)
            })

            this.socket?.on(SAIL_CHANNEL_CHANGE, (data: SailChannelChangeArgs) => {
                console.log(`SAIL_CHANNEL_CHANGE: ${JSON.stringify(data)}`)
            })

            this.socket?.on(SAIL_INTENT_RESOLVE, (data: SailIntentResolveArgs, callback) => {
                console.log(`SAIL_INTENT_RESOLVE: ${JSON.stringify(data)}`)
                cs.setIntentResolution({
                    appIntents: data.appIntents,
                    context: data.context,
                    requestId: '1234'
                })

                this.resolveCallback = callback
            })

        })
    }

    async setAppChannel(instanceId: string): Promise<void> {
        const userSessionId = getClientState().getUserSessionID()
        await fetch("/setAppChannel", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                instanceId,
                userSessionId
            })
        })
    }

    async intentChosen(ai: AppIdentifier | null, intent: string | null): Promise<void> {
        if (this.resolveCallback) {
            if (ai && intent) {
                this.resolveCallback([
                    {
                        intent: {
                            name: intent,
                        },
                        apps: [
                            ai
                        ]
                    }
                ])
            } else {
                this.resolveCallback([], ResolveError.UserCancelled)
            }
        }
    }
}

const theServerState = new ServerStateImpl()

export function getServerState(): ServerState {
    return theServerState
}