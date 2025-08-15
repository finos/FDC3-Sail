import { Server, Socket } from "socket.io"
import { SailFDC3Server } from "./sailFDC3Server"
import {
  SocketConnectionState,
  HandlerContext,
  registerElectronHandlers,
  registerDesktopAgentHandlers,
  registerAppHandlers,
  registerChannelHandlers,
  registerDisconnectHandler,
} from "./handlers"

/**
 * Initializes the Socket.IO service for handling FDC3 communications
 * @param io - The Socket.IO server instance
 * @param sessions - Map to store active FDC3 server sessions
 * @returns The configured Socket.IO server
 */
export function initSocketService(
  io: Server,
  sessions: Map<string, SailFDC3Server>,
): Server {
  io.on("connection", (socket: Socket) => {
    console.log("New socket connection established:", socket.id)

    // Initialize connection state
    const connectionState: SocketConnectionState = {}

    // Create handler context
    const context: HandlerContext = {
      socket,
      connectionState,
      sessions,
    }

    // Register all handlers
    registerElectronHandlers(context)
    registerDesktopAgentHandlers(context)
    registerAppHandlers(context)
    registerChannelHandlers(context)
    registerDisconnectHandler(context)

    console.log("All socket handlers registered for connection:", socket.id)
  })

  return io
}
