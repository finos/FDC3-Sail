import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { io as Client, Socket as ClientSocket } from "socket.io-client"
import { getTestServer, clearSessions } from "./setup/setupTests"
import { SailFDC3Server } from "../desktop-agent/sailFDC3Server"
import {
  DA_HELLO,
  APP_HELLO,
  DA_DIRECTORY_LISTING,
  DA_REGISTER_APP_LAUNCH,
  CHANNEL_RECEIVER_HELLO,
  DesktopAgentHelloArgs,
  AppHelloArgs,
  DesktopAgentDirectoryListingArgs,
  DesktopAgentRegisterAppLaunchArgs,
  ChannelReceiverHelloRequest,
  AppHosting,
} from "@finos/fdc3-sail-common"

describe("initSocketService Integration Tests", () => {
  let clientSocket: ClientSocket
  let sessions: Map<string, SailFDC3Server>
  let port: number

  beforeEach(async () => {
    const testServer = getTestServer()
    sessions = testServer.sessions
    port = testServer.port

    // Clear sessions from previous tests
    clearSessions()

    clientSocket = Client(`http://localhost:${port}`, {
      transports: ["websocket"],
    })

    await new Promise<void>((resolve) => {
      clientSocket.on("connect", resolve)
    })
  })

  afterEach(() => {
    if (clientSocket) {
      clientSocket.disconnect()
    }
  })

  describe("Desktop Agent Connection Flow", () => {
    it("should handle DA_HELLO and create new session", async () => {
      const helloArgs: DesktopAgentHelloArgs = {
        userSessionId: "test-session-123",
        channels: [
          { id: "red", icon: "🔴", background: "#ff0000" },
          { id: "blue", icon: "🔵", background: "#0000ff" },
        ],
        directories: ["/path/to/test-apps.json"],
        panels: [],
        customApps: [],
        contextHistory: {},
      }

      await new Promise<void>((resolve) => {
        clientSocket.emit(
          DA_HELLO,
          helloArgs,
          (response: boolean, error?: string) => {
            expect(error).toBeUndefined()
            expect(response).toBe(true)
            expect(sessions.has("test-session-123")).toBe(true)

            const session = sessions.get("test-session-123")
            expect(session).toBeInstanceOf(SailFDC3Server)
            resolve()
          },
        )
      })
    })

    it("should update existing session on DA_HELLO", async () => {
      const helloArgs: DesktopAgentHelloArgs = {
        userSessionId: "test-session-456",
        channels: [{ id: "red", icon: "🔴", background: "#ff0000" }],
        directories: ["/path/to/apps1.json"],
        panels: [],
        customApps: [],
        contextHistory: {},
      }

      // First connection
      await new Promise<void>((resolve) => {
        clientSocket.emit(DA_HELLO, helloArgs, () => {
          expect(sessions.has("test-session-456")).toBe(true)
          resolve()
        })
      })

      // Second connection with updated data
      const updatedArgs = {
        ...helloArgs,
        directories: ["/path/to/apps2.json"],
        channels: [
          { id: "red", icon: "🔴", background: "#ff0000" },
          { id: "green", icon: "🟢", background: "#00ff00" },
        ],
      }

      await new Promise<void>((resolve) => {
        clientSocket.emit(
          DA_HELLO,
          updatedArgs,
          (response: boolean, error?: string) => {
            expect(error).toBeUndefined()
            expect(response).toBe(true)
            expect(sessions.has("test-session-456")).toBe(true)
            resolve()
          },
        )
      })
    })
  })

  describe("App Connection Flow", () => {
    let sessionId: string

    beforeEach(async () => {
      sessionId = "app-test-session"
      const helloArgs: DesktopAgentHelloArgs = {
        userSessionId: sessionId,
        channels: [{ id: "red", icon: "🔴", background: "#ff0000" }],
        directories: [],
        panels: [],
        customApps: [],
        contextHistory: {},
      }

      await new Promise<void>((resolve) => {
        clientSocket.emit(DA_HELLO, helloArgs, () => {
          resolve()
        })
      })
    })

    it("should register app launch and then handle app connection", async () => {
      const registerArgs: DesktopAgentRegisterAppLaunchArgs = {
        appId: "test-app",
        userSessionId: sessionId,
        hosting: AppHosting.Tab,
        channel: "red",
        instanceTitle: "Test App Instance",
      }

      // First register the app launch
      const instanceId = await new Promise<string>((resolve) => {
        clientSocket.emit(
          DA_REGISTER_APP_LAUNCH,
          registerArgs,
          (instanceId: string, error?: string) => {
            expect(error).toBeUndefined()
            expect(instanceId).toMatch(/^sail-app-/)
            resolve(instanceId)
          },
        )
      })

      // Then simulate app connection
      const appHelloArgs: AppHelloArgs = {
        appId: "test-app",
        instanceId: instanceId,
        userSessionId: sessionId,
      }

      await new Promise<void>((resolve) => {
        clientSocket.emit(
          APP_HELLO,
          appHelloArgs,
          (hosting: AppHosting, error?: string) => {
            expect(error).toBeUndefined()
            expect(hosting).toBe(AppHosting.Tab)
            resolve()
          },
        )
      })
    })

    it("should handle APP_HELLO with invalid instance id", async () => {
      const appHelloArgs: AppHelloArgs = {
        appId: "invalid-app",
        instanceId: "invalid-instance",
        userSessionId: sessionId,
      }

      await new Promise<void>((resolve) => {
        clientSocket.emit(
          APP_HELLO,
          appHelloArgs,
          (hosting: unknown, error?: string) => {
            expect(hosting).toBeNull()
            expect(error).toBe("Invalid instance id")
            resolve()
          },
        )
      })
    })
  })

  describe("Directory Listing", () => {
    it("should return empty directory for new session", async () => {
      const sessionId = "directory-test-session"
      const helloArgs: DesktopAgentHelloArgs = {
        userSessionId: sessionId,
        channels: [],
        directories: [],
        panels: [],
        customApps: [],
        contextHistory: {},
      }

      await new Promise<void>((resolve) => {
        clientSocket.emit(DA_HELLO, helloArgs, () => {
          resolve()
        })
      })

      const listingArgs: DesktopAgentDirectoryListingArgs = {
        userSessionId: sessionId,
      }

      await new Promise<void>((resolve) => {
        clientSocket.emit(
          DA_DIRECTORY_LISTING,
          listingArgs,
          (apps: any[], error?: string) => {
            expect(error).toBeUndefined()
            expect(Array.isArray(apps)).toBe(true)
            expect(apps).toHaveLength(0)
            resolve()
          },
        )
      })
    })

    it("should create new session without app directory and have no apps", async () => {
      const sessionId = "no-app-directory-session"
      const helloArgs: DesktopAgentHelloArgs = {
        userSessionId: sessionId,
        channels: [
          { id: "red", icon: "🔴", background: "#ff0000" },
          { id: "blue", icon: "🔵", background: "#0000ff" },
        ],
        directories: [],
        panels: [],
        customApps: [],
        contextHistory: {},
      }

      await new Promise<void>((resolve) => {
        clientSocket.emit(
          DA_HELLO,
          helloArgs,
          (response: boolean, error?: string) => {
            expect(error).toBeUndefined()
            expect(response).toBe(true)
            expect(sessions.has(sessionId)).toBe(true)

            const session = sessions.get(sessionId)
            expect(session).toBeInstanceOf(SailFDC3Server)
            resolve()
          },
        )
      })

      // Verify the session has no apps
      const listingArgs: DesktopAgentDirectoryListingArgs = {
        userSessionId: sessionId,
      }

      await new Promise<void>((resolve) => {
        clientSocket.emit(
          DA_DIRECTORY_LISTING,
          listingArgs,
          (apps: any[], error?: string) => {
            expect(error).toBeUndefined()
            expect(Array.isArray(apps)).toBe(true)
            expect(apps).toHaveLength(0)
            resolve()
          },
        )
      })
    })

    it("should handle directory listing for non-existent session", async () => {
      const listingArgs: DesktopAgentDirectoryListingArgs = {
        userSessionId: "non-existent-session",
      }

      await new Promise<void>((resolve) => {
        clientSocket.emit(
          DA_DIRECTORY_LISTING,
          listingArgs,
          (apps: any, error?: string) => {
            expect(apps).toBeNull()
            expect(error).toBe("Session not found")
            resolve()
          },
        )
      })
    })
  })

  describe("Channel Receiver Connection", () => {
    let sessionId: string
    let instanceId: string

    beforeEach(async () => {
      sessionId = "channel-test-session"
      const helloArgs: DesktopAgentHelloArgs = {
        userSessionId: sessionId,
        channels: [
          { id: "red", icon: "🔴", background: "#ff0000" },
          { id: "blue", icon: "🔵", background: "#0000ff" },
        ],
        directories: [],
        panels: [],
        customApps: [],
        contextHistory: {},
      }

      await new Promise<void>((resolve) => {
        clientSocket.emit(DA_HELLO, helloArgs, () => {
          resolve()
        })
      })

      const registerArgs: DesktopAgentRegisterAppLaunchArgs = {
        appId: "channel-test-app",
        userSessionId: sessionId,
        hosting: AppHosting.Tab,
        channel: "red",
        instanceTitle: "Channel Test App",
      }

      instanceId = await new Promise<string>((resolve) => {
        clientSocket.emit(
          DA_REGISTER_APP_LAUNCH,
          registerArgs,
          (id: string) => {
            resolve(id)
          },
        )
      })
    })

    it("should handle channel receiver connection", async () => {
      const channelHelloArgs: ChannelReceiverHelloRequest = {
        userSessionId: sessionId,
        instanceId: instanceId,
      }

      await new Promise<void>((resolve) => {
        clientSocket.emit(
          CHANNEL_RECEIVER_HELLO,
          channelHelloArgs,
          (update: any, error?: string) => {
            expect(error).toBeUndefined()
            expect(update).toBeDefined()
            expect(update.tabs).toBeDefined()
            expect(Array.isArray(update.tabs)).toBe(true)
            resolve()
          },
        )
      })
    })

    it("should handle channel receiver connection for non-existent app", async () => {
      const channelHelloArgs: ChannelReceiverHelloRequest = {
        userSessionId: sessionId,
        instanceId: "non-existent-instance",
      }

      await new Promise<void>((resolve) => {
        clientSocket.emit(
          CHANNEL_RECEIVER_HELLO,
          channelHelloArgs,
          (update: any, error?: string) => {
            expect(update).toBeNull()
            expect(error).toBe("No app found")
            resolve()
          },
        )
      })
    })
  })

  describe("Session Management", () => {
    it("should clean up session on disconnect", async () => {
      const sessionId = "cleanup-test-session"
      const helloArgs: DesktopAgentHelloArgs = {
        userSessionId: sessionId,
        channels: [],
        directories: [],
        panels: [],
        customApps: [],
        contextHistory: {},
      }

      await new Promise<void>((resolve) => {
        clientSocket.emit(DA_HELLO, helloArgs, () => {
          expect(sessions.has(sessionId)).toBe(true)
          resolve()
        })
      })

      clientSocket.disconnect()

      // Give it a moment to process the disconnect
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(sessions.has(sessionId)).toBe(false)
          resolve()
        }, 100)
      })
    })
  })
})
