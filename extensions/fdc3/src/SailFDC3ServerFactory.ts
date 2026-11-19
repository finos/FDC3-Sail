import type { ChannelState, FDC3ServerInstance } from "@finos/sail-headless-agent"
import type {
  SailPlatformBus,
  SailPlatformCatalog,
  SailSessionId,
  SailUserSession,
} from "@finos/sail-platform"
import type { RegisterMiddleware, SailFdc3AppContribution, SailMiddleware } from "./api"
import { createSailFdc3AppContribution, createSessionDirectory } from "./app-contribution"
import { createRegisterMiddleware } from "./apply-middleware"
import type { SailFdc3ChannelsInternal } from "./channels"
import {
  createHostIntentResolver,
  createProgrammaticIntentResolver,
  type HostIntentResolver,
  type IntentResolver,
  type IntentResolverUIMethods,
} from "./intent-resolver"
import { SailFDC3ServerInstance } from "./SailFDC3ServerInstance"

export type SailFdc3SessionHandle = {
  sessionId: SailSessionId
  agent: FDC3ServerInstance
  /** Concrete instance (channel helpers, state listeners). */
  core: SailFDC3ServerInstance
  appContribution: SailFdc3AppContribution
  intentResolver: IntentResolverUIMethods
  dispose(): void
}

export type CreateInstanceOptions = {
  /**
   * Custom DA-facing resolver. When omitted, a host UI resolver is created
   * (onRequest / select / cancel). Pass {@link createProgrammaticIntentResolver}
   * for unattended auto-resolve.
   */
  intentResolver?: IntentResolver
  /** Shortcut: use programmatic auto-resolve when no custom resolver is given. */
  autoResolve?: boolean
  /** Override factory / channels-export catalog for this session. */
  channels?: ChannelState[]
}

export type SailFDC3ServerFactoryOptions = {
  catalog: SailPlatformCatalog
  bus: SailPlatformBus
  /** When set, createInstance seeds from this catalog unless options.channels is passed. */
  channelsApi?: SailFdc3ChannelsInternal
  /** Legacy seed when channelsApi is omitted. */
  channels?: ChannelState[]
}

type QueuedMiddleware = SailMiddleware & { priority: number; id: number }

/**
 * One Desktop Agent per {@link SailUserSession}.
 * App I/O goes through {@link SailPlatformBus} (WCP / sockets relay on the bus).
 */
export class SailFDC3ServerFactory {
  private readonly queued: QueuedMiddleware[] = []
  private nextId = 0
  private readonly sessions = new Map<string, SailFdc3SessionHandle>()
  private sessionSeq = 0
  private readonly disposeContribution: () => void
  private readonly channelsApi?: SailFdc3ChannelsInternal
  private readonly fallbackChannels: ChannelState[]
  private unbindChannels: (() => void) | null = null

  readonly bus: SailPlatformBus
  readonly appContribution: SailFdc3AppContribution

  constructor(options: SailFDC3ServerFactoryOptions) {
    const created = createSailFdc3AppContribution(options.catalog)
    this.appContribution = created.appContribution
    this.disposeContribution = created.dispose
    this.bus = options.bus
    this.channelsApi = options.channelsApi
    this.fallbackChannels = options.channels ?? []
  }

  private resolveChannels(override?: ChannelState[]): ChannelState[] {
    if (override) {
      return override
    }
    if (this.channelsApi) {
      return this.channelsApi.getUserChannels()
    }
    return this.fallbackChannels
  }

  /**
   * Factory-level middleware applied to each subsequent {@link createInstance}.
   * Already-running sessions are not updated.
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

  createInstance(
    session: SailUserSession,
    options: CreateInstanceOptions = {},
  ): SailFdc3SessionHandle {
    let hostResolver: HostIntentResolver | undefined
    let daResolver: IntentResolver

    if (options.intentResolver) {
      daResolver = options.intentResolver
    } else if (options.autoResolve) {
      daResolver = createProgrammaticIntentResolver()
    } else {
      hostResolver = createHostIntentResolver()
      daResolver = hostResolver
    }

    const uiMethods: IntentResolverUIMethods = hostResolver ?? {
      onRequest: () => () => {},
      select: () => {
        throw new Error("Intent UI not available (auto-resolve / custom resolver)")
      },
      cancel: () => {
        throw new Error("Intent UI not available (auto-resolve / custom resolver)")
      },
      getPendingRequests: () => [],
    }

    const core = new SailFDC3ServerInstance({
      bus: this.bus.forSession(session),
      session,
      directory: createSessionDirectory(this.appContribution, session.id),
      channels: this.resolveChannels(options.channels),
      intentResolver: daResolver,
    })
    const { agent, registerMiddleware } = createRegisterMiddleware(core)
    core.setReceiveTarget((message, from) => agent.receive(message, from))

    for (const mw of [...this.queued].sort((a, b) => b.priority - a.priority)) {
      registerMiddleware(mw)
    }

    this.unbindChannels?.()
    this.unbindChannels = this.channelsApi?.bindSession(core) ?? null

    const handleId = `session-${++this.sessionSeq}`
    const handle: SailFdc3SessionHandle = {
      sessionId: session.id,
      agent,
      core,
      appContribution: this.appContribution,
      intentResolver: uiMethods,
      dispose: () => {
        void core.shutdown()
        this.sessions.delete(handleId)
      },
    }
    this.sessions.set(handleId, handle)
    return handle
  }

  getSessions(): readonly SailFdc3SessionHandle[] {
    return [...this.sessions.values()]
  }

  shutdownAll(): void {
    this.unbindChannels?.()
    this.unbindChannels = null
    for (const handle of this.sessions.values()) {
      handle.dispose()
    }
    this.sessions.clear()
    this.disposeContribution()
  }
}
