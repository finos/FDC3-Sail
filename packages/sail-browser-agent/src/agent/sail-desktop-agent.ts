/**
 * FDC3 Desktop Agent — extends {@link SailDesktopAgentServer} (sail-headless-agent host).
 *
 * Browser WCP1–3 + MessagePort stay on {@link BrowserAppConnection}; all DACP
 * (including WCP4) is forwarded to {@link AbstractFDC3ServerInstance.receive} /
 * {@link AbstractFDC3ServerInstance.post}.
 */

import { OpenError, type AppMetadata, type BrowserTypes } from "@finos/fdc3"
import {
  BasicDirectory,
  BroadcastHandlerV2,
  BroadcastHandlerV3,
  ChannelType,
  HeartbeatHandlerV2,
  IntentHandlerV2,
  IntentHandlerV3,
  OpenHandlerV2,
  OpenHandlerV3,
  State,
  type DirectoryApp as DaDirectoryApp,
  type HandlersByVersion,
  type MessageHandler,
} from "@finos/sail-headless-agent"
import { consoleLogger, type Logger, type LogPayloadDetail } from "../logging/logger"
import { resolveDesktopAgentConfig, type SailDesktopAgentMetadata } from "./default-config"
import { toFdc3ApiVersion } from "./fdc3-version"
import type { ValidationMode } from "../app-connection/inbound-validation"
import type { AgentAppConnection } from "../app-connection/types"
import {
  BrowserAppConnection,
  type AppConnectionMetadata,
} from "../app-connection/browser-app-connection"
import { DEFAULT_INTENT_RESOLUTION_TIMEOUT_MS } from "../app-connection/wcp/wcp-types"
import {
  createHostIntentResolver,
  createHostWindowRegistry,
  type HostWindowRegistry,
  type IntentResolver,
  type IntentResolverUIMethods,
} from "../host-contracts"
import type { AppLauncher } from "../host-contracts/app-launcher"
import { fetchAppDirectory, mergeAppsWithoutDuplicates } from "../app-directory/fetch-app-directory"
import type { DirectoryApp } from "../app-directory/types"
import {
  changeAppChannel,
  createAppsController,
  createChannelsController,
  createIntentResolverController,
  hasIntentResolverUI,
  wireIntentResolver,
  wireLifecycleCallbacks,
  type SailDesktopAgentApps,
  type SailDesktopAgentChannels,
  type SailDesktopAgentHostControllers,
} from "./sail-desktop-agent-controllers"
import {
  createHandlerLog,
  mapStateToStatus,
  mapUserChannelsToChannelState,
  SailDesktopAgentServer,
} from "./sail-desktop-agent-server"
import {
  resolveOpenAppIdentifier,
  type DesktopAgentAppInstance,
  type DesktopAgentOpenOptions,
  type SailDesktopAgentOptions,
} from "./sail-desktop-agent-types"

/**
 * FDC3-Sail Desktop Agent backed by `@finos/sail-headless-agent`.
 */
export class SailDesktopAgent<TEdge extends AgentAppConnection = BrowserAppConnection>
  extends SailDesktopAgentServer
  implements SailDesktopAgentHostControllers
{
  protected readonly directory: BasicDirectory
  protected appLauncher?: AppLauncher
  private validation: ValidationMode
  protected logger: Logger
  private logPayloadDetail: LogPayloadDetail
  private isStarted = false
  protected implementationMetadata: SailDesktopAgentMetadata
  private channelChangeTimeoutMs: number

  readonly appConnection: TEdge
  readonly intentResolver: IntentResolverUIMethods
  readonly channels: SailDesktopAgentChannels
  readonly apps: SailDesktopAgentApps
  /**
   * Settles when every constructor `appDirectories` URL load has finished.
   */
  readonly directoriesLoaded: Promise<void>

  /** Window → instanceId map for WCP hostIdentifier when `window.name` is unreadable. */
  private readonly hostWindows: HostWindowRegistry = createHostWindowRegistry()

  constructor(
    ...args: BrowserAppConnection extends TEdge
      ? [options?: SailDesktopAgentOptions<TEdge>]
      : [options: SailDesktopAgentOptions<TEdge>]
  ) {
    const options = (args[0] ?? {}) as SailDesktopAgentOptions<TEdge>
    const { intentResolver: providedIntentResolver, ...localOptions } = options
    const config = resolveDesktopAgentConfig(localOptions)
    const logger = config.logger ?? consoleLogger

    const intentTimeoutMs = config.pendingIntentTimeoutMs
    const openHandlerTimeoutMs = config.openContextListenerTimeoutMs
    const v2: MessageHandler[] = [
      new BroadcastHandlerV2(createHandlerLog(logger, "BroadcastHandlerV2")),
      new IntentHandlerV2(intentTimeoutMs, createHandlerLog(logger, "IntentHandlerV2")),
      new OpenHandlerV2(openHandlerTimeoutMs, createHandlerLog(logger, "OpenHandlerV2")),
    ]
    const v3: MessageHandler[] = [
      new BroadcastHandlerV3(createHandlerLog(logger, "BroadcastHandlerV3")),
      new IntentHandlerV3(intentTimeoutMs, createHandlerLog(logger, "IntentHandlerV3")),
      new OpenHandlerV3(openHandlerTimeoutMs, createHandlerLog(logger, "OpenHandlerV3")),
    ]

    if (config.heartbeatEnabled) {
      const hb = new HeartbeatHandlerV2(
        config.heartbeatIntervalMs,
        config.heartbeatTimeoutMs,
        config.heartbeatTimeoutMs * 2,
        createHandlerLog(logger, "HeartbeatHandler"),
      )
      v2.push(hb)
      v3.push(hb)
    }

    const handlersByVersion: HandlersByVersion = { "2.2": v2, "3.0": v3 }
    const channelStates = mapUserChannelsToChannelState(config.userChannels)
    super(handlersByVersion, channelStates)

    this.directory = new BasicDirectory([...(config.apps ?? [])] as DaDirectoryApp[])
    this.implementationMetadata = config.desktopAgentMetadata
    this.channelChangeTimeoutMs = config.channelChangeTimeoutMs
    this.appLauncher = config.appLauncher
    this.validation = config.validation
    this.logger = logger
    this.logPayloadDetail = config.logPayloadDetail

    this.appConnection = (config.appConnection ??
      new BrowserAppConnection({
        ...localOptions.appConnectionOptions,
        // Default: host registry. Hosts may still override resolveHostIdentifier.
        resolveHostIdentifier:
          localOptions.appConnectionOptions?.resolveHostIdentifier ??
          (source => this.hostWindows.getInstanceId(source)),
        logger: this.logger,
        validation: this.validation,
        logPayloadDetail: this.logPayloadDetail,
        fdc3Version: this.implementationMetadata.fdc3Version,
      })) as TEdge

    this.appConnection.setOnInstanceTeardown(instanceId => {
      void this.disconnectInstance(instanceId)
    })

    const controllers = this.buildControllers(providedIntentResolver, localOptions)
    this.intentResolver = controllers.intentResolver
    this.channels = controllers.channels
    this.apps = controllers.apps

    if (localOptions.appDirectories && localOptions.appDirectories.length > 0) {
      this.directoriesLoaded = Promise.all(
        localOptions.appDirectories.map(url =>
          this.addAppDirectory(url).catch(err => {
            this.logger.error(
              `[SailDesktopAgent] Failed to load app directory ${url}:`,
              err instanceof Error ? err : new Error(String(err)),
            )
          }),
        ),
      ).then(() => undefined)
    } else {
      this.directoriesLoaded = Promise.resolve()
    }
  }

  private buildControllers(
    providedIntentResolver: IntentResolver | undefined,
    localOptions: Omit<SailDesktopAgentOptions<TEdge>, "intentResolver">,
  ): SailDesktopAgentHostControllers {
    const wcpIntentResolutionTimeout =
      localOptions.appConnectionOptions?.intentResolutionTimeout ??
      DEFAULT_INTENT_RESOLUTION_TIMEOUT_MS
    const hostIntentResolver =
      providedIntentResolver ??
      createHostIntentResolver({
        timeoutMs: Math.max(0, wcpIntentResolutionTimeout - 1000),
      })
    const resolverUI = hasIntentResolverUI(hostIntentResolver) ? hostIntentResolver : undefined

    const intentResolver = createIntentResolverController(resolverUI)
    const channels = createChannelsController(
      {
        getUserChannels: () => this.getUserChannels(),
        getAppChannelId: instanceId => this.getCurrentChannel(instanceId)?.id ?? null,
        changeAppChannel: (instanceId, channelId) =>
          changeAppChannel(
            {
              getUserChannels: () => this.getUserChannels(),
              setAppUserChannel: (id, ch) => this.setAppUserChannel(id, ch),
              appConnection: this.appConnection,
              channelChangeTimeoutMs: this.channelChangeTimeoutMs,
            },
            instanceId,
            channelId,
          ),
      },
      this.appConnection,
    )
    const apps = createAppsController(
      {
        add: app => this.addApp(app),
        addAll: appsToAdd => this.addApps(appsToAdd),
        addDirectory: url => this.addAppDirectory(url),
        remove: appId => this.removeApp(appId),
        getAll: () => this.getApps(),
        getById: appId => this.getApp(appId),
        open: (app, openOptions) => this.openApp(app, openOptions),
        getInstances: () => this.getAppInstances(),
        getInstance: instanceId => this.getAppInstance(instanceId),
        getConnections: () => this.getAppConnections(),
        getConnection: instanceId => this.getAppConnection(instanceId),
      },
      this.appConnection,
    )

    wireIntentResolver(this.appConnection, hostIntentResolver, this.logger)
    wireLifecycleCallbacks(this.appConnection, this.logger, localOptions)

    return { intentResolver, channels, apps }
  }

  /** Start the Desktop Agent, activating the app connection edge. */
  start(): void {
    if (this.isStarted) {
      throw new Error("DesktopAgent is already started")
    }

    this.appConnection.start()
    this.appConnection.onAppMessage(message => {
      void this.handleMessage(message)
    })
    this.appConnection.on?.("fdc3VersionNegotiated", payload => {
      this.applyNegotiatedFdc3Version(payload)
    })

    this.isStarted = true
  }

  /** Stop the Desktop Agent and clean up resources. */
  stop(): void {
    if (!this.isStarted) {
      return
    }
    this.appConnection.stop()
    void this.shutdown()
    this.isStarted = false
  }

  // --- Host / shell API ---

  private setAppUserChannel(instanceId: string, channelId: string | null): void {
    const channel = channelId === null ? null : this.getChannelById(channelId)
    if (channelId !== null && !channel) {
      throw new Error(`Channel "${channelId}" does not exist`)
    }
    this.setCurrentChannel(instanceId, channel)
    this.appConnection.notifyChannelMembershipChanged?.(instanceId, channelId)
  }

  private getUserChannels(): BrowserTypes.Channel[] {
    return this.getChannelStates()
      .filter(c => c.type === ChannelType.user)
      .map(c => ({
        id: c.id,
        type: "user" as const,
        displayMetadata: c.displayMetadata,
      }))
  }

  private addApp(app: DirectoryApp): void {
    this.directory.allApps = mergeAppsWithoutDuplicates(this.directory.allApps, [
      app as DaDirectoryApp,
    ])
  }

  private addApps(apps: DirectoryApp[]): void {
    this.directory.allApps = mergeAppsWithoutDuplicates(
      this.directory.allApps,
      apps as DaDirectoryApp[],
    )
  }

  private async addAppDirectory(url: string): Promise<void> {
    const apps = await fetchAppDirectory(url)
    this.directory.allApps = mergeAppsWithoutDuplicates(this.directory.allApps, apps)
  }

  /**
   * Pre-register a host-minted instance id (e.g. iframe `name`) as Pending so
   * WCP4 identity validation can adopt it.
   * Wire version is provisional until WCP1 negotiation updates it.
   *
   * Prefer relying on {@link openApp} / server `open`, which register Pending
   * before {@link AppLauncher.launch}. Use this for shell remounts or host
   * paths that do not go through those entry points.
   */
  registerPendingHostInstance(params: { appId: string; instanceId: string }): void {
    if (this.getInstanceDetails(params.instanceId)) {
      return
    }
    this.setInstanceDetails(params.instanceId, {
      appId: params.appId,
      instanceId: params.instanceId,
      state: State.Pending,
      fdc3Version: toFdc3ApiVersion(this.implementationMetadata.fdc3Version),
    })
  }

  /**
   * Record the browsing-context {@link Window} for a launcher instance id.
   * Used as the default {@link AppConnectionOptions.resolveHostIdentifier}.
   */
  registerHostWindow(windowRef: Window, instanceId: string): void {
    this.hostWindows.register(windowRef, instanceId)
  }

  /** Reverse of {@link registerHostWindow} for WCP hostIdentifier lookup. */
  getInstanceIdForHostWindow(windowRef: Window): string | undefined {
    return this.hostWindows.getInstanceId(windowRef)
  }

  /** Find a registered browsing context (e.g. to close a tab window). */
  findHostWindow(instanceId: string): Window | undefined {
    return this.hostWindows.findWindow(instanceId)
  }

  /** Drop registry entries when the host tears down a container. */
  forgetHostWindow(instanceId: string): void {
    this.hostWindows.forget(instanceId)
  }

  /**
   * Apply the WCP1-negotiated wire version onto the Pending AppRegistration so
   * sail-headless-agent `handlersFor` routes DACP to the matching v2/v3 set.
   */
  private applyNegotiatedFdc3Version(payload: {
    tempInstanceId: string
    hostIdentifier?: string
    fdc3Version: "2.2" | "3.0"
  }): void {
    const targetId =
      payload.hostIdentifier && this.getInstanceDetails(payload.hostIdentifier)
        ? payload.hostIdentifier
        : payload.tempInstanceId

    const existing = this.getInstanceDetails(targetId)
    if (existing) {
      this.setInstanceDetails(targetId, {
        ...existing,
        fdc3Version: payload.fdc3Version,
      })
      return
    }

    // Orphan handshake (no host pre-registration yet): keep version on a temp Pending row
    // so receive() during WCP4 uses the negotiated handler set.
    this.setInstanceDetails(payload.tempInstanceId, {
      appId: "unknown",
      instanceId: payload.tempInstanceId,
      state: State.Pending,
      fdc3Version: payload.fdc3Version,
    })
  }

  private removeApp(appId: string): void {
    this.directory.allApps = this.directory.allApps.filter(
      a => a.appId.toLowerCase() !== appId.toLowerCase(),
    )
  }

  private getApps(): DirectoryApp[] {
    return this.directory.retrieveAllApps()
  }

  private getApp(appId: string): DirectoryApp | undefined {
    return this.directory.retrieveAppsById(appId)[0]
  }

  private async openApp(
    app: string | BrowserTypes.AppIdentifier,
    options?: DesktopAgentOpenOptions,
  ): Promise<BrowserTypes.AppIdentifier> {
    if (!this.appLauncher) {
      throw new Error("App launching not available - no AppLauncher configured")
    }

    const appIdentifier = resolveOpenAppIdentifier(app, options)
    const catalogApps = this.directory.retrieveAppsById(appIdentifier.appId)
    if (catalogApps.length === 0) {
      throw new Error(OpenError.AppNotFound)
    }

    const instanceId = appIdentifier.instanceId ?? this.createUUID()
    const payload: BrowserTypes.OpenRequestPayload = {
      app: { appId: appIdentifier.appId, instanceId },
      ...(options?.context !== undefined ? { context: options.context } : {}),
    }

    // Pending before launch so WCP1 can race the browsing context safely.
    this.registerPendingHostInstance({ appId: appIdentifier.appId, instanceId })

    const launched = await this.appLauncher.launch(payload, catalogApps[0] as AppMetadata)
    const id = launched.instanceId ?? instanceId
    if (id !== instanceId) {
      this.registerPendingHostInstance({ appId: launched.appId, instanceId: id })
    }

    return { appId: launched.appId, instanceId: id }
  }

  private getAppInstances(): DesktopAgentAppInstance[] {
    return this.instances
      .filter(i => i.state !== State.Terminated)
      .map(i => ({
        appId: i.appId,
        instanceId: i.instanceId,
        status: mapStateToStatus(i.state),
        currentUserChannel: this.getCurrentChannel(i.instanceId)?.id ?? null,
      }))
  }

  private getAppInstance(instanceId: string): DesktopAgentAppInstance | undefined {
    const instance = this.getInstanceDetails(instanceId)
    if (!instance || instance.state === State.Terminated) {
      return undefined
    }
    return {
      appId: instance.appId,
      instanceId: instance.instanceId,
      status: mapStateToStatus(instance.state),
      currentUserChannel: this.getCurrentChannel(instanceId)?.id ?? null,
    }
  }

  private getAppConnection(instanceId: string): AppConnectionMetadata | undefined {
    return this.appConnection.getConnection(instanceId)
  }

  private getAppConnections(): AppConnectionMetadata[] {
    return this.appConnection.getConnections()
  }

  override async close(instanceId: string): Promise<void> {
    // Forget after AppLauncher.close so hosts can still findHostWindow to tear down.
    try {
      await super.close(instanceId)
    } finally {
      this.forgetHostWindow(instanceId)
    }
  }

  async disconnectInstance(instanceId: string): Promise<void> {
    await this.cleanupApp(instanceId)
    await this.setAppState(instanceId, State.Terminated)
    this.appConnection.pruneAppConnection(instanceId)
    this.forgetHostWindow(instanceId)
  }

  getIsStarted(): boolean {
    return this.isStarted
  }

  getImplementationMetadata(): SailDesktopAgentMetadata {
    return this.implementationMetadata
  }
}
