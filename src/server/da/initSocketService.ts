import { APP_HELLO, FDC3_APP_EVENT } from "./message-types";
import { Socket, Server } from "socket.io";
import { SailFDC3Server } from "./SailFDC3Server";
import { State } from "./SailServerContext";

export const DEBUG_MODE = true

export function initSocketService(httpServer: any, sessions: Map<string, SailFDC3Server>): Server {

    const io = new Server(httpServer)

    io.on('connection', (socket: Socket) => {

        var fdc3ServerInstance: SailFDC3Server | undefined
        var appInstanceId: string | undefined

        socket.on(APP_HELLO, function (userSessionId: string, instanceId: string, appId: string) {
            appInstanceId = instanceId
            const fdc3Server = sessions.get(userSessionId)
            if (fdc3Server != undefined) {
                console.log("An app connected: ", userSessionId, instanceId)
                const appInstance = fdc3Server.getServerContext().getInstanceDetails(appInstanceId)
                if ((appInstance != undefined) && (appInstance.state == State.Pending)) {
                    appInstance.socket = socket
                    fdc3ServerInstance = fdc3Server
                } else if (DEBUG_MODE) {
                    console.error("App tried to connect with invalid instance id, allowing connection anyway ", instanceId)
                    const directoryItem = fdc3Server.getServerContext().directory.retrieveAppsById(appId)

                    fdc3Server?.serverContext.setInstanceDetails(instanceId, {
                        appId,
                        instanceId,
                        state: State.Pending,
                        socket,
                        url: directoryItem[0].details.url
                    })
                    fdc3ServerInstance = fdc3Server

                } else {
                    console.error("App tried to connect with invalid instance id")
                }
            } else {
                console.log("App Tried Connecting to non-existent DA Instance ", userSessionId, instanceId)
            }
        })

        socket.on(FDC3_APP_EVENT, function (data, from): void {
            // message from app to da
            console.log(JSON.stringify(data))

            if (fdc3ServerInstance != undefined) {
                fdc3ServerInstance!!.receive(data, from)
            }
        })

        socket.on("disconnect", async function (): Promise<void> {
            if (fdc3ServerInstance) {
                await fdc3ServerInstance.serverContext.disconnect(appInstanceId!!)
                const remaining = await fdc3ServerInstance.serverContext.getConnectedApps()
                console.log(`Apparent disconnect: ${remaining.length} remaining`)
            }
        })
    })

    return io
}