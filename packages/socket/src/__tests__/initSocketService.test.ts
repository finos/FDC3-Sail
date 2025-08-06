import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { io as Client, Socket as ClientSocket } from "socket.io-client"
import { getTestServer, clearSessions } from "./setup/setupTests"
import { SailFDC3Server } from "../desktop-agent/SailFDC3Server"
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

  beforeEach((done) => {
    const testServer = getTestServer()
    sessions = testServer.sessions
    port = testServer.port

    // Clear sessions from previous tests
    clearSessions()

    clientSocket = Client(`http://localhost:${port}`, {
      transports: ["websocket"],
    })

    clientSocket.on("connect", done)
  })

  afterEach(() => {
    if (clientSocket) {
      clientSocket.disconnect()
    }
  })

  describe("Desktop Agent Connection Flow", () => {
    it("should handle DA_HELLO and create new session", (done) => {
      const helloArgs: DesktopAgentHelloArgs = {
        userSessionId: "test-session-123",
        channels: [
          { id: "red", icon: "🔴", background: "#ff0000" },
          { id: "blue", icon: "🔵", background: "#0000ff" },
        ],
        directories: ["/path/to/test-apps.json"],
      }

      clientSocket.emit(
        DA_HELLO,
        helloArgs,
        (response: any, error?: string) => {
          expect(error).toBeUndefined()
          expect(response).toBe(true)
          expect(sessions.has("test-session-123")).toBe(true)

          const session = sessions.get("test-session-123")
          expect(session).toBeInstanceOf(SailFDC3Server)
          done()
        },
      )
    })

    it("should update existing session on DA_HELLO", (done) => {
      const helloArgs: DesktopAgentHelloArgs = {
        userSessionId: "test-session-456",
        channels: [{ id: "red", icon: "🔴", background: "#ff0000" }],
        directories: ["/path/to/apps1.json"],
      }

      // First connection
      clientSocket.emit(DA_HELLO, helloArgs, () => {
        expect(sessions.has("test-session-456")).toBe(true)

        // Second connection with updated data
        const updatedArgs = {
          ...helloArgs,
          directories: ["/path/to/apps2.json"],
          channels: [
            { id: "red", icon: "🔴", background: "#ff0000" },
            { id: "green", icon: "🟢", background: "#00ff00" },
          ],
        }

        clientSocket.emit(
          DA_HELLO,
          updatedArgs,
          (response: any, error?: string) => {
            expect(error).toBeUndefined()
            expect(response).toBe(true)
            expect(sessions.has("test-session-456")).toBe(true)
            done()
          },
        )
      })
    })
  })

  describe("App Connection Flow", () => {
    let sessionId: string

    beforeEach((done) => {
      sessionId = "app-test-session"
      const helloArgs: DesktopAgentHelloArgs = {
        userSessionId: sessionId,
        channels: [{ id: "red", icon: "🔴", background: "#ff0000" }],
        directories: [],
      }

      clientSocket.emit(DA_HELLO, helloArgs, () => {
        done()
      })
    })

    it("should register app launch and then handle app connection", (done) => {
      const registerArgs: DesktopAgentRegisterAppLaunchArgs = {
        appId: "test-app",
        userSessionId: sessionId,
        hosting: AppHosting.Tab,
        channel: "red",
        instanceTitle: "Test App Instance",
      }

      // First register the app launch
      clientSocket.emit(
        DA_REGISTER_APP_LAUNCH,
        registerArgs,
        (instanceId: string, error?: string) => {
          expect(error).toBeUndefined()
          expect(instanceId).toMatch(/^sail-app-/)

          // Then simulate app connection
          const appHelloArgs: AppHelloArgs = {
            appId: "test-app",
            instanceId: instanceId,
            userSessionId: sessionId,
          }

          clientSocket.emit(
            APP_HELLO,
            appHelloArgs,
            (hosting: AppHosting, error?: string) => {
              expect(error).toBeUndefined()
              expect(hosting).toBe(AppHosting.Tab)
              done()
            },
          )
        },
      )
    })

    it("should handle APP_HELLO with invalid instance id", (done) => {
      const appHelloArgs: AppHelloArgs = {
        appId: "invalid-app",
        instanceId: "invalid-instance",
        userSessionId: sessionId,
      }

      clientSocket.emit(
        APP_HELLO,
        appHelloArgs,
        (hosting: any, error?: string) => {
          expect(hosting).toBeNull()
          expect(error).toBe("Invalid instance id")
          done()
        },
      )
    })
  })

  describe("Directory Listing", () => {
    it("should return empty directory for new session", (done) => {
      const sessionId = "directory-test-session"
      const helloArgs: DesktopAgentHelloArgs = {
        userSessionId: sessionId,
        channels: [],
        directories: [],
      }

      clientSocket.emit(DA_HELLO, helloArgs, () => {
        const listingArgs: DesktopAgentDirectoryListingArgs = {
          userSessionId: sessionId,
        }

        clientSocket.emit(
          DA_DIRECTORY_LISTING,
          listingArgs,
          (apps: any[], error?: string) => {
            expect(error).toBeUndefined()
            expect(Array.isArray(apps)).toBe(true)
            expect(apps).toHaveLength(0)
            done()
          },
        )
      })
    })

    it("should handle directory listing for non-existent session", (done) => {
      const listingArgs: DesktopAgentDirectoryListingArgs = {
        userSessionId: "non-existent-session",
      }

      clientSocket.emit(
        DA_DIRECTORY_LISTING,
        listingArgs,
        (apps: any, error?: string) => {
          expect(apps).toBeNull()
          expect(error).toBe("Session not found")
          done()
        },
      )
    })
  })

  describe("Channel Receiver Connection", () => {
    let sessionId: string
    let instanceId: string

    beforeEach((done) => {
      sessionId = "channel-test-session"
      const helloArgs: DesktopAgentHelloArgs = {
        userSessionId: sessionId,
        channels: [
          { id: "red", icon: "🔴", background: "#ff0000" },
          { id: "blue", icon: "🔵", background: "#0000ff" },
        ],
        directories: [],
      }

      clientSocket.emit(DA_HELLO, helloArgs, () => {
        const registerArgs: DesktopAgentRegisterAppLaunchArgs = {
          appId: "channel-test-app",
          userSessionId: sessionId,
          hosting: AppHosting.Tab,
          channel: "red",
          instanceTitle: "Channel Test App",
        }

        clientSocket.emit(
          DA_REGISTER_APP_LAUNCH,
          registerArgs,
          (id: string) => {
            instanceId = id
            done()
          },
        )
      })
    })

    it("should handle channel receiver connection", (done) => {
      const channelHelloArgs: ChannelReceiverHelloRequest = {
        userSessionId: sessionId,
        instanceId: instanceId,
      }

      clientSocket.emit(
        CHANNEL_RECEIVER_HELLO,
        channelHelloArgs,
        (update: any, error?: string) => {
          expect(error).toBeUndefined()
          expect(update).toBeDefined()
          expect(update.tabs).toBeDefined()
          expect(Array.isArray(update.tabs)).toBe(true)
          done()
        },
      )
    })

    it("should handle channel receiver connection for non-existent app", (done) => {
      const channelHelloArgs: ChannelReceiverHelloRequest = {
        userSessionId: sessionId,
        instanceId: "non-existent-instance",
      }

      clientSocket.emit(
        CHANNEL_RECEIVER_HELLO,
        channelHelloArgs,
        (update: any, error?: string) => {
          expect(update).toBeUndefined()
          expect(error).toBe("No app found")
          done()
        },
      )
    })
  })

  describe("Session Management", () => {
    it("should clean up session on disconnect", (done) => {
      const sessionId = "cleanup-test-session"
      const helloArgs: DesktopAgentHelloArgs = {
        userSessionId: sessionId,
        channels: [],
        directories: [],
      }

      clientSocket.emit(DA_HELLO, helloArgs, () => {
        expect(sessions.has(sessionId)).toBe(true)

        clientSocket.disconnect()

        // Give it a moment to process the disconnect
        setTimeout(() => {
          expect(sessions.has(sessionId)).toBe(false)
          done()
        }, 100)
      })
    })
  })
})
