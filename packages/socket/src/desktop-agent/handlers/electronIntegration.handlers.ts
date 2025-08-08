import { v4 as uuid } from "uuid"
import {
  ELECTRON_HELLO,
  ElectronHelloArgs,
  ElectronAppResponse,
  ElectronDAResponse,
} from "@finos/fdc3-sail-common"
import { SailAppInstanceManager } from "../sailAppInstanceManager"
import { AppDirectoryManager } from "../../app-directory/appDirectoryManager"
import { SailFDC3Server } from "../sailFDC3Server"
import {
  SocketIOCallback,
  HandlerContext,
  CONFIG,
  handleCallbackError,
} from "./types"

/**
 * Gets the Sail URL from environment variables or returns default
 */
function getSailUrl(): string {
  return process.env.SAIL_URL || "http://localhost:8090"
}

/**
 * Handles Electron hello messages for app discovery and Desktop Agent initialization
 * @param electronHelloArgs - Electron hello arguments with URL and session info
 * @param callback - Socket callback to return app or DA response
 * @param context - Handler context with socket, connection state, and sessions
 */
function handleElectronHello(
  electronHelloArgs: ElectronHelloArgs,
  callback: SocketIOCallback<ElectronAppResponse | ElectronDAResponse>,
  { socket, connectionState, sessions }: HandlerContext,
): void {
  console.log(`SAIL ELECTRON HELLO: ${JSON.stringify(electronHelloArgs)}`)
  const existingServer = sessions.get(electronHelloArgs.userSessionId)

  if (existingServer) {
    const matchingAppList = existingServer
      .getDirectory()
      .retrieveAppsByUrl(electronHelloArgs.url)

    if (matchingAppList.length > 0) {
      const [firstApp] = matchingAppList
      console.log("SAIL Found app", firstApp.appId)

      const response: ElectronAppResponse = {
        type: "app",
        userSessionId: electronHelloArgs.userSessionId,
        appId: firstApp.appId,
        instanceId: `${CONFIG.APP_INSTANCE_PREFIX}${uuid()}`,
        intentResolver: null,
        channelSelector: null,
      }
      callback(response)
    } else {
      console.error("App not found", electronHelloArgs.url)
      handleCallbackError(callback, "App not found")
    }
  } else if (electronHelloArgs.url === getSailUrl()) {
    connectionState.userSessionId = electronHelloArgs.userSessionId
    const serverContext = new SailServerContext(
      new AppDirectoryManager(),
      socket,
    )
    const newServer = new SailFDC3Server(serverContext, electronHelloArgs)
    serverContext.setFDC3Server(newServer)
    sessions.set(electronHelloArgs.userSessionId, newServer)

    const response: ElectronDAResponse = { type: "da" }
    callback(response)
  } else {
    console.error("Session not found", connectionState.userSessionId)
    handleCallbackError(callback, "Session not found")
  }
}

/**
 * Registers electron-specific socket handlers
 */
export function registerElectronHandlers(context: HandlerContext): void {
  const { socket } = context

  socket.on(
    ELECTRON_HELLO,
    (
      electronHelloArgs: ElectronHelloArgs,
      callback: SocketIOCallback<ElectronAppResponse | ElectronDAResponse>,
    ) => {
      handleElectronHello(electronHelloArgs, callback, context)
    },
  )
}
