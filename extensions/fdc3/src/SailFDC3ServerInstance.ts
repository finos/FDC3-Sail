import type { Context } from "@finos/fdc3-context-v2"
import type { AppIdentifier, AppIntent } from "@finos/fdc3-standard-v2"
import {
  AbstractFDC3ServerInstance,
  State,
  type AppRegistration,
  type ChannelState,
  type Directory,
  type Fdc3ApiVersion,
  type FDC3ServerInstance,
  type HandlersByVersion,
  type InstanceID,
  BroadcastHandlerV2,
  BroadcastHandlerV3,
  HeartbeatHandlerV2,
  HeartbeatHandlerV3,
  IntentHandlerV2,
  IntentHandlerV3,
  OpenHandlerV2,
  OpenHandlerV3,
} from "@finos/sail-headless-agent"
import {
  SERVER_INSTANCE,
  type SailPlatformBus,
  type SailUserSession,
} from "@finos/sail-platform"
import type { SailFdc3AppChannelChangeEvent } from "./api"
import type { IntentResolver } from "./intent-resolver"

export type SailFDC3ServerInstanceOptions = {
  bus: SailPlatformBus
  session: SailUserSession
  directory: Directory
  channels: ChannelState[]
  /** When set, multi-handler raiseIntent goes through this resolver. */
  intentResolver?: IntentResolver
}

/**
 * Concrete FDC3ServerInstance: protocol state from AbstractFDC3ServerInstance;
 * open/close via SailUserSession; inbound/outbound DACP via {@link SailPlatformBus}.
 */
export class SailFDC3ServerInstance extends AbstractFDC3ServerInstance {
  static readonly PROVIDER = "Sail"
  static readonly PROVIDER_VERSION = "0.0.0"
  static readonly FDC3_VERSION = "2.2"

  private readonly bus: SailPlatformBus
  private readonly session: SailUserSession
  private readonly directory: Directory
  private readonly intentResolver?: IntentResolver
  private readonly instances = new Map<InstanceID, AppRegistration>()
  /** Wire versions from WCP3Handshake, applied when the registration appears. */
  private readonly negotiatedVersions = new Map<InstanceID, Fdc3ApiVersion>()
  private readonly stateListeners = new Set<(instanceId: string, state: State) => void>()
  private readonly userChannelListeners = new Set<
    (event: SailFdc3AppChannelChangeEvent) => void
  >()
  private unsubReceive?: () => void
  /** Prefer proxied agent.receive when set (middleware). */
  private receiveTarget?: (message: { type: string }, from: InstanceID) => Promise<void>

  constructor(options: SailFDC3ServerInstanceOptions) {
    const openTimeout = 10_000
    const intentTimeout = 20_000
    const handlersByVersion: HandlersByVersion = {
      "2.2": [
        new OpenHandlerV2(openTimeout),
        new BroadcastHandlerV2(),
        new IntentHandlerV2(intentTimeout),
        new HeartbeatHandlerV2(openTimeout / 10, openTimeout / 2, openTimeout),
      ],
      "3.0": [
        new OpenHandlerV3(openTimeout),
        new BroadcastHandlerV3(),
        new IntentHandlerV3(intentTimeout),
        new HeartbeatHandlerV3(openTimeout / 10, openTimeout / 2, openTimeout),
      ],
    }
    super(handlersByVersion, options.channels)
    this.bus = options.bus
    this.session = options.session
    this.directory = options.directory
    this.intentResolver = options.intentResolver

    this.unsubReceive = this.bus.subscribe((message: object, instanceId) => {
      if (instanceId !== SERVER_INSTANCE) {
        return
      }
      const from = appInstanceIdFromMessage(message)
      if (!from) {
        this.bus.log("[sail.fdc3] SERVER_INSTANCE message missing meta.source.instanceId")
        return
      }
      // Register before middleware/receive so OpenHandler can complete identity.
      this.ensureHostOpenedInstance(from)
      const inbound = message as { type: string }
      if (this.receiveTarget) {
        void this.receiveTarget(inbound, from)
      } else {
        void this.receive(inbound, from)
      }
    })
  }

  setReceiveTarget(
    handler: (message: { type: string }, from: InstanceID) => Promise<void>,
  ): void {
    this.receiveTarget = handler
  }

  onAppStateChange(listener: (instanceId: string, state: State) => void): () => void {
    this.stateListeners.add(listener)
    return () => {
      this.stateListeners.delete(listener)
    }
  }

  /**
   * Host chrome: fire when current user channel changes (DACP join/leave or setUserChannel).
   */
  onUserChannelChange(
    listener: (event: SailFdc3AppChannelChangeEvent) => void,
  ): () => void {
    this.userChannelListeners.add(listener)
    return () => {
      this.userChannelListeners.delete(listener)
    }
  }

  override setCurrentChannel(instanceId: InstanceID, channel: ChannelState | null): void {
    super.setCurrentChannel(instanceId, channel)
    const event: SailFdc3AppChannelChangeEvent = {
      instanceId,
      channelId: channel?.id ?? null,
    }
    for (const listener of this.userChannelListeners) {
      try {
        listener(event)
      } catch {
        // ignore
      }
    }
  }

  getDirectory(): Directory {
    return this.directory
  }

  createUUID(): string {
    return crypto.randomUUID()
  }

  post(message: object, instanceId: InstanceID): Promise<void> {
    return this.bus.post(message, instanceId)
  }

  async open(appId: string): Promise<InstanceID> {
    const apps = this.directory.retrieveAppsById(appId)
    const app = apps[0]
    if (!app) {
      throw new Error("AppNotFound")
    }
    const url = (app.details as { url?: string } | undefined)?.url
    const instanceId = await this.session.openApp({
      appId,
      url,
      title: app.title ?? appId,
    })
    this.setInstanceDetails(instanceId, {
      appId,
      instanceId,
      state: State.Pending,
    })
    this.emitAppState(instanceId, State.Pending)
    return instanceId
  }

  async close(instanceId: InstanceID): Promise<void> {
    await this.setAppState(instanceId, State.Terminated)
    await this.session.closeApp(instanceId)
    this.cleanupApp(instanceId)
    this.instances.delete(instanceId)
  }

  setInstanceDetails(uuid: InstanceID, details: AppRegistration): void {
    this.instances.set(uuid, details)
  }

  getInstanceDetails(uuid: InstanceID): AppRegistration | undefined {
    return this.instances.get(uuid)
  }

  /**
   * Record the WCP-negotiated API version for an app (drives handler selection and
   * the connection-indicator tooltip). Safe to call before or after registration.
   */
  recordNegotiatedFdc3Version(instanceId: InstanceID, version: string): void {
    const wire: Fdc3ApiVersion = version.startsWith("3") ? "3.0" : "2.2"
    this.negotiatedVersions.set(instanceId, wire)
    const details = this.instances.get(instanceId)
    if (!details || details.fdc3Version === wire) {
      return
    }
    this.setInstanceDetails(instanceId, { ...details, fdc3Version: wire })
    this.emitAppState(instanceId, details.state)
  }

  /**
   * Shell-opened apps never go through {@link open}; register Pending on first DACP
   * so identity handshake and the app-bar indicator work. Non-FDC3 apps never message
   * and stay unregistered (no icon).
   */
  ensureHostOpenedInstance(from: InstanceID): void {
    if (this.instances.has(from)) {
      return
    }
    const app = this.session.getSnapshot().apps.find(a => a.instanceId === from)
    if (!app) {
      return
    }
    this.setInstanceDetails(from, {
      appId: app.appId,
      instanceId: from,
      state: State.Pending,
      fdc3Version: this.negotiatedVersions.get(from),
    })
    this.emitAppState(from, State.Pending)
  }

  override async receive(
    message: { type: string },
    from: InstanceID,
  ): Promise<void> {
    this.ensureHostOpenedInstance(from)
    await super.receive(message as never, from)
  }

  async setAppState(app: InstanceID, newState: State): Promise<void> {
    const details = this.instances.get(app)
    if (details) {
      this.instances.set(app, { ...details, state: newState })
    }
    this.emitAppState(app, newState)
  }

  async getConnectedApps(): Promise<AppRegistration[]> {
    return [...this.instances.values()].filter(a => a.state === State.Connected)
  }

  async getAllApps(): Promise<AppRegistration[]> {
    return [...this.instances.values()]
  }

  async isAppConnected(app: InstanceID): Promise<boolean> {
    return this.instances.get(app)?.state === State.Connected
  }

  log(message: string): void {
    this.bus.log(message)
  }

  provider(): string {
    return SailFDC3ServerInstance.PROVIDER
  }

  providerVersion(): string {
    return SailFDC3ServerInstance.PROVIDER_VERSION
  }

  fdc3Version(): string {
    return SailFDC3ServerInstance.FDC3_VERSION
  }

  /**
   * Host-initiated user-channel join/leave. Updates DA state and notifies the app.
   */
  async setUserChannel(instanceId: string, channelId: string | null): Promise<void> {
    const channel = channelId === null ? null : this.getChannelById(channelId)
    if (channelId !== null && !channel) {
      throw new Error(`Channel "${channelId}" does not exist`)
    }
    this.setCurrentChannel(instanceId, channel)
    await this.post(
      {
        type: "channelChangedEvent",
        payload: { newChannelId: channelId },
        meta: {
          eventUuid: this.createUUID(),
          timestamp: new Date(),
        },
      },
      instanceId,
    )
  }

  async narrowIntents(
    _raiser: AppIdentifier,
    appIntents: AppIntent[],
    context: Context,
  ): Promise<AppIntent[]> {
    if (appIntents.length === 0) {
      return appIntents
    }

    if (appIntents.length === 1 && uniqueAppCount(appIntents[0]!) <= 1) {
      return appIntents
    }

    if (!this.intentResolver) {
      return appIntents.length > 0 ? [appIntents[0]!] : []
    }

    const primary = appIntents[0]!
    const handlers = appIntents.flatMap(ai =>
      ai.apps.map(app => ({
        app,
        intent: ai.intent,
        instanceId: app.instanceId,
        isRunning: Boolean(app.instanceId),
      })),
    )

    try {
      const response = await this.intentResolver.resolve({
        requestId: this.createUUID(),
        intent: primary.intent.name,
        context,
        handlers,
        choices: appIntents.flatMap(ai =>
          ai.apps.map(app => ({
            intent: ai.intent,
            handler: {
              app,
              intent: ai.intent,
              instanceId: app.instanceId,
              isRunning: Boolean(app.instanceId),
            },
          })),
        ),
      })

      if (!response) {
        return []
      }

      const selectedIntentName = response.intent ?? primary.intent.name
      const matching = appIntents.find(ai => ai.intent.name === selectedIntentName) ?? primary
      const selectedApp = matching.apps.find(
        a =>
          a.appId === response.target.appId &&
          (response.target.instanceId ? a.instanceId === response.target.instanceId : true),
      )

      if (!selectedApp) {
        return [
          {
            intent: matching.intent,
            apps: [
              {
                appId: response.target.appId,
                instanceId: response.target.instanceId,
              },
            ],
          },
        ]
      }

      return [{ intent: matching.intent, apps: [selectedApp] }]
    } catch (error) {
      this.log(`[sail.fdc3] narrowIntents failed: ${String(error)}`)
      return []
    }
  }

  override async shutdown(): Promise<void> {
    this.unsubReceive?.()
    this.unsubReceive = undefined
    this.receiveTarget = undefined
    this.stateListeners.clear()
    await super.shutdown()
  }

  private emitAppState(instanceId: string, state: State): void {
    for (const listener of this.stateListeners) {
      try {
        listener(instanceId, state)
      } catch {
        // ignore
      }
    }
  }
}

function uniqueAppCount(intent: AppIntent): number {
  const keys = new Set(
    intent.apps.map(a => (a.instanceId ? `${a.appId}:${a.instanceId}` : a.appId)),
  )
  return keys.size
}

function appInstanceIdFromMessage(message: object): string | undefined {
  const meta = (message as { meta?: { source?: { instanceId?: string } } }).meta
  const id = meta?.source?.instanceId
  return typeof id === "string" && id.length > 0 ? id : undefined
}

export type { FDC3ServerInstance }
