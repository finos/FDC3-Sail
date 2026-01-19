/* eslint-disable  @typescript-eslint/no-explicit-any */

/**
 * Abstract connection interface for socket communication.
 * Supports both Socket.io and plain WebSocket implementations.
 */
export interface Connection {
    /** Send a message without expecting a response */
    emit(event: string, data: any): void

    /** Shutdown the connection and clean up resources */
    shutdown(): void
}
