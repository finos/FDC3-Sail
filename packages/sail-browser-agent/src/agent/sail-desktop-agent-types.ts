/**
 * Public option/config types and small pure helpers for {@link SailDesktopAgent}.
 */

import type { AppLauncher } from "../host-contracts/app-launcher"
import type { ValidationMode } from "../app-connection/inbound-validation"
import type { DirectoryApp } from "../app-directory/types"
import type { BrowserTypes, Context } from "@finos/fdc3"
import type { Logger, LogPayloadDetail } from "../logging/logger"
import type { SailDesktopAgentMetadata } from "./default-config"
import type { AgentAppConnection } from "../app-connection/types"
import type {
  AppConnectionMetadata,
  AppConnectionOptions,
  BrowserAppConnection,
} from "../app-connection/browser-app-connection"
import type { IntentResolver } from "../host-contracts"

interface SailDesktopAgentBaseOptions {
  appLauncher?: AppLauncher
  /** Pre-seeded catalog apps. */
  apps?: DirectoryApp[]
  userChannels?: BrowserTypes.Channel[]
  /**
   * How the agent treats inbound messages that fail FDC3 schema validation.
   * @defaultValue `'warn'`
   */
  validation?: ValidationMode
  logger?: Logger
  logPayloadDetail?: LogPayloadDetail
  /** Partial overrides merged with {@link DEFAULT_SAIL_IMPLEMENTATION_METADATA}. */
  implementationMetadata?: Partial<SailDesktopAgentMetadata>
  openContextListenerTimeoutMs?: number
  /** Milliseconds to keep a raised intent pending before giving up on a result. @defaultValue `90000` */
  pendingIntentTimeoutMs?: number
  /**
   * When `true`, the agent sends DACP `heartbeatEvent` messages for liveness after WCP5.
   * @defaultValue `true`
   */
  heartbeatEnabled?: boolean
  heartbeatIntervalMs?: number
  heartbeatTimeoutMs?: number
  /** Browser WCP edge options (handshake timing, intent/channel selector UI, etc). */
  appConnectionOptions?: AppConnectionOptions
  /** App directory URLs to load at construction; see {@link SailDesktopAgent.directoriesLoaded}. */
  appDirectories?: string[]
  onAppConnected?: (metadata: AppConnectionMetadata) => void
  onAppDisconnected?: (instanceId: string) => void
  onHandshakeFailed?: (error: Error, connectionAttemptUuid: string) => void
  intentResolver?: IntentResolver
  /** Milliseconds to wait for `channelChanged` after host `changeAppChannel`. @defaultValue `10000` */
  channelChangeTimeoutMs?: number
}

/**
 * Options for constructing {@link SailDesktopAgent}.
 */
export type SailDesktopAgentOptions<TEdge extends AgentAppConnection = BrowserAppConnection> =
  SailDesktopAgentBaseOptions &
    (BrowserAppConnection extends TEdge
      ? {
          /** @internal Test edge injection. Defaults to a new {@link BrowserAppConnection}. */
          appConnection?: TEdge
        }
      : {
          appConnection: TEdge
        })

export interface SailDesktopAgentConfig {
  appLauncher?: AppLauncher
  apps?: DirectoryApp[]
  userChannels: BrowserTypes.Channel[]
  validation: ValidationMode
  logger?: Logger
  logPayloadDetail: LogPayloadDetail
  desktopAgentMetadata: SailDesktopAgentMetadata
  openContextListenerTimeoutMs: number
  pendingIntentTimeoutMs: number
  heartbeatEnabled: boolean
  heartbeatIntervalMs: number
  heartbeatTimeoutMs: number
  channelChangeTimeoutMs: number
  appConnection?: AgentAppConnection
}

export interface DesktopAgentOpenOptions {
  context?: Context
  instanceId?: string
}

export type DesktopAgentAppInstanceStatus = "pending" | "connected" | "not-responding"

export interface DesktopAgentAppInstance {
  appId: string
  instanceId: string
  status: DesktopAgentAppInstanceStatus
  currentUserChannel?: string | null
}

export function resolveOpenAppIdentifier(
  app: string | BrowserTypes.AppIdentifier,
  options?: DesktopAgentOpenOptions,
): BrowserTypes.AppIdentifier {
  if (typeof app === "string") {
    return options?.instanceId ? { appId: app, instanceId: options.instanceId } : { appId: app }
  }
  return options?.instanceId ? { ...app, instanceId: options.instanceId } : app
}
