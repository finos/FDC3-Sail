import { Connection } from "./Connection"
import { v4 as uuidv4 } from 'uuid'

/* eslint-disable  @typescript-eslint/no-explicit-any */

/**
 * Message format for WebSocket communication.
 * Since WebSocket doesn't have event names like Socket.io,
 * we use a type field to route messages.
 */
export interface WebSocketMessage {
    type: string
    requestId?: string
    data?: any
    error?: string
}

/**
 * Plain WebSocket implementation of the Connection interface.
 * Implements message routing and request/response correlation
 * to provide Socket.io-like semantics over raw WebSocket.
 */
export class WebSocketConnection implements Connection {
    private readonly ws: WebSocket
    private readonly handlers: Map<string, Set<(...args: any[]) => void>> = new Map()
    private readonly pendingRequests: Map<string, {
        resolve: (value: any) => void
        reject: (reason: any) => void
    }> = new Map()
    private readonly pendingCallbacks: Map<string, (response: any, err?: string) => void> = new Map()

    constructor(ws: WebSocket) {
        this.ws = ws
        this.setupMessageHandler()
    }

    private setupMessageHandler(): void {
        this.ws.onmessage = (event: MessageEvent) => {
            try {
                const message: WebSocketMessage = JSON.parse(event.data)
                this.handleMessage(message)
            } catch (e) {
                console.error("Failed to parse WebSocket message:", e)
            }
        }
    }

    private handleMessage(message: WebSocketMessage): void {
        const { type, requestId, data, error } = message

        // Check if this is a response to a pending request
        if (requestId) {
            const pending = this.pendingRequests.get(requestId)
            if (pending) {
                this.pendingRequests.delete(requestId)
                if (error) {
                    pending.reject(new Error(error))
                } else {
                    pending.resolve(data)
                }
                return
            }

            const callback = this.pendingCallbacks.get(requestId)
            if (callback) {
                this.pendingCallbacks.delete(requestId)
                callback(data, error)
                return
            }
        }

        // Otherwise, dispatch to registered handlers
        const eventHandlers = this.handlers.get(type)
        if (eventHandlers) {
            eventHandlers.forEach(handler => {
                try {
                    handler(data)
                } catch (e) {
                    console.error(`Error in handler for event ${type}:`, e)
                }
            })
        }
    }

    emit(event: string, data: any): void {
        const message: WebSocketMessage = {
            type: event,
            data
        }
        this.ws.send(JSON.stringify(message))
    }

    emitWithAck<T>(event: string, data: any): Promise<T> {
        return new Promise((resolve, reject) => {
            const requestId = uuidv4()
            this.pendingRequests.set(requestId, {
                resolve: resolve as (value: any) => void,
                reject
            })

            const message: WebSocketMessage = {
                type: event,
                requestId,
                data
            }
            this.ws.send(JSON.stringify(message))
        })
    }

    emitWithCallback(event: string, data: any, callback: (response: any, err?: string) => void): void {
        const requestId = uuidv4()
        this.pendingCallbacks.set(requestId, callback)

        const message: WebSocketMessage = {
            type: event,
            requestId,
            data
        }
        this.ws.send(JSON.stringify(message))
    }

    on(event: string, handler: (...args: any[]) => void): void {
        if (!this.handlers.has(event)) {
            this.handlers.set(event, new Set())
        }
        this.handlers.get(event)!.add(handler)
    }

    shutdown(): void {
        this.handlers.clear()
        this.pendingRequests.clear()
        this.pendingCallbacks.clear()
        this.ws.close()
    }

    /**
     * Get the underlying WebSocket.
     * Useful for WebSocket-specific operations not covered by the Connection interface.
     */
    getWebSocket(): WebSocket {
        return this.ws
    }
}
