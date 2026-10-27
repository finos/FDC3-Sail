import { DesktopAgentHelloArgs, SAIL_EXTENSION_DATA, TabDetail } from "../../common"
import type { SailExtension } from "@finos/sail-extension"
import {
  ChannelType,
  ChannelState,
  MessageHandler,
  BroadcastHandlerV2,
  IntentHandlerV2,
  OpenHandlerV2,
  HeartbeatHandlerV2,
  BroadcastHandlerV3,
  IntentHandlerV3,
  OpenHandlerV3,
  LogFunction,
  HandlersByVersion,
  type FDC3ServerInstance,
} from "@finos/sail-headless-agent"
import { createSessionExtensionStorage, type SessionExtensionData } from "./extension-storage"
import { requestReviewOverSocket } from "./request-review"
import { SailFDC3ServerInstance } from "./SailFDC3ServerInstance"
import { SailDirectory } from "../appd/SailDirectory"
import { SocketIOConnection } from "./connection"
import { getFdc3WebSocketUrl } from "./sail-handlers/types"
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
  const out = channels.map(c => {
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
  protected readonly handlersByVersion: HandlersByVersion
  protected readonly sessions: Map<string, SailFDC3ServerInstance> = new Map()
  protected readonly extensions: SailExtension[]
  protected readonly sessionExtensionData = new Map<string, SessionExtensionData>()

  constructor(
    heartbeats: boolean,
    intentTimeoutMs: number = 20000,
    openHandlerTimeoutMs: number = 10000,
    extensions: SailExtension[] = [],
  ) {
    this.extensions = extensions
    const v2: MessageHandler[] = [
      new BroadcastHandlerV2(createHandlerLog("BroadcastHandlerV2")),
      new IntentHandlerV2(intentTimeoutMs, createHandlerLog("IntentHandlerV2")),
      new OpenHandlerV2(openHandlerTimeoutMs, createHandlerLog("OpenHandlerV2")),
    ]
    const v3: MessageHandler[] = [
      new BroadcastHandlerV3(createHandlerLog("BroadcastHandlerV3")),
      new IntentHandlerV3(intentTimeoutMs, createHandlerLog("IntentHandlerV3")),
      new OpenHandlerV3(openHandlerTimeoutMs, createHandlerLog("OpenHandlerV3")),
    ]

    if (heartbeats) {
      // Share a single heartbeat handler across versions to avoid duplicate timers
      const hb = new HeartbeatHandlerV2(
        openHandlerTimeoutMs / 10,
        openHandlerTimeoutMs / 2,
        openHandlerTimeoutMs,
        createHandlerLog("HeartbeatHandler"),
      )
      v2.push(hb)
      v3.push(hb)
    }

    this.handlersByVersion = { "2.2": v2, "3.0": v3 }
  }

  async createInstance(
    connection: SocketIOConnection,
    args: DesktopAgentHelloArgs,
  ): Promise<SailFDC3ServerInstance> {
    const channels = mapChannels(args.channels)
    const d = new SailDirectory(getFdc3WebSocketUrl())
    const out = new SailFDC3ServerInstance(d, connection, this.handlersByVersion, channels)
    await out.reloadAppDirectories(args.directories, args.customApps)
    out.setWscpPairings(args.wscpPairings ?? [])
    const holder: SessionExtensionData = { data: args.extensionData ?? {} }
    this.sessionExtensionData.set(args.userSessionId, holder)
    const wrapped = this.extensions.reduce((inst, ext) => {
      const storage = createSessionExtensionStorage(holder, ext.id, data => {
        connection.emit(SAIL_EXTENSION_DATA, data)
      })
      return (
        ext.wrapServer?.(inst, {
          storage,
          requestReview: details => requestReviewOverSocket(connection.getSocket(), details),
        }) ?? inst
      )
    }, out as FDC3ServerInstance)
    this.sessions.set(args.userSessionId, wrapped as SailFDC3ServerInstance)
    return wrapped as SailFDC3ServerInstance
  }

  setSessionExtensionData(sessionId: string, data: Record<string, Record<string, unknown>>): void {
    const holder = this.sessionExtensionData.get(sessionId)
    if (!holder) {
      return
    }
    const merged: Record<string, Record<string, unknown>> = { ...holder.data }
    for (const [id, bag] of Object.entries(data)) {
      merged[id] = mergeExtensionBags(holder.data[id] ?? {}, bag)
    }
    holder.data = merged
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
    this.sessionExtensionData.delete(s)
  }

  async shutdownInstances(): Promise<void> {
    this.sessions.keys().forEach(i => this.shutdownInstance(i))
  }

  async shutdownHandlers(): Promise<void> {
    const all = [...this.handlersByVersion["2.2"], ...this.handlersByVersion["3.0"]]
    // Deduplicate shared handlers (e.g. shared heartbeat)
    ;[...new Set(all)].forEach(handler => handler.shutdown())
  }

  async shutdownEverything(): Promise<void> {
    await this.shutdownInstances()
    await this.shutdownHandlers()
  }

  getSession(sessionId: string): SailFDC3ServerInstance | undefined {
    return this.sessions.get(sessionId)
  }

  /**
   * Locate a session that has minted the given WSCP sharedSecret.
   */
  findSessionBySharedSecret(sharedSecret: string):
    | {
        userSessionId: string
        session: SailFDC3ServerInstance
      }
    | undefined {
    for (const [userSessionId, session] of this.sessions) {
      if (session.getWscpPairingBySecret(sharedSecret)) {
        return { userSessionId, session }
      }
    }
    return undefined
  }
}

function mergeExtensionBags(
  server: Record<string, unknown>,
  client: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...server, ...client }
  for (const [key, value] of Object.entries(server)) {
    if (Array.isArray(value)) {
      const incoming = client[key]
      if (!Array.isArray(incoming) || incoming.length < value.length) {
        next[key] = value
      }
    }
  }
  return next
}
