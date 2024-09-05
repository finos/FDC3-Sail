import { DirectoryApp } from "@kite9/da-server";
import { getClientState } from "./clientState";
import { DA_HELLO, DesktopAgentHelloArgs, SAIL_APP_OPEN, SAIL_CHANNEL_CHANGE, SAIL_INTENT_RESOLVE, SailAppOpen, SailChannelChange, SailIntentResolve } from "../../server/da/message-types";
import { io, Socket } from "socket.io-client"
import { AppIdentifier, ResolveError } from "@kite9/fdc3";

export interface ServerState {

    getApplications(): Promise<DirectoryApp[]>

    /**
     *  Returns the instance ID for a new application
     */
    registerAppLaunch(appId: string): Promise<string>

    registerDesktopAgent(props: DesktopAgentHelloArgs): Promise<void>

    setAppChannel(instanceId: string, channel: string): Promise<void>

    intentChosen(ai: AppIdentifier | null, intent: string | null): Promise<void>
}

class ServerStateImpl implements ServerState {

    socket: Socket | null = null
    resolveCallback: any

    async getApplications(): Promise<DirectoryApp[]> {
        const userSessionId = getClientState().getUserSessionID()
        return await fetch("/apps?" + new URLSearchParams({ userSessionId }).toString())
            .then((response) => response.json())
            .then(o => o as DirectoryApp[]);
    }

    async registerAppLaunch(appId: string): Promise<string> {
        const userSessionId = getClientState().getUserSessionID()
        const response = await fetch("/registerAppLaunch", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ appId, userSessionId })
        })

        const json = await response.json()
        return json.instanceId
    }

    async registerDesktopAgent(props: DesktopAgentHelloArgs): Promise<void> {
        // the socket is used for messages returning from the desktop
        // agent server to the client, such as requests to change
        // the user channel, open a new app, resolve an intent, etc.
        this.socket = io()
        const cs = getClientState()
        this.socket.on("connect", () => {
            this.socket?.emit(DA_HELLO, props)

            this.socket?.on(SAIL_APP_OPEN, (data: SailAppOpen) => {
                console.log(`SAIL_APP_OPEN: ${JSON.stringify(data)}`)
                cs.newPanel(data.detail, data.instanceId)
            })

            this.socket?.on(SAIL_CHANNEL_CHANGE, (data: SailChannelChange) => {
                console.log(`SAIL_CHANNEL_CHANGE: ${JSON.stringify(data)}`)
            })

            this.socket?.on(SAIL_INTENT_RESOLVE, (data: SailIntentResolve, callback) => {
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