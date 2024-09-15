import { DA_DIRECTORY_LISTING, APP_HELLO, DesktopAgentDirectoryListingArgs, AppHelloArgs, DA_HELLO, DesktopAgentHelloArgs, FDC3_APP_EVENT, DA_REGISTER_APP_LAUNCH, DesktopAgentRegisterAppLaunchArgs } from "./message-types";
import { Socket, Server } from "socket.io";
import { SailFDC3Server } from "./SailFDC3Server";
import { SailServerContext, State } from "./SailServerContext";
import { SailDirectory } from "../appd/SailDirectory";
import { v4 as uuid } from 'uuid'
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
            console.log(JSON.stringify(props))

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
            console.log(JSON.stringify(props))

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

        socket.on(APP_HELLO, function (props: AppHelloArgs) {
            console.log(JSON.stringify(props))

            appInstanceId = props.instanceId
            userSessionId = props.userSessionId
            type = SocketType.APP
            const fdc3Server = sessions.get(userSessionId)

            if (fdc3Server != undefined) {
                console.log("An app connected: ", userSessionId, appInstanceId)
                const appInstance = fdc3Server.getServerContext().getInstanceDetails(appInstanceId)
                const directoryItem = fdc3Server.getServerContext().directory.retrieveAppsById(props.appId)
                if ((appInstance != undefined) && (appInstance.state == State.Pending)) {
                    appInstance.socket = socket
                    appInstance.url = directoryItem[0].details.url
                    fdc3ServerInstance = fdc3Server
                    fdc3ServerInstance.serverContext.setAppConnected({ appId: props.appId, instanceId: appInstanceId })
                } else if (DEBUG_MODE) {
                    console.error("App tried to connect with invalid instance id, allowing connection anyway ", appInstanceId)

                    fdc3Server?.serverContext.setInstanceDetails(appInstanceId, {
                        appId: props.appId,
                        instanceId: appInstanceId,
                        state: State.Open,
                        socket,
                        url: directoryItem[0].details.url
                    })
                    fdc3ServerInstance = fdc3Server

                } else {
                    console.error("App tried to connect with invalid instance id")
                }
            } else {
                console.error("App Tried Connecting to non-existent DA Instance ", userSessionId, appInstanceId)
            }
        })

        socket.on(FDC3_APP_EVENT, function (data, from): void {
            // message from app to da
            console.log(JSON.stringify(data) + " from " + from)

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

        socket.on("disconnect", async function (): Promise<void> {
            if (fdc3ServerInstance) {
                if (type == SocketType.APP) {
                    await fdc3ServerInstance.serverContext.disconnect(appInstanceId!!)
                    const remaining = await fdc3ServerInstance.serverContext.getConnectedApps()
                    console.error(`Apparent disconnect: ${remaining.length} remaining`)
                } else {
                    sessions.delete(userSessionId!!)
                    console.error("Desktop Agent Disconnected", userSessionId)
                }
            } else {
                console.error("No Server instance")
            }
        })
    })

    return io
}