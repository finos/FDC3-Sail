import { Server } from "socket.io"
import { createServer, Server as NodeServer } from "http"
import { AddressInfo } from "net"
import { initSocketService } from "../../desktop-agent/initSocketService"
import { SailFDC3Server } from "../../desktop-agent/SailFDC3Server"

export interface TestServerContext {
  io: Server
  httpServer: NodeServer
  port: number
  sessions: Map<string, SailFDC3Server>
}

let testServer: TestServerContext | null = null

export async function setupTestServer(): Promise<TestServerContext> {
  if (testServer) {
    return testServer
  }

  const sessions = new Map<string, SailFDC3Server>()
  const httpServer = createServer()
  const io = new Server(httpServer, {
    transports: ["websocket"], // Use websocket only for faster tests
    pingTimeout: 1000,
    pingInterval: 500,
  })

  initSocketService(io, sessions)

  return new Promise((resolve) => {
    httpServer.listen(() => {
      const port = (httpServer.address() as AddressInfo).port
      testServer = { io, httpServer, port, sessions }
      resolve(testServer)
    })
  })
}

export async function teardownTestServer(): Promise<void> {
  if (testServer) {
    testServer.io.close()
    testServer.httpServer.close()
    testServer = null
  }
}

export function getTestServer(): TestServerContext {
  if (!testServer) {
    throw new Error(
      "Test server not initialized. Call setupTestServer() first.",
    )
  }
  return testServer
}

export function clearSessions(): void {
  if (testServer) {
    testServer.sessions.clear()
  }
}
