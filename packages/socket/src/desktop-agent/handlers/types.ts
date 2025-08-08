import { Socket } from "socket.io"
import { SailFDC3Server } from "../SailFDC3Server"

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

/** Configuration object for handler constants */
export const CONFIG = {
  APP_INSTANCE_PREFIX: "sail-app-",
  DEBUG_RECONNECTION_SUFFIX: " - RECOVERED ",
  POLLING_INTERVAL_MS: parseInt(process.env.POLLING_INTERVAL_MS || "100", 10),
  STATE_REPORT_INTERVAL_MS: parseInt(
    process.env.STATE_REPORT_INTERVAL_MS || "3000",
    10,
  ),
  DEBUG_MODE:
    process.env.DEBUG_MODE === "true" || process.env.NODE_ENV === "development",
} as const

/** Legacy exports for backward compatibility */
export const APP_INSTANCE_PREFIX = CONFIG.APP_INSTANCE_PREFIX
export const DEBUG_RECONNECTION_SUFFIX = CONFIG.DEBUG_RECONNECTION_SUFFIX
export const POLLING_INTERVAL_MS = CONFIG.POLLING_INTERVAL_MS
export const STATE_REPORT_INTERVAL_MS = CONFIG.STATE_REPORT_INTERVAL_MS

/** Global state for debug reconnections */
export let debugReconnectionNumber = 0

/**
 * Increments and returns the debug reconnection number
 */
export function getNextDebugReconnectionNumber(): number {
  return ++debugReconnectionNumber
}

/**
 * Gets the Sail URL from environment variables or returns default
 */
export function getSailUrl(): string {
  return process.env.SAIL_URL || "http://localhost:8090"
}

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

/**
 * Adds a channel socket to an existing app instance
 * @param appInstance - The app instance to update
 * @param socket - The socket to add
 * @returns Updated app instance with the new socket
 */
export function addChannelSocketToInstance(
  appInstance: AppInstance,
  socket: Socket,
): AppInstance {
  return {
    ...appInstance,
    channelSockets: [...appInstance.channelSockets, socket],
  }
}

/**
 * Removes all channel sockets from an app instance
 * @param appInstance - The app instance to update
 * @returns Updated app instance with cleared sockets
 */
export function clearChannelSocketsFromInstance(
  appInstance: AppInstance,
): AppInstance {
  return {
    ...appInstance,
    channelSockets: [],
  }
}

/** Log levels for structured logging */
export enum LogLevel {
  ERROR = "ERROR",
  WARN = "WARN",
  INFO = "INFO",
  DEBUG = "DEBUG",
}

/**
 * Simple structured logger with configurable log levels
 */
export const logger = {
  error: (message: string, ...args: unknown[]) => {
    console.error(`[${LogLevel.ERROR}] ${message}`, ...args)
  },
  warn: (message: string, ...args: unknown[]) => {
    console.warn(`[${LogLevel.WARN}] ${message}`, ...args)
  },
  info: (message: string, ...args: unknown[]) => {
    console.log(`[${LogLevel.INFO}] ${message}`, ...args)
  },
  debug: (message: string, ...args: unknown[]) => {
    if (CONFIG.DEBUG_MODE) {
      console.log(`[${LogLevel.DEBUG}] ${message}`, ...args)
    }
  },
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
