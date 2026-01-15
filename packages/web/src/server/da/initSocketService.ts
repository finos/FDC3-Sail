import { AppHosting, DA_DIRECTORY_LISTING, APP_HELLO, DesktopAgentDirectoryListingArgs, AppHelloArgs, DA_HELLO, DesktopAgentHelloArgs, FDC3_APP_EVENT, SAIL_CHANNEL_CHANGE, SailChannelChangeArgs, SAIL_APP_STATE, SAIL_CLIENT_STATE, DesktopAgentRegisterAppLaunchArgs, DA_REGISTER_APP_LAUNCH, SailHostManifest, ELECTRON_HELLO, ElectronHelloArgs, ElectronAppResponse, ElectronDAResponse, SailClientStateArgs, CHANNEL_RECEIVER_UPDATE, ChannelReceiverUpdate, CHANNEL_RECEIVER_HELLO, ChannelReceiverHelloRequest, SAIL_INTENT_RESOLVE_ON_CHANNEL, SailIntentResolveOpenChannelArgs } from "@finos/fdc3-sail-common";
import { Socket, Server } from "socket.io";
import { SailFDC3ServerFactory } from "./SailFDC3ServerFactory";
import { v4 as uuid } from 'uuid'
import { State, WebAppDetails } from "@finos/fdc3-sail-da-impl";
import { BrowserTypes } from "@finos/fdc3";
import { BroadcastRequest } from "@finos/fdc3-schema/dist/generated/api/BrowserTypes";
import { SailData, SailFDC3ServerInstance } from "./SailFDC3ServerInstance";

export const DEBUG_MODE = true

enum SocketType { DESKTOP_AGENT, APP, CHANNEL }

/* eslint-disable  @typescript-eslint/no-explicit-any */

let debugReconnectionNumber = 0;

export function getSailUrl(): string {
    return process.env.SAIL_URL || "http://localhost:8090"
}

export function initSocketService(httpServer: any, factory: SailFDC3ServerFactory): Server {

    const io = new Server(httpServer)

    io.on('connection', (socket: Socket) => {

        let fdc3ServerInstance: SailFDC3ServerInstance | undefined = undefined
        let userSessionId: string | undefined
        let appInstanceId: string | undefined
        let type: SocketType | undefined = undefined

        socket.on(ELECTRON_HELLO, function (props: ElectronHelloArgs, callback: (success: any, err?: string) => void) {
            console.log("SAIL ELECTRON HELLO: " + JSON.stringify(props))
            let fdc3Server = factory.getSession(props.userSessionId)

            if (fdc3Server) {
                const allApps = fdc3Server.getDirectory().retrieveAppsByUrl(props.url)

                if (allApps.length > 0) {
                    console.log("SAIL Found app", allApps[0].appId)
                    callback({
                        type: 'app',
                        userSessionId: userSessionId,
                        appId: allApps[0].appId,
                        instanceId: 'sail-app-' + uuid(),
                        intentResolver: null,
                        channelSelector: null
                    } as ElectronAppResponse)
                } else {
                    console.error("App not found", props.url)
                    callback(null, "App not found")
                }
            } else if (props.url == getSailUrl()) {
                userSessionId = props.userSessionId
                fdc3Server = factory.createInstance(socket, props)

                callback({
                    type: 'da',
                } as ElectronDAResponse)
            } else {
                console.error("Session not found", userSessionId)
            }
        })

        socket.on(DA_HELLO, function (props: DesktopAgentHelloArgs, callback: (success: any, err?: string) => void) {
            console.log("SAIL DA HELLO:" + JSON.stringify(props))

            type = SocketType.DESKTOP_AGENT
            userSessionId = props.userSessionId
            console.log("SAIL Desktop Agent Connecting", userSessionId)
            let fdc3Server = factory.getSession(userSessionId)

            if (fdc3Server) {
                // reconfiguring current session
                fdc3Server = factory.createInstance(socket, props)
                console.log("SAIL updated desktop agent channels and directories", factory.getSessionCount(), props.userSessionId)
                callback(true)
            } else {
                // starting session
                fdc3Server = factory.createInstance(socket, props)
                console.log("SAIL created agent session.  Running sessions ", factory.getSessionCount(), props.userSessionId)
                callback(true)
            }

            fdc3ServerInstance = fdc3Server
        })

        socket.on(DA_DIRECTORY_LISTING, async function (props: DesktopAgentDirectoryListingArgs, callback: (success: any, err?: string) => void) {
            const userSessionId = props.userSessionId
            const session = factory.getSession(userSessionId)
            if (session) {
                callback(session?.getDirectory().allApps)
            } else {
                console.error("Session not found", userSessionId)
                callback(null, "Session not found")
            }
        })

        socket.on(DA_REGISTER_APP_LAUNCH, async function (props: DesktopAgentRegisterAppLaunchArgs, callback: (success: any, err?: string) => void) {
            console.log("SAIL DA REGISTER APP LAUNCH: " + JSON.stringify(props))

            const { appId, userSessionId } = props
            const session = factory.getSession(userSessionId)
            if (session) {
                const instanceId = 'sail-app-' + uuid()
                session.setInstanceDetails(instanceId, {
                    instanceId: instanceId,
                    state: State.Pending,
                    appId,
                    hosting: props.hosting,
                    channel: props.channel,
                    instanceTitle: props.instanceTitle,
                    channelSockets: []
                })
                console.log("SAIL Registered app", appId, instanceId)
                callback(instanceId)
            } else {
                console.error("SAIL Session not found", userSessionId)
                callback(null, "Session not found")
            }
        })

        socket.on(SAIL_CLIENT_STATE, async function (props: SailClientStateArgs, callback: (success: any, err?: string) => void) {
            console.log("SAIL CLIENT STATE: " + JSON.stringify(props))
            const session = factory.getSession(props.userSessionId)
            if (session) {
                session.reloadAppDirectories(props.directories, props.customApps);
                session.updateChannelData(props.channels)

                // tell each app to check for a channel change
                props.panels.forEach((panel) => {
                    // make sure apps channels match to the client
                    const state = session.getInstanceDetails(panel.panelId)
                    if (state) {
                        const newChannel = panel.tabId
                        const existingChannel = state.channel
                        state.instanceTitle = panel.title
                        if (newChannel !== existingChannel) {
                            session.notifyUserChannelsChanged(panel.panelId, newChannel)
                        }
                    }
                })

                // ok now make sure that apps in tabs have the up-to-date set of channels
                session.getConnectedApps().then(connectedApps => {
                    connectedApps.forEach(app => {
                        const state = session.getInstanceDetails(app.instanceId)

                        if (state) {
                            // make sure we update the channel state
                            const ur: ChannelReceiverUpdate = {
                                tabs: props.channels
                            }
                            state.channelSockets.forEach(socket => socket.emit(CHANNEL_RECEIVER_UPDATE, ur))
                        }
                    })
                })

                callback(true)
            } else {
                callback(undefined, `Session not found`)
            }
        })

        socket.on(SAIL_CHANNEL_CHANGE, async function (props: SailChannelChangeArgs, callback: (success: any, err?: string) => void) {
            console.log("SAIL CHANNEL CHANGE: " + JSON.stringify(props))
            const session = factory.getSession(props.userSessionId)

            if (session) {
                session?.receive({
                    type: 'joinUserChannelRequest',
                    payload: {
                        channelId: props.channel
                    },
                    meta: {
                        requestUuid: uuid(),
                        timestamp: new Date()
                    }
                } as BrowserTypes.JoinUserChannelRequest, props.instanceId).then(async (resp) => {
                    console.log("SAIL JOIN USER CHANNEL RESPONSE: " + JSON.stringify(resp))
                    await session.notifyUserChannelsChanged(props.instanceId, props.channel)
                    callback(true)
                })
            } else {
                callback(undefined, `Session not found`)
            }
        })

        socket.on(APP_HELLO, async function (props: AppHelloArgs, callback: (success: any, err?: string) => void) {
            console.log("SAIL APP HELLO: " + JSON.stringify(props))

            appInstanceId = props.instanceId
            userSessionId = props.userSessionId
            type = SocketType.APP

            const fdc3Server = factory.getSession(userSessionId)

            if (fdc3Server != undefined) {
                console.log("SAIL An app connected: ", userSessionId, appInstanceId)
                const appInstance = fdc3Server.getInstanceDetails(appInstanceId)
                const directoryItem = fdc3Server.directory.retrieveAppsById(props.appId)
                if ((appInstance != undefined) && (appInstance.state == State.Pending)) {
                    appInstance.socket = socket
                    appInstance.url = (directoryItem[0].details as WebAppDetails).url
                    fdc3ServerInstance = fdc3Server
                    fdc3ServerInstance.setInstanceDetails(appInstanceId, appInstance)
                    return callback(appInstance.hosting)
                } else if ((DEBUG_MODE && directoryItem.length > 0)) {
                    console.error("App tried to connect with invalid instance id, allowing connection anyway ", appInstanceId)

                    const shm: SailHostManifest = directoryItem[0]?.hostManifests?.sail as any

                    const instanceDetails: SailData = {
                        appId: props.appId,
                        instanceId: appInstanceId,
                        state: State.Pending,
                        socket,
                        url: (directoryItem[0].details as WebAppDetails).url,
                        hosting: shm?.forceNewWindow ? AppHosting.Tab : AppHosting.Frame,
                        channel: null,
                        instanceTitle: directoryItem[0].title + " - RECOVERED " + debugReconnectionNumber++,
                        channelSockets: []
                    }

                    fdc3Server?.setInstanceDetails(appInstanceId, instanceDetails)

                    fdc3ServerInstance = fdc3Server
                    return callback(instanceDetails.hosting)
                }

                console.error("App tried to connect with invalid instance id")
                return callback(null, "Invalid instance id")

            } else {
                console.error("App Tried Connecting to non-existent DA Instance ", userSessionId, appInstanceId)
                callback(null, "App Tried Connecting to non-existent DA Instance")
            }
        })

        socket.on(FDC3_APP_EVENT, function (data, from): void {
            // message from app to da
            if (!data.type.startsWith("heartbeat")) {
                console.log("SAIL FDC3_APP_EVENT: " + JSON.stringify(data) + " from " + from)
            }

            if (fdc3ServerInstance != undefined) {
                try {
                    fdc3ServerInstance.receive(data, from)
                } catch (e) {
                    console.error("Error processing message", e)
                }

                if (data.type == "broadcastRequest") {
                    fdc3ServerInstance!.notifyBroadcastContext(data as BroadcastRequest)
                }

            } else {
                console.error("No Server instance")
            }
        })

        socket.on(CHANNEL_RECEIVER_HELLO, async function (props: ChannelReceiverHelloRequest, callback: (success: ChannelReceiverUpdate | undefined, err?: string) => void) {
            userSessionId = props.userSessionId
            appInstanceId = props.instanceId
            type = SocketType.CHANNEL

            fdc3ServerInstance = factory.getSession(userSessionId)
            const appInstance = fdc3ServerInstance?.getInstanceDetails(props.instanceId)
            if (appInstance) {
                appInstance.channelSockets.push(socket)
                callback({
                    tabs: fdc3ServerInstance!.getTabs()
                })
            } else {
                callback(undefined, "No app found")
            }

        })

        socket.on(SAIL_INTENT_RESOLVE_ON_CHANNEL, function (props: SailIntentResolveOpenChannelArgs, callback: (success: void, err?: string) => void) {
            console.log("SAIL INTENT RESOLVE ON CHANNEL: " + JSON.stringify(props))
            fdc3ServerInstance!.openOnChannel(props.appId, props.channel)
            callback(undefined)
        })

        const reporter = setInterval(async () => {
            if (fdc3ServerInstance) {
                const state = await fdc3ServerInstance.getAllApps()
                socket.emit(SAIL_APP_STATE, state)
            }
        }, 3000)

        socket.on("disconnect", async function (): Promise<void> {
            if (fdc3ServerInstance) {
                if (type == SocketType.APP) {
                    await fdc3ServerInstance.setAppState(appInstanceId!, State.Terminated)
                    const remaining = await fdc3ServerInstance.getConnectedApps()
                    console.error(`Apparent app disconnect: ${remaining.length} apps remaining`)
                } else if (type == SocketType.CHANNEL) {
                    const appId = appInstanceId!
                    const details = fdc3ServerInstance.getInstanceDetails(appId!)
                    if (details) {
                        details.channelSockets = []
                        fdc3ServerInstance.setInstanceDetails(appId, details)
                        console.error(`Channel Selector Disconnect`, appInstanceId, userSessionId)
                    }
                } else {
                    fdc3ServerInstance.shutdown()
                    factory.shutdownInstance(userSessionId!)
                    console.error("Desktop Agent Disconnected", userSessionId)
                }
            } else {
                console.error("No Server instance")
            }
            clearInterval(reporter)
        })
    })

    return io
}