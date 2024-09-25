import { DA_DIRECTORY_LISTING, APP_HELLO, DesktopAgentDirectoryListingArgs, AppHelloArgs, DA_HELLO, DesktopAgentHelloArgs, FDC3_APP_EVENT, DA_REGISTER_APP_LAUNCH, DesktopAgentRegisterAppLaunchArgs, SAIL_CHANNEL_CHANGE, SailChannelChangeArgs, SAIL_APP_STATE } from "./message-types";
import { Socket, Server } from "socket.io";
import { SailFDC3Server } from "./SailFDC3Server";
import { SailServerContext } from "./SailServerContext";
import { SailDirectory } from "../appd/SailDirectory";
import { v4 as uuid } from 'uuid'
import { DirectoryApp, State, WebAppDetails } from "@kite9/fdc3-web-impl";
import { BrowserTypes } from "@kite9/fdc3";
export const DEBUG_MODE = true

enum SocketType { DESKTOP_AGENT, APP }

export function initSocketService(httpServer: any, sessions: Map<string, SailFDC3Server>): Server {

    const io = new Server(httpServer)

    io.on('connection', (socket: Socket) => {

        var fdc3ServerInstance: SailFDC3Server | undefined
        var userSessionId: string | undefined
        var appInstanceId: string | undefined
        var type: SocketType | undefined = undefined

        socket.on(DA_HELLO, function (props: DesktopAgentHelloArgs) {
            console.log("DA HELLO:" + JSON.stringify(props))

            type = SocketType.DESKTOP_AGENT
            userSessionId = props.userSessionId
            console.log("Desktop Agent Connecting", userSessionId)
            fdc3ServerInstance = sessions.get(userSessionId)

            if (fdc3ServerInstance) {
                // reconfiguring current session
                const newFdc3Server = new SailFDC3Server(fdc3ServerInstance.serverContext, props)
                sessions.set(userSessionId, newFdc3Server)
                console.log("updated desktop agent channels and directories", sessions.size, props.userSessionId)
            } else {
                // starting session
                const serverContext = new SailServerContext(new SailDirectory(), socket)
                const fdc3Server = new SailFDC3Server(serverContext, props)
                sessions.set(userSessionId, fdc3Server)
                console.log("created agent session.  Running sessions ", sessions.size, props.userSessionId)
            }
        })

        socket.on(DA_DIRECTORY_LISTING, function (props: DesktopAgentDirectoryListingArgs, callback: (success: any, err?: string) => void) {
            const userSessionId = props.userSessionId
            const session = sessions.get(userSessionId)
            if (session) {
                callback(session?.getDirectory().allApps)
            } else {
                console.error("Session not found", userSessionId)
                callback(null, "Session not found")
            }
        })

        socket.on(DA_REGISTER_APP_LAUNCH, async function (props: DesktopAgentRegisterAppLaunchArgs, callback: (success: any, err?: string) => void) {
            console.log("DA REGISTER APP LAUNCH: " + JSON.stringify(props))

            const { appId, userSessionId } = props
            const session = sessions.get(userSessionId)
            if (session) {
                const instanceId = uuid()
                session.serverContext.setInstanceDetails(instanceId, {
                    instanceId: instanceId,
                    state: State.Pending,
                    appId
                })
                console.log("Registered app", appId, instanceId)
                callback(instanceId)
            } else {
                console.error("Session not found", userSessionId)
                callback(null, "Session not found")
            }
        })

        socket.on(SAIL_CHANNEL_CHANGE, async function (props: SailChannelChangeArgs) {
            console.log("SAIL CHANNEL CHANGE: " + JSON.stringify(props))
            const session = sessions.get(props.userSessionId)

            session?.receive({
                type: 'joinUserChannelRequest',
                payload: {
                    channelId: props.channel
                },
                meta: {
                    requestUuid: uuid(),
                    timestamp: new Date()
                }
            } as BrowserTypes.JoinUserChannelRequest, props.instanceId)
        })

        socket.on(APP_HELLO, function (props: AppHelloArgs) {
            console.log("APP HELLO: " + JSON.stringify(props))

            appInstanceId = props.instanceId
            userSessionId = props.userSessionId
            type = SocketType.APP
            const fdc3Server = sessions.get(userSessionId)

            if (fdc3Server != undefined) {
                console.log("An app connected: ", userSessionId, appInstanceId)
                const appInstance = fdc3Server.getServerContext().getInstanceDetails(appInstanceId)
                const directoryItem = fdc3Server.getServerContext().directory.retrieveAppsById(props.appId) as DirectoryApp[]
                if ((appInstance != undefined) && (appInstance.state == State.Pending)) {
                    appInstance.socket = socket
                    appInstance.url = (directoryItem[0].details as WebAppDetails).url
                    fdc3ServerInstance = fdc3Server
                    fdc3ServerInstance.serverContext.setInstanceDetails(appInstanceId, {
                        appId: props.appId,
                        instanceId: appInstanceId,
                        state: State.Pending,
                        socket,
                        url: appInstance.url
                    })
                } else if (DEBUG_MODE) {
                    console.error("App tried to connect with invalid instance id, allowing connection anyway ", appInstanceId)

                    fdc3Server?.serverContext.setInstanceDetails(appInstanceId, {
                        appId: props.appId,
                        instanceId: appInstanceId,
                        state: State.Pending,
                        socket,
                        url: (directoryItem[0].details as WebAppDetails).url
                    })

                    fdc3ServerInstance = fdc3Server
                    //fdc3ServerInstance.serverContext.setAppConnected({ appId: props.appId, instanceId: appInstanceId })

                } else {
                    console.error("App tried to connect with invalid instance id")
                }
            } else {
                console.error("App Tried Connecting to non-existent DA Instance ", userSessionId, appInstanceId)
            }
        })

        socket.on(FDC3_APP_EVENT, function (data, from): void {
            // message from app to da
            if (!data.type.startsWith("heartbeat")) {
                console.log("FDC3_APP_EVENT: " + JSON.stringify(data) + " from " + from)
            }

            if (fdc3ServerInstance != undefined) {
                try {
                    fdc3ServerInstance!!.receive(data, from)
                } catch (e) {
                    console.error("Error processing message", e)
                }
            } else {
                console.error("No Server instance")
            }
        })

        const reporter = setInterval(async () => {
            if (fdc3ServerInstance) {
                const state = await fdc3ServerInstance.serverContext.getAllApps()
                console.log("SENDING APP STATES: " + JSON.stringify(state))
                socket.emit(SAIL_APP_STATE, { apps: state })
            }
        }, 3000)

        socket.on("disconnect", async function (): Promise<void> {
            if (fdc3ServerInstance) {
                if (type == SocketType.APP) {
                    await fdc3ServerInstance.serverContext.setAppState(appInstanceId!!, State.Terminated)
                    const remaining = await fdc3ServerInstance.serverContext.getConnectedApps()
                    console.error(`Apparent disconnect: ${remaining.length} remaining`)
                } else {
                    sessions.delete(userSessionId!!)
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