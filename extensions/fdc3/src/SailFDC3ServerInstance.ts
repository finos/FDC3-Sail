import {
  AbstractFDC3ServerInstance,
  State,
  type AppRegistration,
  type ChannelState,
  type Directory,
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
import type { SailPlatformBus, SailUserSession } from "@finos/sail-platform"

export type SailFDC3ServerInstanceOptions = {
  bus: SailPlatformBus
  session: SailUserSession
  directory: Directory
  channels: ChannelState[]
}

/**
 * Concrete FDC3ServerInstance: protocol state from AbstractFDC3ServerInstance;
 * open/close/post/instance registry via SailUserSession + SailPlatformBus.
 */
export class SailFDC3ServerInstance extends AbstractFDC3ServerInstance {
  static readonly PROVIDER = "Sail"
  static readonly PROVIDER_VERSION = "0.0.0"
  static readonly FDC3_VERSION = "2.2"

  private readonly bus: SailPlatformBus
  private readonly session: SailUserSession
  private readonly directory: Directory
  private readonly instances = new Map<InstanceID, AppRegistration>()
  private unsubReceive?: () => void

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

    // Host posts inbound app messages on the platform bus; we feed the DA.
    this.unsubReceive = this.bus.subscribe((message: object, from: string) => {
      void this.receive(message as { type: string }, from)
    })
  }

  getDirectory(): Directory {
    return this.directory
  }

  createUUID(): string {
    return crypto.randomUUID()
  }

  /**
   * Outbound DA → app. Delivery is via {@link registerMiddleware} `{ post }`
   * (sockets/iframes), not the platform bus.
   */
  post(_message: object, _instanceId: InstanceID): Promise<void> {
    return Promise.resolve()
  }

  async open(appId: string): Promise<InstanceID> {
    const apps = this.directory.retrieveAppsById(appId)
    const app = apps[0]
    if (!app) {
      throw new Error("AppNotFound")
    }
    const url = (app.details as { url?: string } | undefined)?.url
    // Placement (`within`) is a UI concern — host session / layout decides.
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

  async setAppState(app: InstanceID, newState: State): Promise<void> {
    const details = this.instances.get(app)
    if (details) {
      this.instances.set(app, { ...details, state: newState })
    }
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

  async narrowIntents(
    ...[_raiser, appIntents, _context]: Parameters<AbstractFDC3ServerInstance["narrowIntents"]>
  ): ReturnType<AbstractFDC3ServerInstance["narrowIntents"]> {
    return appIntents
  }

  override async shutdown(): Promise<void> {
    this.unsubReceive?.()
    this.unsubReceive = undefined
    await super.shutdown()
  }
}

export type { FDC3ServerInstance }
