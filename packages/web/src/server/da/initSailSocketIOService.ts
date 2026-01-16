import { Socket, Server } from "socket.io"
import { SailFDC3ServerFactory } from "./SailFDC3ServerFactory"
import { SocketIOConnection } from "./connection/SocketIOConnection"
import { createConnectionContext, handleAllMessageTypes } from "./sail-handlers"
import { RemoteSocketService } from "./RemoteSocketService"
import { RemoteApp } from "@finos/fdc3-sail-common"

/* eslint-disable  @typescript-eslint/no-explicit-any */

/**
 * This responds to socket.io connections from the sail website front-end.
 * (i.e. the FDC3 da-proxy running on web pages.)
 * 
 * @param httpServer - The HTTP server to attach to
 * @param factory - The FDC3 server factory
 * @param remoteSocketService - Optional RemoteSocketService to refresh when client state changes
 */
export function initSailSocketIOService(
    httpServer: any,
    factory: SailFDC3ServerFactory,
    remoteSocketService: RemoteSocketService
): Server {

    const io = new Server(httpServer)

    io.on('connection', (socket: Socket) => {
        const ctx = createConnectionContext()
        const connection = new SocketIOConnection(socket)

        // Wire up the remote apps refresh callback
        const onRemoteAppsChanged = (userSessionId: string, remoteApps: RemoteApp[]) => {
            remoteSocketService.refreshAvailableRemoteSockets(userSessionId, remoteApps)
        }

        handleAllMessageTypes(ctx, factory, connection, onRemoteAppsChanged)
    })

    return io
}
