/**
 * Host controller factories for {@link SailDesktopAgent}.
 *
 * Each factory combines a narrow "backing" of already-bound agent operations (the class keeps
 * the underlying methods private) with `appConnection` event wiring into the public grouped
 * controller shape (`apps`, `channels`, `intentResolver`). Extracted from `sail-desktop-agent.ts`
 * to keep the class file focused on agent state and DACP routing.
 */

import type { BrowserTypes, Context } from "@finos/fdc3"
import type { AppConnectionMetadata } from "../app-connection/browser-app-connection"
import type { AgentAppConnection } from "../app-connection/types"
import type { DirectoryApp } from "../app-directory/types"
import { NoChannelFoundError } from "../errors/fdc3-errors"
import {
  handleJoinUserChannelRequest,
  handleLeaveCurrentChannelRequest,
} from "../handlers/channels/handlers"
import type { DACPHandlerParams } from "../handlers/types"
import type {
  HostIntentResolverChoice,
  HostIntentResolverHandler,
  IntentHandler,
  IntentResolver,
  IntentResolverUIMethods,
  IntentResolutionChoice,
  IntentResolutionRequest,
} from "../host-contracts"
import type { Logger } from "../logging/logger"
import { getInstance, getUserChannel } from "../state/selectors"
import type { AgentState } from "../state/types"
import type {
  DesktopAgentAppInstance,
  DesktopAgentOpenOptions,
  SailDesktopAgentOptions,
} from "./sail-desktop-agent-types"

export interface AppChannelChangeEvent {
  instanceId: string
  channelId: string | null
  channel: BrowserTypes.Channel | null
}

export interface HandshakeFailureEvent {
  error: Error
  connectionAttemptUuid: string
}

export interface SailDesktopAgentChannels {
  getUserChannels: () => BrowserTypes.Channel[]
  getAppChannelId: (instanceId: string) => string | null
  getAppChannel: (instanceId: string) => BrowserTypes.Channel | null
  changeAppChannel: (instanceId: string, channelId: string | null) => Promise<void>
  onAppChannelChange: (listener: (event: AppChannelChangeEvent) => void) => () => void
}

export interface SailDesktopAgentApps {
  add: (app: DirectoryApp) => void
  addAll: (apps: DirectoryApp[]) => void
  addDirectory: (url: string) => Promise<void>
  remove: (appId: string) => void
  getAll: () => DirectoryApp[]
  getById: (appId: string) => DirectoryApp | undefined
  open: (
    app: string | BrowserTypes.AppIdentifier,
    options?: DesktopAgentOpenOptions,
  ) => Promise<BrowserTypes.AppIdentifier>
  getInstances: () => DesktopAgentAppInstance[]
  getInstance: (instanceId: string) => DesktopAgentAppInstance | undefined
  getConnections: () => AppConnectionMetadata[]
  getConnection: (instanceId: string) => AppConnectionMetadata | undefined
  disconnect: (instanceId: string) => void
  onConnect: (listener: (metadata: AppConnectionMetadata) => void) => () => void
  onDisconnect: (listener: (instanceId: string) => void) => () => void
  onHandshakeFailure: (listener: (event: HandshakeFailureEvent) => void) => () => void
}

export interface SailDesktopAgentHostControllers {
  intentResolver: IntentResolverUIMethods
  channels: SailDesktopAgentChannels
  apps: SailDesktopAgentApps
}

export function resolveUserChannelById(
  userChannels: BrowserTypes.Channel[],
  channelId: string | null,
): BrowserTypes.Channel | null {
  if (channelId === null) {
    return null
  }
  return userChannels.find(channel => channel.id === channelId) ?? null
}

export function hasIntentResolverUI(
  resolver: IntentResolver,
): resolver is IntentResolver & IntentResolverUIMethods {
  const candidate = resolver as Partial<IntentResolverUIMethods>
  return (
    typeof candidate.onRequest === "function" &&
    typeof candidate.select === "function" &&
    typeof candidate.cancel === "function" &&
    typeof candidate.getPendingRequests === "function"
  )
}

function mapHandler(intentName: string, handler: HostIntentResolverHandler): IntentHandler {
  return {
    app: handler,
    intent: { name: intentName, displayName: intentName },
    instanceId: handler.instanceId,
    isRunning: handler.isRunning,
  }
}

function mapChoice(choice: HostIntentResolverChoice): IntentResolutionChoice {
  return {
    intent: choice.intent,
    handler: {
      ...mapHandler(choice.intent.name, choice.handler),
      intent: choice.intent,
    },
  }
}

export function createIntentResolverController(
  resolverUI: IntentResolverUIMethods | undefined,
): IntentResolverUIMethods {
  return {
    getPendingRequests: () => resolverUI?.getPendingRequests() ?? [],
    onRequest: listener => resolverUI?.onRequest(listener) ?? (() => {}),
    select: (requestId, choice) => {
      if (!resolverUI) {
        throw new Error(
          "Cannot select intent resolution: host intentResolver does not provide UI methods",
        )
      }
      resolverUI.select(requestId, choice)
    },
    cancel: requestId => {
      if (!resolverUI) {
        throw new Error(
          "Cannot cancel intent resolution: host intentResolver does not provide UI methods",
        )
      }
      resolverUI.cancel(requestId)
    },
  }
}

/** Backing operations {@link changeAppUserChannel} / {@link changeAppChannel} wrap. */
interface ChannelOperationsBacking {
  getState: () => AgentState
  createHandlerParams: (instanceId: string) => DACPHandlerParams
  getUserChannels: () => BrowserTypes.Channel[]
  appConnection: AgentAppConnection
  channelChangeTimeoutMs: number
}

/**
 * Host-initiated user channel join or leave for an app instance.
 *
 * Runs the same DACP join/leave handlers as app-originated requests but does not
 * require an app MessagePort to receive the response. When no apps registered
 * `channelChanged` event listeners, emits a `channelChangedEvent` on the app edge
 * so host UI can observe membership changes.
 */
export function changeAppUserChannel(
  backing: Pick<ChannelOperationsBacking, "getState" | "createHandlerParams">,
  instanceId: string,
  channelId: string | null,
): void {
  const state = backing.getState()
  if (channelId !== null && !getUserChannel(state, channelId)) {
    throw new NoChannelFoundError(`Channel ${channelId} does not exist`)
  }

  const params = backing.createHandlerParams(instanceId)
  const requestUuid = crypto.randomUUID()
  const instance = getInstance(state, instanceId)
  const source: BrowserTypes.AppIdentifier = {
    appId: instance?.appId ?? "unknown",
    instanceId,
  }
  const meta: BrowserTypes.AppRequestMessageMeta = {
    requestUuid,
    timestamp: new Date(),
    source,
  }

  const hostInitiated = { hostInitiated: true as const }

  if (channelId !== null) {
    handleJoinUserChannelRequest(
      { type: "joinUserChannelRequest", payload: { channelId }, meta },
      params,
      hostInitiated,
    )
  } else {
    handleLeaveCurrentChannelRequest(
      { type: "leaveCurrentChannelRequest", payload: {}, meta },
      params,
      hostInitiated,
    )
  }
}

/** Promise + timeout + `channelChanged` correlation over {@link changeAppUserChannel}. */
export function changeAppChannel(
  backing: ChannelOperationsBacking,
  instanceId: string,
  channelId: string | null,
): Promise<void> {
  if (channelId !== null && !backing.getUserChannels().find(channel => channel.id === channelId)) {
    return Promise.reject(new Error(`Channel "${channelId}" does not exist`))
  }

  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup()
      reject(new Error(`Channel change timeout for instance ${instanceId}`))
    }, backing.channelChangeTimeoutMs)

    const handleChannelChanged = (changedInstanceId: string, changedChannelId: string | null) => {
      if (changedInstanceId === instanceId && changedChannelId === channelId) {
        cleanup()
        resolve()
      }
    }

    const cleanup = () => {
      clearTimeout(timeout)
      backing.appConnection.off?.("channelChanged", handleChannelChanged)
    }

    backing.appConnection.on?.("channelChanged", handleChannelChanged)

    try {
      changeAppUserChannel(backing, instanceId, channelId)
    } catch (error) {
      cleanup()
      reject(error instanceof Error ? error : new Error(String(error)))
    }
  })
}

/**
 * Wraps the agent's own channel operations with the two members it cannot supply itself:
 * `getAppChannel` (derived) and `onAppChannelChange` (`appConnection` event wiring).
 */
export function createChannelsController(
  backing: Omit<SailDesktopAgentChannels, "getAppChannel" | "onAppChannelChange">,
  appConnection: AgentAppConnection,
): SailDesktopAgentChannels {
  return {
    ...backing,
    getAppChannel: instanceId =>
      resolveUserChannelById(backing.getUserChannels(), backing.getAppChannelId(instanceId)),
    onAppChannelChange: listener => {
      const handler = (instanceId: string, channelId: string | null) => {
        listener({
          instanceId,
          channelId,
          channel: resolveUserChannelById(backing.getUserChannels(), channelId),
        })
      }
      appConnection.on?.("channelChanged", handler)
      return () => {
        appConnection.off?.("channelChanged", handler)
      }
    },
  }
}

/**
 * Wraps the agent's own app-directory and instance operations with the four members it cannot
 * supply itself — all of which are `appConnection` lifecycle wiring.
 */
export function createAppsController(
  backing: Omit<
    SailDesktopAgentApps,
    "disconnect" | "onConnect" | "onDisconnect" | "onHandshakeFailure"
  >,
  appConnection: AgentAppConnection,
): SailDesktopAgentApps {
  return {
    ...backing,
    disconnect: instanceId => {
      // Prefer the graceful host-initiated disconnect (sends WCP6Goodbye) when the edge
      // supports it; fall back to the plain teardown every AgentAppConnection provides.
      if (appConnection.disconnectAppByInstanceId) {
        appConnection.disconnectAppByInstanceId(instanceId)
      } else {
        appConnection.pruneAppConnection(instanceId)
      }
    },
    onConnect: listener => {
      appConnection.on?.("appConnected", listener)
      return () => {
        appConnection.off?.("appConnected", listener)
      }
    },
    onDisconnect: listener => {
      appConnection.on?.("appDisconnected", listener)
      return () => {
        appConnection.off?.("appDisconnected", listener)
      }
    },
    onHandshakeFailure: listener => {
      const handler = (error: Error, connectionAttemptUuid: string) => {
        listener({ error, connectionAttemptUuid })
      }
      appConnection.on?.("handshakeFailed", handler)
      return () => {
        appConnection.off?.("handshakeFailed", handler)
      }
    },
  }
}

/** Wires host-resolver UI callbacks to `appConnection`'s `intentResolverNeeded` WCP event. */
export function wireIntentResolver(
  appConnection: AgentAppConnection,
  resolver: IntentResolver,
  logger: Logger,
): void {
  appConnection.on?.("intentResolverNeeded", payload => {
    void (async () => {
      try {
        const request: IntentResolutionRequest = {
          requestId: payload.requestId,
          intent: payload.intent,
          context: payload.context as Context,
          handlers:
            payload.choices?.map(choice => mapChoice(choice).handler) ??
            payload.handlers.map(handler => mapHandler(payload.intent, handler)),
          choices:
            payload.choices?.map(choice => mapChoice(choice)) ??
            payload.handlers.map(handler => ({
              intent: { name: payload.intent, displayName: payload.intent },
              handler: mapHandler(payload.intent, handler),
            })),
        }

        const response = await resolver.resolve(request)

        appConnection.resolveIntentSelection?.({
          requestId: payload.requestId,
          selectedHandler: response
            ? {
                appId: response.target.appId,
                instanceId: response.target.instanceId,
              }
            : null,
          ...(response?.intent ? { intent: response.intent } : {}),
        })
      } catch (error) {
        // Host resolver throw is not the same as user cancel — log before settling null.
        logger.error(
          `[SailDesktopAgent] Host intent resolver threw; cancelling resolution for ${payload.requestId}:`,
          error instanceof Error ? error : new Error(String(error)),
        )
        appConnection.resolveIntentSelection?.({
          requestId: payload.requestId,
          selectedHandler: null,
        })
      }
    })()
  })
}

/** Wires `appConnection` connection-lifecycle events to shell-supplied option callbacks. */
export function wireLifecycleCallbacks(
  appConnection: AgentAppConnection,
  logger: Logger,
  options: Pick<
    SailDesktopAgentOptions,
    "onAppConnected" | "onAppDisconnected" | "onHandshakeFailed"
  >,
): void {
  appConnection.on?.("appConnected", metadata => {
    logger.info(`[SailDesktopAgent] App connected: ${metadata.appId} (${metadata.instanceId})`)
    options.onAppConnected?.(metadata)
  })

  appConnection.on?.("appDisconnected", instanceId => {
    logger.info(`[SailDesktopAgent] App disconnected: ${instanceId}`)
    options.onAppDisconnected?.(instanceId)
  })

  appConnection.on?.("handshakeFailed", (error, connectionAttemptUuid) => {
    logger.error(`[SailDesktopAgent] WCP handshake failed for ${connectionAttemptUuid}:`, error)
    options.onHandshakeFailed?.(error, connectionAttemptUuid)
  })
}
