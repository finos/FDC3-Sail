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
  AugmentedAppMetadata,
  ChannelReceiverUpdate,
} from "@finos/fdc3-sail-common"
import { IntentMetadata } from "@finos/fdc3-standard"
import path from "path"

describe("End-to-End Integration Tests", () => {
  let clientSocket: ClientSocket
  let port: number
  let sessions: Map<string, SailFDC3Server>

  beforeEach(async () => {
    const testServer = getTestServer()
    port = testServer.port
    sessions = testServer.sessions
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

  describe("Complete Desktop Agent Workflow", () => {
    it("should handle complete DA setup -> directory loading -> app registration flow", async () => {
      const sessionId = "integration-test-session"

      // Step 1: Desktop Agent Hello with real app directories
      const helloArgs: DesktopAgentHelloArgs = {
        userSessionId: sessionId,
        channels: [
          { id: "red", icon: "🔴", background: "#ff0000" },
          { id: "blue", icon: "🔵", background: "#0000ff" },
        ],
        directories: [
          path.resolve(__dirname, "testData/webApps.json"),
          path.resolve(__dirname, "testData/nativeApps.json"),
        ],
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
            resolve()
          },
        )
      })

      // Step 2: Verify directory was loaded with realistic apps
      const listingArgs: DesktopAgentDirectoryListingArgs = {
        userSessionId: sessionId,
      }

      const apps = await new Promise<AugmentedAppMetadata[]>((resolve) => {
        clientSocket.emit(
          DA_DIRECTORY_LISTING,
          listingArgs,
          (apps: AugmentedAppMetadata[], error?: string) => {
            expect(error).toBeUndefined()
            expect(Array.isArray(apps)).toBe(true)

            // Test data validation with better error messages
            if (apps.length === 0) {
              const webAppsPath = path.resolve(
                __dirname,
                "testData/webApps.json",
              )
              const nativeAppsPath = path.resolve(
                __dirname,
                "testData/nativeApps.json",
              )
              throw new Error(
                "No apps loaded from directory. This indicates test data files are missing or invalid.\n" +
                  `Expected files:\n` +
                  `- ${webAppsPath}\n` +
                  `- ${nativeAppsPath}`,
              )
            }

            // Validate expected test apps are present
            const expectedApps = ["market-terminal", "excel-addin"]
            const appIds = apps.map((app) => app.appId)
            expectedApps.forEach((expectedApp) => {
              if (!appIds.includes(expectedApp)) {
                throw new Error(
                  `Expected test app '${expectedApp}' not found in loaded apps: ${appIds.join(", ")}`,
                )
              }
            })

            expect(apps.length).toBeGreaterThan(0)
            resolve(apps)
          },
        )
      })

      // Step 3: Verify we have realistic FDC3 apps with intents
      const marketTerminal = apps.find((app) => app.appId === "market-terminal")
      const excelAddin = apps.find((app) => app.appId === "excel-addin")

      expect(marketTerminal).toBeDefined()
      expect(marketTerminal.intents?.length).toBeGreaterThan(0)
      expect(marketTerminal.intents[0].contexts).toContain("fdc3.instrument")

      expect(excelAddin).toBeDefined()
      expect(excelAddin.type).toBe("native")
      expect(excelAddin.details?.path).toContain(".exe")

      // Step 4: Register app launch for one of the realistic apps
      const registerArgs: DesktopAgentRegisterAppLaunchArgs = {
        appId: "market-terminal",
        userSessionId: sessionId,
        hosting: AppHosting.Tab,
        channel: "red",
        instanceTitle: "Market Terminal Instance",
      }

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

      // Step 5: Simulate app connection
      const appHelloArgs: AppHelloArgs = {
        appId: "market-terminal",
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

      // Step 6: Channel receiver connection
      const channelHelloArgs: ChannelReceiverHelloRequest = {
        userSessionId: sessionId,
        instanceId: instanceId,
      }

      await new Promise<void>((resolve) => {
        clientSocket.emit(
          CHANNEL_RECEIVER_HELLO,
          channelHelloArgs,
          (update: ChannelReceiverUpdate, error?: string) => {
            expect(error).toBeUndefined()
            expect(update).toBeDefined()
            expect(update.tabs).toBeDefined()
            expect(Array.isArray(update.tabs)).toBe(true)
            resolve()
          },
        )
      })
    })

    it("should handle workflow with multiple app types", async () => {
      const sessionId = "multi-app-session"

      // Setup session with all test data
      const helloArgs: DesktopAgentHelloArgs = {
        userSessionId: sessionId,
        channels: [{ id: "red", icon: "🔴", background: "#ff0000" }],
        directories: [
          path.resolve(__dirname, "testData/webApps.json"),
          path.resolve(__dirname, "testData/nativeApps.json"),
        ],
        panels: [],
        customApps: [],
        contextHistory: {},
      }

      await new Promise<void>((resolve) => {
        clientSocket.emit(DA_HELLO, helloArgs, () => resolve())
      })

      // Get directory listing
      const apps = await new Promise<AugmentedAppMetadata[]>((resolve) => {
        clientSocket.emit(
          DA_DIRECTORY_LISTING,
          { userSessionId: sessionId },
          (apps: AugmentedAppMetadata[]) => resolve(apps),
        )
      })

      // Test different app types
      const webApp = apps.find((app) => app.type === "web")
      const nativeApp = apps.find((app) => app.type === "native")
      const citrixApp = apps.find((app) => app.type === "citrix")

      expect(webApp).toBeDefined()
      expect(nativeApp).toBeDefined()
      expect(citrixApp).toBeDefined()

      // Verify each has proper configuration
      expect(webApp.details?.url).toBeDefined()
      expect(nativeApp.details?.path).toBeDefined()
      expect(citrixApp.details?.alias).toBeDefined()
    })
  })

  describe("Intent Resolution Integration", () => {
    it("should load apps and verify intent capabilities", async () => {
      const sessionId = "intent-test-session"

      const helloArgs: DesktopAgentHelloArgs = {
        userSessionId: sessionId,
        channels: [],
        directories: [path.resolve(__dirname, "testData/webApps.json")],
        panels: [],
        customApps: [],
        contextHistory: {},
      }

      await new Promise<void>((resolve) => {
        clientSocket.emit(DA_HELLO, helloArgs, () => resolve())
      })

      const apps = await new Promise<AugmentedAppMetadata[]>((resolve) => {
        clientSocket.emit(
          DA_DIRECTORY_LISTING,
          { userSessionId: sessionId },
          (apps: AugmentedAppMetadata[]) => resolve(apps),
        )
      })

      // Verify intent distribution across apps
      const viewInstrumentApps = apps.filter((app) =>
        app.intents?.some((intent: IntentMetadata) => intent.name === "ViewInstrument"),
      )

      const viewPortfolioApps = apps.filter((app) =>
        app.intents?.some((intent: IntentMetadata) => intent.name === "ViewPortfolio"),
      )

      expect(viewInstrumentApps.length).toBeGreaterThan(1)
      expect(viewPortfolioApps.length).toBeGreaterThan(0)

      // Verify context support
      const instrumentContextApps = apps.filter((app) =>
        app.intents?.some((intent: IntentMetadata) =>
          intent.contexts?.includes("fdc3.instrument"),
        ),
      )

      expect(instrumentContextApps.length).toBeGreaterThan(0)
    })
  })

  describe("FDC3 Context and Intent Message Flows", () => {
    it("should handle realistic FDC3 instrument context", async () => {
      const sessionId = "fdc3-context-session"

      // Setup session with market apps
      const helloArgs: DesktopAgentHelloArgs = {
        userSessionId: sessionId,
        channels: [{ id: "red", icon: "🔴", background: "#ff0000" }],
        directories: [path.resolve(__dirname, "testData/webApps.json")],
        panels: [],
        customApps: [],
        contextHistory: {
          red: [
            {
              type: "fdc3.instrument",
              id: {
                ticker: "AAPL",
                ISIN: "US0378331005",
              },
              name: "Apple Inc.",
            },
          ],
        },
      }

      await new Promise<void>((resolve) => {
        clientSocket.emit(DA_HELLO, helloArgs, () => resolve())
      })

      // Register and connect market terminal app
      const instanceId = await new Promise<string>((resolve) => {
        clientSocket.emit(
          DA_REGISTER_APP_LAUNCH,
          {
            appId: "market-terminal",
            userSessionId: sessionId,
            hosting: AppHosting.Tab,
            channel: "red",
            instanceTitle: "Market Terminal",
          },
          (instanceId: string) => resolve(instanceId),
        )
      })

      await new Promise<void>((resolve) => {
        clientSocket.emit(
          APP_HELLO,
          {
            appId: "market-terminal",
            instanceId,
            userSessionId: sessionId,
          },
          () => resolve(),
        )
      })

      // Verify channel receiver gets context history
      await new Promise<void>((resolve) => {
        clientSocket.emit(
          CHANNEL_RECEIVER_HELLO,
          {
            userSessionId: sessionId,
            instanceId,
          },
          (update: ChannelReceiverUpdate, error?: string) => {
            expect(error).toBeUndefined()
            expect(update).toBeDefined()
            expect(update.tabs).toBeDefined()

            // Should have red channel with AAPL context
            const redChannel = update.tabs.find((tab) => tab.id === "red")
            expect(redChannel).toBeDefined()
            resolve()
          },
        )
      })
    })

    it("should support ViewInstrument intent with realistic financial data", async () => {
      const sessionId = "intent-flow-session"

      const helloArgs: DesktopAgentHelloArgs = {
        userSessionId: sessionId,
        channels: [],
        directories: [
          path.resolve(__dirname, "testData/webApps.json"),
          path.resolve(__dirname, "testData/nativeApps.json"),
        ],
        panels: [],
        customApps: [],
        contextHistory: {},
      }

      await new Promise<void>((resolve) => {
        clientSocket.emit(DA_HELLO, helloArgs, () => resolve())
      })

      // Get apps and verify ViewInstrument intent support
      const apps = await new Promise<AugmentedAppMetadata[]>((resolve) => {
        clientSocket.emit(
          DA_DIRECTORY_LISTING,
          { userSessionId: sessionId },
          (apps: AugmentedAppMetadata[]) => resolve(apps),
        )
      })

      const viewInstrumentApps = apps.filter((app) =>
        app.intents?.some(
          (intent: IntentMetadata) =>
            intent.name === "ViewInstrument" &&
            intent.contexts?.includes("fdc3.instrument"),
        ),
      )

      expect(viewInstrumentApps.length).toBeGreaterThan(1)

      // Verify different app types support the same intent
      const webApp = viewInstrumentApps.find((app) => app.type === "web")
      const nativeApp = viewInstrumentApps.find((app) => app.type === "native")

      expect(webApp).toBeDefined()
      expect(nativeApp).toBeDefined()

      // Both should support fdc3.instrument context
      expect(
        webApp.intents.find((i: IntentMetadata) => i.name === "ViewInstrument").contexts,
      ).toContain("fdc3.instrument")

      expect(
        nativeApp.intents.find((i: IntentMetadata) => i.name === "ViewInstrument")
          .contexts,
      ).toContain("fdc3.instrument")
    })
  })

  describe("Error Scenarios Integration", () => {
    it("should handle invalid app launch gracefully", async () => {
      const sessionId = "error-test-session"

      // Setup minimal session
      await new Promise<void>((resolve) => {
        clientSocket.emit(
          DA_HELLO,
          {
            userSessionId: sessionId,
            channels: [],
            directories: [],
            panels: [],
            customApps: [],
            contextHistory: {},
          },
          () => resolve(),
        )
      })

      // Try to register non-existent app
      await new Promise<void>((resolve) => {
        clientSocket.emit(
          DA_REGISTER_APP_LAUNCH,
          {
            appId: "non-existent-app",
            userSessionId: sessionId,
            hosting: AppHosting.Tab,
            channel: "red",
            instanceTitle: "Test",
          },
          (instanceId: string) => {
            // Should handle gracefully
            expect(instanceId).toMatch(/^sail-app-/)
            resolve()
          },
        )
      })
    })

    it("should handle malformed directory files gracefully in integration", async () => {
      const sessionId = "malformed-integration-session"

      // This should fail gracefully when directory loading fails
      const helloArgs: DesktopAgentHelloArgs = {
        userSessionId: sessionId,
        channels: [],
        directories: ["/nonexistent/path/apps.json"],
        panels: [],
        customApps: [],
        contextHistory: {},
      }

      await new Promise<void>((resolve) => {
        clientSocket.emit(
          DA_HELLO,
          helloArgs,
          (response: boolean) => {
            // Should still create session even if directory loading fails
            expect(response).toBe(true)
            expect(sessions.has(sessionId)).toBe(true)
            resolve()
          },
        )
      })

      // Directory listing should return empty array
      await new Promise<void>((resolve) => {
        clientSocket.emit(
          DA_DIRECTORY_LISTING,
          { userSessionId: sessionId },
          (apps: AugmentedAppMetadata[]) => {
            expect(Array.isArray(apps)).toBe(true)
            expect(apps).toHaveLength(0)
            resolve()
          },
        )
      })
    })
  })
})
