import { Connection } from "./Connection"
import { WebSocket } from "ws"

/* eslint-disable  @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

/**
 * Simple WebSocket implementation of the Connection interface for remote apps.
 * 
 * Remote apps only need emit() to receive FDC3 messages from the server.
 * Messages are sent directly as JSON without event type wrapping.
 */
export class WebSocketConnection implements Connection {
    private readonly ws: WebSocket

    constructor(ws: WebSocket) {
        this.ws = ws
    }

    /**
     * Send a message to the remote app.
     * The event parameter is ignored - data is sent directly as JSON.
     */
    emit(_event: string, data: any): void {
        if (this.ws.readyState === this.ws.OPEN) {
            this.ws.send(JSON.stringify(data))
        }
    }

    // Not used for remote apps - stub implementations
    emitWithAck<T>(_event: string, _data: any): Promise<T> {
        return Promise.reject(new Error("emitWithAck not supported for remote connections"))
    }

    emitWithCallback(_event: string, _data: any, _callback: (response: any, err?: string) => void): void {
        throw new Error("emitWithCallback not supported for remote connections")
    }

    on(_event: string, _handler: (...args: any[]) => void): void {
        // Not used - message handling is done directly in RemoteSocketService
    }

    shutdown(): void {
        this.ws.close()
    }
}
