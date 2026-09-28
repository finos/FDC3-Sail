/**
 * Public option/config types and small pure helpers for {@link SailDesktopAgent}.
 *
 * Extracted from `sail-desktop-agent.ts` to keep the class file under the repo's file-size
 * lint budget — these are data shapes and pure mappers, not agent behaviour.
 */

import type { AppLauncher } from "../host-contracts/app-launcher"
import type { ValidationMode } from "../dacp/validate-dacp-message"
import type { DirectoryApp } from "../app-directory/types"
import type { BrowserTypes, Context } from "@finos/fdc3"
import type { AgentState, AppInstance } from "../state/types"
import { AppInstanceState } from "../state/types"
import type { Logger, LogPayloadDetail } from "../logging/logger"
import type { SailDesktopAgentMetadata } from "./default-config"
import type { AgentAppConnection } from "../app-connection/types"
import type {
  AppConnectionMetadata,
  AppConnectionOptions,
  BrowserAppConnection,
} from "../app-connection/browser-app-connection"
import type { IntentResolver } from "../host-contracts"

/**
 * Fields of {@link SailDesktopAgentOptions} that don't depend on the injected edge type.
 * Kept separate so `appConnection`'s optionality can be computed per `TEdge` — see
 * {@link SailDesktopAgentOptions}.
 */
interface SailDesktopAgentBaseOptions {
  appLauncher?: AppLauncher
  /** Pre-seeded catalog apps (merged into `state.appDirectory.apps` at construction). */
  apps?: DirectoryApp[]
  userChannels?: BrowserTypes.Channel[]
  /**
   * How the agent treats inbound messages that fail FDC3 schema validation.
   *
   * @defaultValue `'warn'` — log the failure and dispatch anyway. Use `'strict'`
   * to reject malformed messages with an FDC3 `MalformedMessage` error, or
   * `'off'` to skip validation entirely.
   */
  validation?: ValidationMode
  /**
   * Injectable logger sink for agent-internal structured logs.
   *
   * @remarks Pair with {@link SailDesktopAgentOptions.logPayloadDetail}: the logger
   * selects where output goes; `logPayloadDetail` selects how much payload is
   * included (metadata at info/warn/error; full JSON at debug when `'full'`).
   */
  logger?: Logger
  /**
   * How much message/context detail agent-internal structured logs include.
   *
   * @defaultValue 'metadata'
   *
   * - `'metadata'` — log type, ids, contextType, key names only; never full
   *   context JSON at info/warn/error.
   * - `'full'` — may include serialized payloads on {@link Logger.debug} only;
   *   requires a logger that implements `debug`.
   *
   * @remarks Use with {@link SailDesktopAgentOptions.logger}: config selects *what*
   * to log; the logger selects *where* it goes.
   */
  logPayloadDetail?: LogPayloadDetail
  initialState?: Partial<AgentState>

  /** Partial overrides merged with {@link DEFAULT_SAIL_IMPLEMENTATION_METADATA}. */
  implementationMetadata?: Partial<SailDesktopAgentMetadata>

  openContextListenerTimeoutMs?: number
  /** Milliseconds to keep a raised intent pending before giving up on a result. @defaultValue `90000` */
  pendingIntentTimeoutMs?: number
  /**
   * When `true`, the agent sends DACP `heartbeatEvent` messages for liveness after WCP5.
   * FDC3 2.2 leaves this as a Desktop Agent policy (apps cannot opt out via `getAgent()`).
   *
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
 * Options for constructing {@link SailDesktopAgent}. Omitted fields use FDC3-Sail product
 * defaults from `default-config.ts` (merged in the constructor).
 *
 * Generic over the injected app-connection edge type so `appConnection` round-trips to
 * `SailDesktopAgent<TEdge>.appConnection`. Defaults to {@link BrowserAppConnection}, matching
 * `SailDesktopAgent`'s own default type parameter, so a bare `SailDesktopAgentOptions` still
 * infers a bare `SailDesktopAgent` at a `new SailDesktopAgent(options)` call site.
 *
 * `appConnection` is **required whenever `TEdge` is narrowed away from the default**
 * {@link BrowserAppConnection} (e.g. `SailDesktopAgentOptions<DacpTestAppConnection>`), and stays
 * optional when `TEdge` is the default or a *widening* (e.g. `AgentAppConnection`). This closes
 * the hole where narrowing `TEdge` without injecting a matching edge used to compile and then
 * fail at runtime — see `SailDesktopAgent`'s constructor.
 */
export type SailDesktopAgentOptions<TEdge extends AgentAppConnection = BrowserAppConnection> =
  SailDesktopAgentBaseOptions &
    (BrowserAppConnection extends TEdge
      ? {
          /**
           * App connection edge for inbound DACP/WCP and outbound delivery.
           *
           * @internal Test edge injection (e.g. `DacpTestAppConnection`). Defaults to a new
           * {@link BrowserAppConnection} — the real browser WCP edge every production host uses.
           */
          appConnection?: TEdge
        }
      : {
          /**
           * App connection edge for inbound DACP/WCP and outbound delivery. Required here:
           * `TEdge` has been narrowed to a non-default edge type, so there is no safe default
           * to fall back to — omitting it would make `appConnection` lie about its runtime type.
           */
          appConnection: TEdge
        })

/**
 * Fully resolved {@link SailDesktopAgent} configuration after Sail defaults are applied.
 *
 * Not generic: `resolveDesktopAgentConfig` only merges and forwards `appConnection`, it never
 * needs to know the injected edge's specific type — `SailDesktopAgent`'s constructor recovers
 * `TEdge` when it reads `config.appConnection` back out.
 */
export interface SailDesktopAgentConfig {
  appLauncher?: AppLauncher
  apps?: DirectoryApp[]
  userChannels: BrowserTypes.Channel[]
  validation: ValidationMode
  logger?: Logger
  logPayloadDetail: LogPayloadDetail
  initialState?: Partial<AgentState>
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

export interface DesktopAgentAppInstance {
  appId: string
  instanceId: string
  /**
   * Derived from {@link AppInstanceState} rather than restated, so the two can't drift.
   * Stays a string union (not the enum itself) because hosts compare it to string
   * literals — e.g. `sail-one`'s `SailHost.getAppInstanceState`.
   */
  status: `${AppInstanceState}`
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

export function mapToDesktopAgentAppInstance(instance: AppInstance): DesktopAgentAppInstance {
  return {
    appId: instance.appId,
    instanceId: instance.instanceId,
    status: instance.state,
    currentUserChannel: instance.currentUserChannel,
  }
}
