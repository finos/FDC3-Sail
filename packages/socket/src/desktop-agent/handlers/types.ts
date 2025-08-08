import { Socket } from "socket.io"
import { SailFDC3Server } from "../SailFDC3Server"
import { SOCKET_CONFIG } from "../../constants"

/** Socket.IO callback types */
export type SocketIOCallback<T = unknown> = (
  result: T | null,
  error?: string,
) => void

/** Types of socket connections */
export const enum SocketType {
  DESKTOP_AGENT = "desktop_agent",
  APP = "app",
  CHANNEL = "channel",
}

/** Socket connection state */
export interface SocketConnectionState {
  fdc3ServerInstance?: SailFDC3Server
  userSessionId?: string
  appInstanceId?: string
  socketType?: SocketType
}

/** Configuration object for handler constants - re-exported from constants */
export const CONFIG = SOCKET_CONFIG

/** Legacy exports for backward compatibility */
export const APP_INSTANCE_PREFIX = CONFIG.APP_INSTANCE_PREFIX
export const DEBUG_RECONNECTION_SUFFIX = CONFIG.DEBUG_RECONNECTION_SUFFIX
export const POLLING_INTERVAL_MS = CONFIG.POLLING_INTERVAL_MS
export const STATE_REPORT_INTERVAL_MS = CONFIG.STATE_REPORT_INTERVAL_MS


/**
 * Waits for an FDC3 server instance to become available for a session
 * @param sessions - Map of active FDC3 server sessions
 * @param userSessionId - The session ID to wait for
 * @returns Promise that resolves when the server instance is available
 */
export function getFdc3ServerInstance(
  sessions: Map<string, SailFDC3Server>,
  userSessionId: string,
): Promise<SailFDC3Server> {
  return new Promise((resolve) => {
    const pollForServer = () => {
      const fdc3Server = sessions.get(userSessionId)
      if (fdc3Server) {
        resolve(fdc3Server)
      } else {
        setTimeout(pollForServer, CONFIG.POLLING_INTERVAL_MS)
      }
    }
    pollForServer()
  })
}

/**
 * Creates a standardized error callback response
 * @param callback - The socket callback function
 * @param errorMessage - The error message to return
 */
export function handleCallbackError<T>(
  callback: SocketIOCallback<T>,
  errorMessage: string,
): void {
  callback(null, errorMessage)
}

/** AppInstance interface for type safety */
export interface AppInstance {
  channelSockets: Socket[]
  [key: string]: unknown
}


/** Log levels for structured logging */
export enum LogLevel {
  ERROR = "ERROR",
  WARN = "WARN",
  INFO = "INFO",
  DEBUG = "DEBUG",
}

/** Panel data interface for better type safety */
export interface PanelData {
  panelId: string
  tabId: string
  title: string
}

/** Directory app interface for consistent naming */
export interface DirectoryAppEntry {
  title: string
  hostManifests?: { sail?: unknown }
  details: unknown
}

/** Handler context passed to all handlers */
export interface HandlerContext {
  socket: Socket
  connectionState: SocketConnectionState
  sessions: Map<string, SailFDC3Server>
}
