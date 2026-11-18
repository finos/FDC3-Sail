import type { ChannelState, Directory, FDC3ServerInstance } from "@finos/sail-headless-agent"
import type { SailPlatformBus, SailPlatformCatalog, SailUserSession } from "@finos/sail-platform"
import type { RegisterMiddleware, SailFdc3AppDirectory, SailMiddleware } from "./api"
import { createSailFdc3AppDirectory } from "./app-directory"
import { createRegisterMiddleware } from "./apply-middleware"
import { SailFDC3ServerInstance } from "./SailFDC3ServerInstance"

export type SailFdc3SessionHandle = {
  agent: FDC3ServerInstance
  appDirectory: SailFdc3AppDirectory
  /** Session-local middleware registration (in addition to factory-level queue). */
  registerMiddleware: RegisterMiddleware
  dispose(): void
}

export type SailFDC3ServerFactoryOptions = {
  catalog: SailPlatformCatalog
  bus: SailPlatformBus
  channels: ChannelState[]
}

type QueuedMiddleware = SailMiddleware & { priority: number; id: number }

/**
 * Creates one FDC3 Desktop Agent per user session.
 * Platform bus/catalog are fixed at construction;
 * {@link createInstance} only needs the {@link SailUserSession}.
 */
export class SailFDC3ServerFactory {
  private readonly queued: QueuedMiddleware[] = []
  private nextId = 0
  private readonly sessions = new Map<string, SailFdc3SessionHandle>()
  private sessionSeq = 0
  private readonly bus: SailPlatformBus
  private readonly directory: Directory
  private readonly disposeDirectory: () => void
  private readonly channels: ChannelState[]

  readonly appDirectory: SailFdc3AppDirectory

  constructor(options: SailFDC3ServerFactoryOptions) {
    const created = createSailFdc3AppDirectory(options.catalog)
    this.appDirectory = created.appDirectory
    this.directory = created.directory
    this.disposeDirectory = created.dispose
    this.bus = options.bus
    this.channels = options.channels
  }

  /**
   * Register middleware applied to each subsequent {@link createInstance}.
   * Already-running sessions are not retroactively wrapped.
   */
  readonly registerMiddleware: RegisterMiddleware = mw => {
    const entry: QueuedMiddleware = {
      ...mw,
      priority: mw.priority ?? 0,
      id: this.nextId++,
    }
    this.queued.push(entry)
    return {
      dispose: () => {
        const idx = this.queued.indexOf(entry)
        if (idx >= 0) {
          this.queued.splice(idx, 1)
        }
      },
    }
  }

  createInstance(session: SailUserSession): SailFdc3SessionHandle {
    const core = new SailFDC3ServerInstance({
      bus: this.bus,
      session,
      directory: this.directory,
      channels: this.channels,
    })
    const { agent, registerMiddleware } = createRegisterMiddleware(core)

    for (const mw of [...this.queued].sort((a, b) => b.priority - a.priority)) {
      registerMiddleware(mw)
    }

    const sessionId = `session-${++this.sessionSeq}`
    const handle: SailFdc3SessionHandle = {
      agent,
      appDirectory: this.appDirectory,
      registerMiddleware,
      dispose: () => {
        void core.shutdown()
        this.sessions.delete(sessionId)
      },
    }
    this.sessions.set(sessionId, handle)
    return handle
  }

  /** Active session handles (for hosts that need to enumerate). */
  getSessions(): readonly SailFdc3SessionHandle[] {
    return [...this.sessions.values()]
  }

  shutdownAll(): void {
    for (const handle of this.sessions.values()) {
      handle.dispose()
    }
    this.sessions.clear()
    this.disposeDirectory()
  }
}
