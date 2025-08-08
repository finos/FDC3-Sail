import { State } from "@finos/fdc3-web-impl"
import { SAIL_APP_STATE } from "@finos/fdc3-sail-common"
import { SailServerContext } from "../SailServerContext"
import { SailFDC3Server } from "../SailFDC3Server"
import { SailData } from "../SailServerContext"
import {
  HandlerContext,
  SocketType,
  CONFIG,
  clearChannelSocketsFromInstance,
} from "./types"

/**
 * Handles app disconnection by updating state and logging remaining apps
 * @param serverContext - Server context for managing app state
 * @param appInstanceId - ID of the app instance being disconnected
 */
async function handleAppDisconnect(
  serverContext: SailServerContext,
  appInstanceId: string,
): Promise<void> {
  await serverContext.setAppState(appInstanceId, State.Terminated)
  const remainingApps = await serverContext.getConnectedApps()
  console.log(`App disconnected. ${remainingApps.length} apps remaining`)
}

/**
 * Handles channel receiver disconnection by clearing channel sockets
 * @param serverContext - Server context for managing instance details
 * @param appInstanceId - ID of the app instance losing channel connection
 */
function handleChannelDisconnect(
  serverContext: SailServerContext,
  appInstanceId: string,
): void {
  const instanceDetails = serverContext.getInstanceDetails(appInstanceId)
  if (instanceDetails) {
    const updatedDetails = {
      ...instanceDetails,
      ...clearChannelSocketsFromInstance({
        ...instanceDetails,
        channelSockets: [...instanceDetails.channelSockets],
      }),
    } as SailData
    serverContext.setInstanceDetails(appInstanceId, updatedDetails)
    console.log("Channel selector disconnected:", appInstanceId)
  }
}

/**
 * Handles desktop agent disconnection by shutting down and cleaning up session
 * @param fdc3Server - FDC3 server instance to shut down
 * @param userSessionId - Session ID to remove from sessions map
 * @param sessions - Map of active sessions to clean up
 */
function handleDesktopAgentDisconnect(
  fdc3Server: SailFDC3Server,
  userSessionId: string,
  sessions: Map<string, SailFDC3Server>,
): void {
  fdc3Server.shutdown()
  sessions.delete(userSessionId)
  console.log("Desktop Agent disconnected:", userSessionId)
}

/**
 * Handles socket disconnection based on connection type with proper cleanup
 * @param context - Handler context with connection state and sessions
 * @param stateReporterTimer - Timer for state reporting that needs to be cleared
 */
async function handleDisconnect(
  { connectionState, sessions }: HandlerContext,
  stateReporterTimer: NodeJS.Timeout,
): Promise<void> {
  const { fdc3ServerInstance, socketType, appInstanceId, userSessionId } =
    connectionState

  if (!fdc3ServerInstance) {
    console.error("No server instance on disconnect")
    clearInterval(stateReporterTimer)
    return
  }

  try {
    switch (socketType) {
      case SocketType.APP:
        if (appInstanceId) {
          await handleAppDisconnect(
            fdc3ServerInstance.serverContext,
            appInstanceId,
          )
        }
        break

      case SocketType.CHANNEL:
        if (appInstanceId) {
          handleChannelDisconnect(
            fdc3ServerInstance.serverContext,
            appInstanceId,
          )
        }
        break

      case SocketType.DESKTOP_AGENT:
        if (userSessionId) {
          handleDesktopAgentDisconnect(
            fdc3ServerInstance,
            userSessionId,
            sessions,
          )
        }
        break

      default:
        console.warn("Unknown socket type on disconnect:", socketType)
    }
  } catch (error) {
    console.error("Error handling disconnect:", error)
  } finally {
    clearInterval(stateReporterTimer)
  }
}

/**
 * Sets up periodic state reporting for the connection to broadcast app states
 * @param context - Handler context with socket and connection state
 * @returns Timer handle for the state reporter interval
 */
export function setupStateReporter(context: HandlerContext): NodeJS.Timeout {
  const { socket, connectionState } = context

  return setInterval(async () => {
    const { fdc3ServerInstance } = connectionState
    if (fdc3ServerInstance) {
      try {
        const appStates = await fdc3ServerInstance.serverContext.getAllApps()
        socket.emit(SAIL_APP_STATE, appStates)
      } catch (error) {
        console.error("Error reporting app state:", error)
      }
    }
  }, CONFIG.STATE_REPORT_INTERVAL_MS)
}

/**
 * Registers disconnect handler for the socket with state reporting setup
 * @param context - Handler context for socket event registration
 */
export function registerDisconnectHandler(context: HandlerContext): void {
  const { socket } = context

  // Set up state reporter
  const stateReporterTimer = setupStateReporter(context)

  // Register disconnect handler
  socket.on("disconnect", async () => {
    await handleDisconnect(context, stateReporterTimer)
  })
}
