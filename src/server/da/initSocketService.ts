import { DA_DIRECTORY_LISTING, APP_HELLO, DesktopAgentDirectoryListingArgs, AppHelloArgs, DA_HELLO, DesktopAgentHelloArgs, FDC3_APP_EVENT, SAIL_CHANNEL_CHANGE, SailChannelChangeArgs, SAIL_APP_STATE, SAIL_CLIENT_STATE, SailClientStateArgs, DesktopAgentRegisterAppLaunchArgs, DA_REGISTER_APP_LAUNCH } from "./message-types";
import { Socket, Server } from "socket.io";
import { SailFDC3Server } from "./SailFDC3Server";
import { AppHosting, SailServerContext } from "./SailServerContext";
import { SailDirectory } from "../appd/SailDirectory";
import { v4 as uuid } from 'uuid'
import { DirectoryApp, State, WebAppDetails } from "@kite9/fdc3-web-impl";
import { BrowserTypes } from "@kite9/fdc3";
export const DEBUG_MODE = true

enum SocketType { DESKTOP_AGENT, APP }

export function initSocketService(httpServer: any, sessions: Map<string, SailFDC3Server>): Server {

    const io = new Server(httpServer)

    io.on('connection', (socket: Socket) => {

        var fdc3ServerInstance: SailFDC3Server | undefined = undefined
        var userSessionId: string | undefined
        var appInstanceId: string | undefined
        var type: SocketType | undefined = undefined

        socket.on(DA_HELLO, function (props: DesktopAgentHelloArgs) {
            console.log("DA HELLO:" + JSON.stringify(props))

            type = SocketType.DESKTOP_AGENT
            userSessionId = props.userSessionId
            console.log("Desktop Agent Connecting", userSessionId)
            var fdc3Server = sessions.get(userSessionId)

            if (fdc3Server) {
                // reconfiguring current session
                fdc3Server = new SailFDC3Server(fdc3Server.serverContext, props)
                sessions.set(userSessionId, fdc3Server)
                console.log("updated desktop agent channels and directories", sessions.size, props.userSessionId)
            } else {
                // starting session
                const serverContext = new SailServerContext(new SailDirectory(), socket)
                fdc3Server = new SailFDC3Server(serverContext, props)
                sessions.set(userSessionId, fdc3Server)
                console.log("created agent session.  Running sessions ", sessions.size, props.userSessionId)
            }

            fdc3ServerInstance = fdc3Server
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
                const instanceId = 'sail-app-' + uuid()
                session.serverContext.setInstanceDetails(instanceId, {
                    instanceId: instanceId,
                    state: State.Pending,
                    appId,
                    hosting: props.hosting
                })
                console.log("Registered app", appId, instanceId)
                callback(instanceId)
            } else {
                console.error("Session not found", userSessionId)
                callback(null, "Session not found")
            }
        })

        socket.on(SAIL_CLIENT_STATE, async function (props: SailClientStateArgs) {
            console.log("SAIL APP STATE: " + JSON.stringify(props))
            const session = sessions.get(props.userSessionId)
            session?.serverContext.reloadAppDirectories(props.directories)
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

        socket.on(APP_HELLO, function (props: AppHelloArgs, callback: (success: any, err?: string) => void) {
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
                    fdc3ServerInstance.serverContext.setInstanceDetails(appInstanceId, appInstance)
                    callback(appInstance.hosting)
                } else if ((appInstance != undefined) && DEBUG_MODE) {
                    console.error("App tried to connect with invalid instance id, allowing connection anyway ", appInstanceId)
                    fdc3Server?.serverContext.setInstanceDetails(appInstanceId, {
                        appId: props.appId,
                        instanceId: appInstanceId,
                        state: State.Pending,
                        socket,
                        url: (directoryItem[0].details as WebAppDetails).url,
                        hosting: directoryItem[0]?.hostManifests?.sail?.forceNewWindow ? AppHosting.Tab : AppHosting.Frame
                    })

                    fdc3ServerInstance = fdc3Server
                    callback(appInstance.hosting)
                } else {
                    console.error("App tried to connect with invalid instance id")
                    callback(null, "Invalid instance id")
                }
            } else {
                console.error("App Tried Connecting to non-existent DA Instance ", userSessionId, appInstanceId)
                callback(null, "App Tried Connecting to non-existent DA Instance")
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
                socket.emit(SAIL_APP_STATE, state)
            }
        }, 3000)

        socket.on("disconnect", async function (): Promise<void> {
            if (fdc3ServerInstance) {
                if (type == SocketType.APP) {
                    await fdc3ServerInstance.serverContext.setAppState(appInstanceId!!, State.Terminated)
                    const remaining = await fdc3ServerInstance.serverContext.getConnectedApps()
                    console.error(`Apparent disconnect: ${remaining.length} remaining`)
                } else {
                    fdc3ServerInstance.shutdown()
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