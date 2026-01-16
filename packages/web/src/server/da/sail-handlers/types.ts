import { SailFDC3ServerInstance } from "../SailFDC3ServerInstance"

export const DEBUG_MODE = true

export function getSailUrl(): string {
    return process.env.SAIL_URL || "http://localhost:8090"
}

/**
 * Represents the type of connection
 */
export enum ConnectionType {
    DESKTOP_AGENT,
    APP,
    CHANNEL
}

/**
 * Context object that holds mutable state for a connection session.
 * This is shared across all handlers for a single connection.
 */
export interface ConnectionContext {
    fdc3ServerInstance: SailFDC3ServerInstance | undefined
    userSessionId: string | undefined
    appInstanceId: string | undefined
    connectionType: ConnectionType | undefined
}

/**
 * Creates a new empty connection context
 */
export function createConnectionContext(): ConnectionContext {
    return {
        fdc3ServerInstance: undefined,
        userSessionId: undefined,
        appInstanceId: undefined,
        connectionType: undefined
    }
}
