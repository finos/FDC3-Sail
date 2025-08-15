import { beforeAll, afterAll, beforeEach, afterEach } from "vitest"
import { Server } from "socket.io"
import { createServer, Server as NodeServer } from "http"
import { AddressInfo } from "net"
import { initSocketService } from "../../desktop-agent/initSocketService"
import { SailFDC3Server } from "../../desktop-agent/sailFDC3Server"

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
    transports: ["websocket"],
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
    // Clear all active sessions
    testServer.sessions.clear()
    console.log("Test sessions cleared")
  }
}

/**
 * Enhanced cleanup that ensures all resources are properly released
 */
export async function cleanupTestResources(): Promise<void> {
  if (!testServer) return

  try {
    // Close all active FDC3 server sessions
    for (const [sessionId, fdc3Server] of testServer.sessions) {
      try {
        fdc3Server.shutdown()
      } catch (error) {
        console.warn(`Error shutting down session ${sessionId}:`, error)
      }
    }

    // Clear sessions map
    testServer.sessions.clear()

    // Disconnect all sockets
    testServer.io.disconnectSockets(true)

    // Small delay to allow cleanup to complete
    await new Promise((resolve) => setTimeout(resolve, 100))
  } catch (error) {
    console.warn("Error during test resource cleanup:", error)
  }
}

// Vitest setup hooks
beforeAll(async () => {
  await setupTestServer()
  console.log("Test server initialized")
})

afterAll(async () => {
  await teardownTestServer()
  console.log("Test server shut down")
})

// Clean up between each test to prevent interference
beforeEach(async () => {
  await cleanupTestResources()
})

afterEach(async () => {
  await cleanupTestResources()
})
