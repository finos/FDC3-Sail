import { SailFDC3ServerInstance } from "../SailFDC3ServerInstance"

/**
 * DEBUG_MODE allows apps to re-connect with an invalid instanceId.
 * 
 * While this may be outside the FDC3 specification, it is useful for development as it 
 * allows the browser to restore its state when the back-end is restarted (e.g., when 
 * making backend changes). In normal production use, the back-end wouldn't be 
 * restarted frequently, and allowing reconnection with an invalid instanceId could 
 * be a security risk.
 */
export const DEBUG_MODE = process.env.SAIL_DEBUG === 'true' || (process.env.NODE_ENV !== 'production' && process.env.SAIL_DEBUG !== 'false')

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
