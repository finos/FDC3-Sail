import {
  DesktopAgentHelloArgs,
  getInboundWebSocketUrl,
  TabDetail,
} from "@finos/fdc3-sail-common"
import {
  ChannelType,
  ChannelState,
  MessageHandler,
  BroadcastHandler,
  IntentHandler,
  OpenHandler,
  HeartbeatHandler,
  LogFunction,
  DirectoryApp,
} from "@finos/fdc3-sail-da-impl"
import { SailFDC3ServerInstance } from "./SailFDC3ServerInstance"
import { SailDirectory } from "../appd/SailDirectory"
import { SocketIOConnection } from "./connection"
import { getSailUrl } from "./sail-handlers/types"
import { createLogger } from "../logger"

// Create handler-specific loggers that adapt pino to the LogFunction signature
function createHandlerLog(name: string): LogFunction {
  const log = createLogger(name)
  return (message: string, ...args: unknown[]) => {
    if (args.length > 0) {
      log.debug({ args }, message)
    } else {
      log.debug(message)
    }
  }
}

export function mapChannels(channels: TabDetail[]): ChannelState[] {
  const out = channels.map((c) => {
    return {
      id: c.id,
      type: ChannelType.user,
      displayMetadata: {
        name: c.id,
        glyph: c.icon,
        color: c.background,
      },
      context: [],
    }
  })

  return out
}

export class SailFDC3ServerFactory {
  protected readonly handlers: MessageHandler[] = []
  protected readonly sessions: Map<string, SailFDC3ServerInstance> = new Map()

  constructor(
    heartbeats: boolean,
    intentTimeoutMs: number = 20000,
    openHandlerTimeoutMs: number = 10000,
  ) {
    this.handlers.push(
      new BroadcastHandler(createHandlerLog("BroadcastHandler")),
    )
    this.handlers.push(
      new IntentHandler(intentTimeoutMs, createHandlerLog("IntentHandler")),
    )
    this.handlers.push(
      new OpenHandler(openHandlerTimeoutMs, createHandlerLog("OpenHandler")),
    )

    if (heartbeats) {
      this.handlers.push(
        new HeartbeatHandler(
          openHandlerTimeoutMs / 10,
          openHandlerTimeoutMs / 2,
          openHandlerTimeoutMs,
          createHandlerLog("HeartbeatHandler"),
        ),
      )
    }
  }

  async createInstance(
    connection: SocketIOConnection,
    args: DesktopAgentHelloArgs,
  ): Promise<SailFDC3ServerInstance> {
    const channels = mapChannels(args.channels)
    const remoteUrlBase = getInboundWebSocketUrl(getSailUrl())
    const d = new SailDirectory(remoteUrlBase)
    const out = new SailFDC3ServerInstance(
      d,
      connection,
      this.handlers,
      channels,
    )
    await out.reloadAppDirectories(args.directories, args.customApps)
    out.syncWscpPairings(args.wscpPairings ?? [])
    this.sessions.set(args.userSessionId, out)
    return out
  }

  getSessionCount(): number {
    return this.sessions.size
  }

  shutdownInstance(s: string) {
    const i = this.sessions.get(s)
    if (i) {
      i.shutdown()
    }
    this.sessions.delete(s)
  }

  async shutdownInstances(): Promise<void> {
    this.sessions.keys().forEach((i) => this.shutdownInstance(i))
  }

  async shutdownHandlers(): Promise<void> {
    this.handlers.forEach((handler) => handler.shutdown())
  }

  async shutdownEverything(): Promise<void> {
    await this.shutdownInstances()
    await this.shutdownHandlers()
  }

  getSession(sessionId: string): SailFDC3ServerInstance | undefined {
    return this.sessions.get(sessionId)
  }

  /**
   * Resolves a WSCP sharedSecret to the matching FDC3 session and app instance.
   * Pairings are synced from ClientState on DA hello / client state updates.
   */
  resolveNativeAppPairing(sharedSecret: string):
    | {
        sessionId: string
        appId: string
        instanceId: string
        fdc3Server: SailFDC3ServerInstance
        nativeApp: DirectoryApp
      }
    | undefined {
    for (const [sessionId, fdc3Server] of this.sessions) {
      const pairing = fdc3Server.lookupWscpPairing(sharedSecret)
      if (!pairing) {
        continue
      }

      const nativeApps = fdc3Server.directory.retrieveAppsById(pairing.appId)
      const nativeApp = nativeApps.find((app) => app.type === "native")
      if (!nativeApp) {
        continue
      }

      return {
        sessionId,
        appId: pairing.appId,
        instanceId: pairing.instanceId,
        fdc3Server,
        nativeApp,
      }
    }
    return undefined
  }
}
