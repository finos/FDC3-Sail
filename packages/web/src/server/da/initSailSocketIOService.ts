import { Socket, Server } from "socket.io"
import { SailFDC3ServerFactory } from "./SailFDC3ServerFactory"
import { SocketIOConnection } from "./connection/SocketIOConnection"
import { createConnectionContext, handleAllMessageTypes } from "./sail-handlers"

/* eslint-disable  @typescript-eslint/no-explicit-any */

/**
 * This responds to socket.io connections from the sail website front-end.
 * (i.e. the FDC3 da-proxy runnning on web pages.)
 */
export function initSailSocketIOService(httpServer: any, factory: SailFDC3ServerFactory): Server {

    const io = new Server(httpServer)

    io.on('connection', (socket: Socket) => {
        const ctx = createConnectionContext()
        const connection = new SocketIOConnection(socket)
        handleAllMessageTypes(ctx, factory, connection)
    })

    return io
}
