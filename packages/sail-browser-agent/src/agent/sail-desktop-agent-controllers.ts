/**
 * Host controller factories for {@link SailDesktopAgent}.
 */

import type { BrowserTypes, Context } from "@finos/fdc3"
import type { AppConnectionMetadata } from "../app-connection/browser-app-connection"
import type { AgentAppConnection } from "../app-connection/types"
import type { DirectoryApp } from "../app-directory/types"
import { NoChannelFoundError } from "../errors/fdc3-errors"
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

/** Backing for host-initiated user-channel join/leave. */
export interface ChannelChangeBacking {
  getUserChannels: () => BrowserTypes.Channel[]
  setAppUserChannel: (instanceId: string, channelId: string | null) => void
  appConnection: AgentAppConnection
  channelChangeTimeoutMs: number
}

/**
 * Host-initiated user channel join or leave for an app instance.
 * Waits for the app-connection `channelChanged` event (or times out).
 */
export function changeAppChannel(
  backing: ChannelChangeBacking,
  instanceId: string,
  channelId: string | null,
): Promise<void> {
  if (channelId !== null && !backing.getUserChannels().find(channel => channel.id === channelId)) {
    return Promise.reject(new NoChannelFoundError(`Channel "${channelId}" does not exist`))
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
      backing.setAppUserChannel(instanceId, channelId)
    } catch (error) {
      cleanup()
      reject(error instanceof Error ? error : new Error(String(error)))
    }
  })
}

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
