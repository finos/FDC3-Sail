/* eslint-disable  @typescript-eslint/no-explicit-any */

/**
 * Abstract connection interface for socket communication.
 * Supports both Socket.io and plain WebSocket implementations.
 */
export interface Connection {
    /** Send a message without expecting a response */
    emit(event: string, data: any): void

    /** Send a message and await a response */
    emitWithAck<T>(event: string, data: any): Promise<T>

    /** Send with callback (Socket.io style) */
    emitWithCallback(event: string, data: any, callback: (response: any, err?: string) => void): void

    /** Register an event handler */
    on(event: string, handler: (...args: any[]) => void): void

    /** Shutdown the connection and clean up resources */
    shutdown(): void
}
