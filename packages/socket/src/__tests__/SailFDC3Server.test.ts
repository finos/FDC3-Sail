import { describe, it, expect, vi, beforeEach } from "vitest"
import { SailFDC3Server, mapChannels } from "../desktop-agent/SailFDC3Server"
import { SailServerContext } from "../desktop-agent/SailServerContext"
import { SailDirectory } from "../appd/SailDirectory"
import { DesktopAgentHelloArgs, TabDetail } from "@finos/fdc3-sail-common"
import { ChannelType } from "@finos/fdc3-web-impl"
import { Socket } from "socket.io"

describe("SailFDC3Server", () => {
  let mockSocket: Socket
  let mockDirectory: SailDirectory
  let mockServerContext: SailServerContext
  let helloArgs: DesktopAgentHelloArgs

  beforeEach(() => {
    mockSocket = {} as Socket

    // Create real instances and mock the replace method
    mockDirectory = new SailDirectory()
    vi.spyOn(mockDirectory, "replace").mockImplementation(() =>
      Promise.resolve(),
    )

    mockServerContext = new SailServerContext(mockDirectory, mockSocket)

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
      directories: ["/path/to/apps.json"],
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
    it("should create server with mapped channels", () => {
      const server = new SailFDC3Server(mockServerContext, helloArgs)

      expect(server).toBeInstanceOf(SailFDC3Server)
      expect(server.serverContext).toBe(mockServerContext)
      expect(mockDirectory.replace).toHaveBeenCalledWith(["/path/to/apps.json"])
    })

    it("should handle hello args with empty channels", () => {
      const emptyChannelsArgs = {
        ...helloArgs,
        channels: [],
      }

      const server = new SailFDC3Server(mockServerContext, emptyChannelsArgs)

      expect(server).toBeInstanceOf(SailFDC3Server)
      expect(server.serverContext).toBe(mockServerContext)
    })

    it("should handle hello args with empty directories", () => {
      const emptyDirsArgs = {
        ...helloArgs,
        directories: [],
      }

      const server = new SailFDC3Server(mockServerContext, emptyDirsArgs)

      expect(server).toBeInstanceOf(SailFDC3Server)
      expect(mockDirectory.replace).toHaveBeenCalledWith([])
    })
  })

  describe("getDirectory", () => {
    it("should return the server context directory", () => {
      const server = new SailFDC3Server(mockServerContext, helloArgs)

      const directory = server.getDirectory()

      expect(directory).toBe(mockDirectory)
    })
  })

  describe("getServerContext", () => {
    it("should return the server context", () => {
      const server = new SailFDC3Server(mockServerContext, helloArgs)

      const context = server.getServerContext()

      expect(context).toBe(mockServerContext)
    })
  })
})
