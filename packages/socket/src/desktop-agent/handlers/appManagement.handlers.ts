import {
  APP_HELLO,
  FDC3_APP_EVENT,
  AppHelloArgs,
  AppHosting,
  SailHostManifest,
} from "@finos/fdc3-sail-common"
import { State, WebAppDetails } from "@finos/fdc3-web-impl"
import {
  AppRequestMessage,
  BroadcastRequest,
  WebConnectionProtocol4ValidateAppIdentity,
  WebConnectionProtocol6Goodbye,
} from "@finos/fdc3-schema/dist/generated/api/BrowserTypes"
import { SailData } from "../sailServerContext"
import {
  SocketIOCallback,
  HandlerContext,
  SocketType,
  CONFIG,
  DirectoryAppEntry,
  getFdc3ServerInstance,
  handleCallbackError,
  LogLevel,
} from "./types"

/** Global state for debug reconnections */
let debugReconnectionNumber = 0

/**
 * Increments and returns the debug reconnection number
 */
function getNextDebugReconnectionNumber(): number {
  return ++debugReconnectionNumber
}

/**
 * Simple structured logger with configurable log levels
 */
const logger = {
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

/**
 * Creates a recovery instance for debug mode when an app connects with invalid instance ID
 * @param appHelloArgs - App hello arguments
 * @param directoryAppList - List of directory apps matching the app ID
 * @param socket - Socket connection
 * @returns Recovery instance data
 */
function createRecoveryInstance(
  appHelloArgs: AppHelloArgs,
  directoryAppList: DirectoryAppEntry[],
  socket: import("socket.io").Socket,
): SailData {
  const [directoryApp] = directoryAppList
  const sailManifest = directoryApp.hostManifests?.sail as
    | SailHostManifest
    | undefined

  return {
    appId: appHelloArgs.appId,
    instanceId: appHelloArgs.instanceId,
    state: State.Pending,
    socket,
    url: (directoryApp.details as WebAppDetails).url,
    hosting: sailManifest?.forceNewWindow ? AppHosting.Tab : AppHosting.Frame,
    channel: null,
    instanceTitle: `${directoryApp.title}${CONFIG.DEBUG_RECONNECTION_SUFFIX}${getNextDebugReconnectionNumber()}`,
    channelSockets: [],
  }
}

/**
 * Handles app hello messages for connection establishment
 * @param appHelloArgs - App hello arguments containing app and instance information
 * @param callback - Socket callback to return hosting type or error
 * @param context - Handler context with socket, connection state, and sessions
 */
async function handleAppHello(
  appHelloArgs: AppHelloArgs,
  callback: SocketIOCallback<AppHosting>,
  { socket, connectionState, sessions }: HandlerContext,
): Promise<void> {
  logger.info("SAIL APP HELLO", appHelloArgs)

  connectionState.appInstanceId = appHelloArgs.instanceId
  connectionState.userSessionId = appHelloArgs.userSessionId
  connectionState.socketType = SocketType.APP

  try {
    const fdc3Server = await getFdc3ServerInstance(
      sessions,
      appHelloArgs.userSessionId,
    )

    if (!fdc3Server) {
      logger.error("App tried connecting to non-existent DA instance", {
        userSessionId: appHelloArgs.userSessionId,
        instanceId: appHelloArgs.instanceId,
      })
      handleCallbackError(
        callback,
        "App tried connecting to non-existent DA instance",
      )
      return
    }

    logger.info("SAIL App connected", {
      userSessionId: appHelloArgs.userSessionId,
      instanceId: appHelloArgs.instanceId,
    })
    const serverContext = fdc3Server.getServerContext()
    const existingInstance = serverContext.getInstanceDetails(
      appHelloArgs.instanceId,
    )
    const directoryAppList = serverContext.directory.retrieveAppsById(
      appHelloArgs.appId,
    )

    // Handle existing pending instance
    if (existingInstance?.state === State.Pending) {
      const updatedInstance: SailData = {
        ...existingInstance,
        socket,
        url:
          directoryAppList.length > 0
            ? (directoryAppList[0].details as WebAppDetails).url
            : existingInstance.url,
      }

      connectionState.fdc3ServerInstance = fdc3Server
      serverContext.setInstanceDetails(appHelloArgs.instanceId, updatedInstance)
      callback(updatedInstance.hosting)
      return
    }

    // Handle debug mode recovery
    if (CONFIG.DEBUG_MODE && directoryAppList.length > 0) {
      logger.warn(
        "App tried to connect with invalid instance ID, allowing connection in debug mode",
        { instanceId: appHelloArgs.instanceId },
      )

      const recoveryInstance = createRecoveryInstance(
        appHelloArgs,
        directoryAppList,
        socket,
      )
      serverContext.setInstanceDetails(
        appHelloArgs.instanceId,
        recoveryInstance,
      )
      connectionState.fdc3ServerInstance = fdc3Server
      callback(recoveryInstance.hosting)
      return
    }

    logger.error("App tried to connect with invalid instance ID", {
      instanceId: appHelloArgs.instanceId,
    })
    handleCallbackError(callback, "Invalid instance id")
  } catch (error) {
    logger.error("Error handling app hello", error)
    handleCallbackError(callback, "Connection error")
  }
}

/**
/**
 * Handles FDC3 app events and forwards them to the server instance
 * @param eventData - FDC3 event data containing type and payload
 * @param sourceId - Source identifier for the event
 * @param context - Handler context containing connection state
 */
function handleFdc3AppEvent(
  eventData:
    | AppRequestMessage
    | WebConnectionProtocol4ValidateAppIdentity
    | WebConnectionProtocol6Goodbye,
  sourceId: string,
  { connectionState }: HandlerContext,
): void {
  if (!eventData.type.startsWith("heartbeat")) {
    logger.debug("SAIL FDC3_APP_EVENT", { eventData, sourceId })
  }

  const { fdc3ServerInstance } = connectionState
  if (!fdc3ServerInstance) {
    logger.error("No server instance available for FDC3 event")
    return
  }
  fdc3ServerInstance.receive(eventData, sourceId)
  try {
    fdc3ServerInstance.receive(eventData, sourceId)

    if (eventData.type === "broadcastRequest") {
      fdc3ServerInstance.serverContext.notifyBroadcastContext(
        eventData as unknown as BroadcastRequest,
      )
    }
  } catch (error) {
    logger.error("Error processing FDC3 message", error)
  }
}

/**
 * Registers app-specific socket handlers
 */
export function registerAppHandlers(context: HandlerContext): void {
  const { socket } = context

  socket.on(
    APP_HELLO,
    (appHelloArgs: AppHelloArgs, callback: SocketIOCallback<AppHosting>) => {
      handleAppHello(appHelloArgs, callback, context)
    },
  )

  socket.on(
    FDC3_APP_EVENT,
    (
      eventData:
        | AppRequestMessage
        | WebConnectionProtocol4ValidateAppIdentity
        | WebConnectionProtocol6Goodbye,
      sourceId: string,
    ) => {
      handleFdc3AppEvent(eventData, sourceId, context)
    },
  )
}
