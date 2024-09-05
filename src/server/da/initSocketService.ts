import { APP_HELLO, AppHelloArgs, DA_HELLO, DesktopAgentHelloArgs, FDC3_APP_EVENT } from "./message-types";
import { Socket, Server } from "socket.io";
import { SailFDC3Server } from "./SailFDC3Server";
import { SailServerContext, State } from "./SailServerContext";
import { SailDirectory } from "../appd/SailDirectory";

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

        socket.on(APP_HELLO, function (props: AppHelloArgs) {
            appInstanceId = props.instanceId
            userSessionId = props.userSessionId
            type = SocketType.APP
            const fdc3Server = sessions.get(userSessionId)

            if (fdc3Server != undefined) {
                console.log("An app connected: ", userSessionId, appInstanceId)
                const appInstance = fdc3Server.getServerContext().getInstanceDetails(appInstanceId)
                if ((appInstance != undefined) && (appInstance.state == State.Pending)) {
                    appInstance.socket = socket
                    fdc3ServerInstance = fdc3Server
                    fdc3ServerInstance.serverContext.setAppConnected({ appId: props.appId, instanceId: appInstanceId })
                } else if (DEBUG_MODE) {
                    console.error("App tried to connect with invalid instance id, allowing connection anyway ", appInstanceId)
                    const directoryItem = fdc3Server.getServerContext().directory.retrieveAppsById(props.appId)

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
                console.log("App Tried Connecting to non-existent DA Instance ", userSessionId, appInstanceId)
            }
        })

        socket.on(FDC3_APP_EVENT, function (data, from): void {
            // message from app to da
            console.log(JSON.stringify(data))

            if (fdc3ServerInstance != undefined) {
                try {
                    fdc3ServerInstance!!.receive(data, from)
                } catch (e) {
                    console.error("Error processing message", e)
                }
            }
        })

        socket.on("disconnect", async function (): Promise<void> {
            if (fdc3ServerInstance) {
                if (type == SocketType.APP) {
                    await fdc3ServerInstance.serverContext.disconnect(appInstanceId!!)
                    const remaining = await fdc3ServerInstance.serverContext.getConnectedApps()
                    console.log(`Apparent disconnect: ${remaining.length} remaining`)
                } else {
                    sessions.delete(userSessionId!!)
                    console.log("Desktop Agent Disconnected", userSessionId)
                }
            }
        })
    })

    return io
}