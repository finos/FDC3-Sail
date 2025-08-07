import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { io as Client, Socket as ClientSocket } from "socket.io-client"
import { SailFDC3Server, mapChannels } from "../desktop-agent/SailFDC3Server"
import { SailServerContext } from "../desktop-agent/SailServerContext"
import { SailDirectory } from "../appd/SailDirectory"
import { DesktopAgentHelloArgs, TabDetail } from "@finos/fdc3-sail-common"
import { ChannelType } from "@finos/fdc3-web-impl"
import { getTestServer, clearSessions } from "./setup/setupTests"
import { resolve } from "path"

describe("SailFDC3Server", () => {
  let clientSocket: ClientSocket
  let directory: SailDirectory
  let serverContext: SailServerContext
  let helloArgs: DesktopAgentHelloArgs
  let port: number

  beforeEach(async () => {
    const testServer = getTestServer()
    port = testServer.port
    clearSessions()

    clientSocket = Client(`http://localhost:${port}`, {
      transports: ["websocket"],
    })

    await new Promise<void>((resolve) => {
      clientSocket.on("connect", resolve)
    })

    // Create real instances with actual test data files
    directory = new SailDirectory()
    serverContext = new SailServerContext(directory, clientSocket as any)

    helloArgs = {
      userSessionId: "test-session-123",
      channels: [
        {
          id: "red",
          icon: "🔴",
          background: "#ff0000",
        },
        {
          id: "blue",
          icon: "🔵",
          background: "#0000ff",
        },
      ] as TabDetail[],
      directories: [
        resolve(__dirname, "testData/webApps.json"),
        resolve(__dirname, "testData/nativeApps.json")
      ],
      panels: [],
      customApps: [],
      contextHistory: {},
    }
  })

  afterEach(() => {
    if (clientSocket) {
      clientSocket.disconnect()
    }
  })

  describe("mapChannels", () => {
    it("should map TabDetail array to ChannelState array", () => {
      const tabDetails: TabDetail[] = [
        { id: "red", icon: "🔴", background: "#ff0000" },
        { id: "green", icon: "🟢", background: "#00ff00" },
      ]

      const result = mapChannels(tabDetails)

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        id: "red",
        type: ChannelType.user,
        displayMetadata: {
          name: "red",
          glyph: "🔴",
          color: "#ff0000",
        },
        context: [],
      })
      expect(result[1]).toEqual({
        id: "green",
        type: ChannelType.user,
        displayMetadata: {
          name: "green",
          glyph: "🟢",
          color: "#00ff00",
        },
        context: [],
      })
    })

    it("should handle empty channels array", () => {
      const result = mapChannels([])
      expect(result).toHaveLength(0)
    })
  })

  describe("SailFDC3Server constructor", () => {
    it("should create server with mapped channels and load real directories", async () => {
      const server = new SailFDC3Server(serverContext, helloArgs)

      expect(server).toBeInstanceOf(SailFDC3Server)
      expect(server.serverContext).toBe(serverContext)

      // Wait for directory loading to complete
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Verify apps were loaded from real JSON files
      const apps = server.getDirectory().retrieveAllApps()
      expect(apps.length).toBeGreaterThan(0)
      
      // Check that we have apps from both files
      const webApps = apps.filter(app => app.type === "web")
      const nativeApps = apps.filter(app => app.type === "native")
      const citrixApps = apps.filter(app => app.type === "citrix")
      
      expect(webApps.length).toBeGreaterThan(0)
      expect(nativeApps.length).toBeGreaterThan(0) 
      expect(citrixApps.length).toBeGreaterThan(0)
    })

    it("should handle hello args with empty channels", () => {
      const emptyChannelsArgs = {
        ...helloArgs,
        channels: [],
      }

      const server = new SailFDC3Server(serverContext, emptyChannelsArgs)

      expect(server).toBeInstanceOf(SailFDC3Server)
      expect(server.serverContext).toBe(serverContext)
    })

    it("should handle hello args with empty directories", async () => {
      const emptyDirsArgs = {
        ...helloArgs,
        directories: [],
      }

      const server = new SailFDC3Server(serverContext, emptyDirsArgs)

      expect(server).toBeInstanceOf(SailFDC3Server)
      
      // Wait and verify no apps were loaded
      await new Promise(resolve => setTimeout(resolve, 100))
      const apps = server.getDirectory().retrieveAllApps()
      expect(apps).toHaveLength(0)
    })
  })

  describe("getDirectory", () => {
    it("should return the server context directory", () => {
      const server = new SailFDC3Server(serverContext, helloArgs)

      const directory = server.getDirectory()

      expect(directory).toBe(server.serverContext.getDirectory())
    })
  })

  describe("getServerContext", () => {
    it("should return the server context", () => {
      const server = new SailFDC3Server(serverContext, helloArgs)

      const context = server.getServerContext()

      expect(context).toBe(serverContext)
    })
  })

  describe("Real FDC3 Integration", () => {
    it("should load and validate realistic FDC3 app data", async () => {
      const server = new SailFDC3Server(serverContext, helloArgs)
      
      await new Promise(resolve => setTimeout(resolve, 100))
      const apps = server.getDirectory().retrieveAllApps()
      
      // Find specific test apps we created
      const marketTerminal = apps.find(app => app.appId === "market-terminal")
      const excelAddin = apps.find(app => app.appId === "excel-addin")
      
      expect(marketTerminal).toBeDefined()
      expect(marketTerminal?.intents?.length).toBeGreaterThan(0)
      expect(marketTerminal?.intents?.[0].contexts).toContain("fdc3.instrument")
      
      expect(excelAddin).toBeDefined()
      expect(excelAddin?.type).toBe("native")
      expect(excelAddin?.details?.path).toContain(".exe")
    })

    it("should handle apps with different intent configurations", async () => {
      const server = new SailFDC3Server(serverContext, helloArgs)
      
      await new Promise(resolve => setTimeout(resolve, 100))
      const apps = server.getDirectory().retrieveAllApps()
      
      // Check variety of intent support
      const appsWithViewInstrument = apps.filter(app => 
        app.intents?.some(intent => intent.name === "ViewInstrument")
      )
      const appsWithViewPortfolio = apps.filter(app => 
        app.intents?.some(intent => intent.name === "ViewPortfolio")
      )
      
      expect(appsWithViewInstrument.length).toBeGreaterThan(1)
      expect(appsWithViewPortfolio.length).toBeGreaterThan(0)
    })
  })
})
