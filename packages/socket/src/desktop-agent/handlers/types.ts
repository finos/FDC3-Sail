import { Socket } from 'socket.io';
import { SailFDC3Server } from '../SailFDC3Server';
import { AppHosting, TabDetail } from '@finos/fdc3-sail-common';

/** Socket.IO callback types */
export type SocketIOCallback<T = unknown> = (result: T | null, error?: string) => void;

/** Types of socket connections */
export const enum SocketType {
  DESKTOP_AGENT = 'desktop_agent',
  APP = 'app',
  CHANNEL = 'channel',
}

/** Socket connection state */
export interface SocketConnectionState {
  fdc3ServerInstance?: SailFDC3Server;
  userSessionId?: string;
  appInstanceId?: string;
  socketType?: SocketType;
}

/** Configuration constants */
export const APP_INSTANCE_PREFIX = 'sail-app-';
export const DEBUG_RECONNECTION_SUFFIX = ' - RECOVERED ';
export const POLLING_INTERVAL_MS = 100;
export const STATE_REPORT_INTERVAL_MS = 3000;

/** Global state for debug reconnections */
export let debugReconnectionNumber = 0;

/**
 * Increments and returns the debug reconnection number
 */
export function getNextDebugReconnectionNumber(): number {
  return ++debugReconnectionNumber;
}

/**
 * Gets the Sail URL from environment variables or returns default
 */
export function getSailUrl(): string {
  return process.env.SAIL_URL || 'http://localhost:8090';
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
      const fdc3Server = sessions.get(userSessionId);
      if (fdc3Server) {
        resolve(fdc3Server);
      } else {
        setTimeout(pollForServer, POLLING_INTERVAL_MS);
      }
    };
    pollForServer();
  });
}

/** Handler context passed to all handlers */
export interface HandlerContext {
  socket: Socket;
  connectionState: SocketConnectionState;
  sessions: Map<string, SailFDC3Server>;
}