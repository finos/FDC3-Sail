import { Socket } from "socket.io"
import { Connection } from "./Connection"

/* eslint-disable  @typescript-eslint/no-explicit-any */

/**
 * Socket.io implementation of the Connection interface.
 * Wraps a Socket.io Socket and delegates all operations to it.
 */
export class SocketIOConnection implements Connection {
    private readonly socket: Socket

    constructor(socket: Socket) {
        this.socket = socket
    }

    emit(event: string, data: any): void {
        this.socket.emit(event, data)
    }

    emitWithAck<T>(event: string, data: any): Promise<T> {
        return this.socket.emitWithAck(event, data) as Promise<T>
    }

    emitWithCallback(event: string, data: any, callback: (response: any, err?: string) => void): void {
        this.socket.emit(event, data, callback)
    }

    on(event: string, handler: (...args: any[]) => void): void {
        this.socket.on(event, handler)
    }

    shutdown(): void {
        this.socket.removeAllListeners()
        this.socket.disconnect()
    }

    /**
     * Get the underlying Socket.io socket.
     * Useful for Socket.io-specific operations not covered by the Connection interface.
     */
    getSocket(): Socket {
        return this.socket
    }
}
