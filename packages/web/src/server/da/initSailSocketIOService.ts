import { Socket, Server } from "socket.io"
import { SailFDC3ServerFactory } from "./SailFDC3ServerFactory"
import { SocketIOConnection } from "./connection/SocketIOConnection"
import { createConnectionContext, handleAllMessageTypes } from "./sail-handlers"
import { RemoteSocketService } from "./RemoteSocketService"
import { DirectoryApp } from "@finos/fdc3-sail-da-impl"

/* eslint-disable  @typescript-eslint/no-explicit-any */

/**
 * This responds to socket.io connections from the sail website front-end.
 * (i.e. the FDC3 da-proxy running on web pages.)
 * 
 * @param httpServer - The HTTP server to attach to
 * @param factory - The FDC3 server factory
 * @param remoteSocketService - RemoteSocketService to refresh when native apps in directory change
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

        // Wire up the native apps refresh callback - called when directory is loaded
        const onNativeAppsChanged = (userSessionId: string, nativeApps: DirectoryApp[]) => {
            remoteSocketService.refreshAvailableRemoteSockets(userSessionId, nativeApps)
        }

        handleAllMessageTypes(ctx, factory, connection, onNativeAppsChanged)
    })

    return io
}
