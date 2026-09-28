/**
 * FDC3 Desktop Agent entry point.
 *
 * Owns agent state, host APIs, DACP/WCP routing over {@link SailDesktopAgent.appConnection},
 * and the grouped host controllers (`apps`, `channels`, `intentResolver`) a shell wires into
 * its UI. Production defaults `appConnection` to a real {@link BrowserAppConnection}; tests
 * may inject a lighter edge via the same-named constructor option.
 */

import type { AppLauncher } from "../host-contracts/app-launcher"
import { routeDACPMessage } from "../handlers"
import { cleanupInstanceDacpState } from "../handlers/instance-teardown"
import { handleWcp4ValidateAppIdentity } from "../app-connection/wcp/wcp-identity-validation"
import { createDacpResponseDispatcherFromDelivery } from "../handlers/utils/dacp-response-utils"
import type { DACPHandlerParams } from "../handlers/types"
import { applyInboundValidationPolicy, type ValidationMode } from "../dacp/validate-dacp-message"
import type { IntentResolutionCallback } from "../handlers/intent-resolution-callback"
import type { DirectoryApp } from "../app-directory/types"
import {
  addApp as addDirectoryApp,
  addApplications,
  loadDirectoryIntoState,
  removeApplicationsByAppId,
} from "../state/mutators/app-directory"
import { retrieveAllApps, retrieveAppsById } from "../app-directory/app-directory-queries"
import type { BrowserTypes } from "@finos/fdc3"
import type { AgentState, RunningAppIdentifier, StateSetter } from "../state/types"
import { createInitialState, createStateWithOverrides } from "../state/initial-state"
import { consoleLogger, type Logger, type LogPayloadDetail } from "../logging/logger"
import { resolveDesktopAgentConfig, type SailDesktopAgentMetadata } from "./default-config"
import { getAllInstances, getAllUserChannels, getInstance } from "../state/selectors"
import { connectInstance } from "../state/mutators"
import type { AgentAppConnection } from "../app-connection/types"
import {
  BrowserAppConnection,
  type AppConnectionMetadata,
} from "../app-connection/browser-app-connection"
import { DEFAULT_INTENT_RESOLUTION_TIMEOUT_MS } from "../app-connection/wcp/wcp-types"
import {
  createHostIntentResolver,
  type IntentResolver,
  type IntentResolverUIMethods,
} from "../host-contracts"
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
  mapToDesktopAgentAppInstance,
  resolveOpenAppIdentifier,
  type DesktopAgentAppInstance,
  type DesktopAgentOpenOptions,
  type SailDesktopAgentOptions,
} from "./sail-desktop-agent-types"

/**
 * FDC3-Sail's Desktop Agent implementation.
 *
 * Construct it, implement {@link AppLauncher}, and wire host UI through the grouped
 * controllers (`intentResolver`, `channels`, `apps`). The app-connection edge (WCP handshake,
 * per-app `MessagePort`, routing) is owned as {@link SailDesktopAgent.appConnection}.
 *
 * Generic in the edge type (`TEdge`) so `appConnection` types as the real
 * {@link BrowserAppConnection} for default construction, and as the injected edge's own type
 * for tests — see {@link SailDesktopAgentOptions}.
 */
export class SailDesktopAgent<
  TEdge extends AgentAppConnection = BrowserAppConnection,
> implements SailDesktopAgentHostControllers {
  private state: AgentState
  private appLauncher?: AppLauncher
  private requestIntentResolution?: IntentResolutionCallback
  private validation: ValidationMode
  private logger: Logger
  private logPayloadDetail: LogPayloadDetail
  private isStarted: boolean = false
  private implementationMetadata: SailDesktopAgentMetadata
  private openContextListenerTimeoutMs: number
  private pendingIntentTimeoutMs: number
  private heartbeatEnabled: boolean
  private heartbeatIntervalMs: number
  private heartbeatTimeoutMs: number
  /**
   * Inbound DACP/WCP routing edge. Defaults to a fresh {@link BrowserAppConnection}
   * (constructor is inert — no `window`, no listeners); tests may inject via the
   * `appConnection` constructor option.
   */
  readonly appConnection: TEdge
  private readonly channelChangeTimeoutMs: number

  readonly intentResolver: IntentResolverUIMethods
  readonly channels: SailDesktopAgentChannels
  readonly apps: SailDesktopAgentApps
  /**
   * Settles when every constructor `appDirectories` URL load has finished
   * (fulfilled or rejected). Resolves immediately when none were configured.
   */
  readonly directoriesLoaded: Promise<void>

  /**
   * Options are optional only when `TEdge` is the default {@link BrowserAppConnection} (or a
   * widening like `AgentAppConnection`); once narrowed to a non-default edge (e.g.
   * `SailDesktopAgent<DacpTestAppConnection>`), `SailDesktopAgentOptions<TEdge>` itself requires
   * `appConnection`, so the argument can no longer be omitted — see that type's doc comment.
   * Modeled as a conditional tuple rest-param (rather than `options: SailDesktopAgentOptions<TEdge>
   * = {}`) because a plain default value is checked once against the *unresolved* `TEdge` at this
   * declaration, not per call site, and can't express "optional for the default type parameter,
   * required otherwise".
   */
  constructor(
    ...args: BrowserAppConnection extends TEdge
      ? [options?: SailDesktopAgentOptions<TEdge>]
      : [options: SailDesktopAgentOptions<TEdge>]
  ) {
    const options = (args[0] ?? {}) as SailDesktopAgentOptions<TEdge>
    const { intentResolver: providedIntentResolver, ...localOptions } = options
    const config = resolveDesktopAgentConfig(localOptions)

    this.implementationMetadata = config.desktopAgentMetadata
    this.openContextListenerTimeoutMs = config.openContextListenerTimeoutMs
    this.pendingIntentTimeoutMs = config.pendingIntentTimeoutMs
    this.heartbeatEnabled = config.heartbeatEnabled
    this.heartbeatIntervalMs = config.heartbeatIntervalMs
    this.heartbeatTimeoutMs = config.heartbeatTimeoutMs
    this.channelChangeTimeoutMs = config.channelChangeTimeoutMs
    // userChannels config seeds state once; runtime reads use state.channels.user only.
    this.state = config.initialState
      ? createStateWithOverrides(config.initialState, config.userChannels)
      : createInitialState(config.userChannels)

    if (config.apps) {
      for (const app of config.apps) {
        this.state = addDirectoryApp(this.state, app)
      }
    }

    this.appLauncher = config.appLauncher
    this.validation = config.validation
    this.logger = config.logger ?? consoleLogger
    this.logPayloadDetail = config.logPayloadDetail

    // Injected test edge, or a fresh BrowserAppConnection (inert until start). Cast is only
    // for the default branch where `TEdge` is `BrowserAppConnection`.
    this.appConnection = (config.appConnection ??
      new BrowserAppConnection({
        ...localOptions.appConnectionOptions,
        logger: this.logger,
        validation: this.validation,
        logPayloadDetail: this.logPayloadDetail,
        // Single source of truth: WCP3 advertises the same version WCP5, getInfo and
        // closeRequest gating read.
        fdc3Version: this.implementationMetadata.fdc3Version,
      })) as TEdge

    this.bindEdgeCallbacks()
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

  /**
   * Wire edge → agent callbacks after `appConnection` is assigned.
   * Intent-resolution wiring only when the edge declares that capability (browser: yes;
   * minimal test edges: no — raiseIntent auto-selects the first handler).
   */
  private bindEdgeCallbacks(): void {
    if (typeof this.appConnection.requestIntentResolution === "function") {
      const conn = this.appConnection
      this.requestIntentResolution = request => conn.requestIntentResolution!(request)
    }

    this.appConnection.bindAgentState?.({
      getAgentState: () => this.getState(),
      setAgentState: callback => {
        this.setState(callback)
      },
    })

    this.appConnection.setOnInstanceTeardown(instanceId => {
      this.disconnectInstance(instanceId)
    })

    this.appConnection.setOnAgentDisconnect?.(() => {
      this.handleDisconnect()
    })
  }

  /**
   * Build grouped host controllers and wire intent-resolver / lifecycle listeners on the edge.
   */
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
        // Host UI times out slightly before the WCP edge so the edge owns the hard deadline.
        timeoutMs: Math.max(0, wcpIntentResolutionTimeout - 1000),
      })
    const resolverUI = hasIntentResolverUI(hostIntentResolver) ? hostIntentResolver : undefined

    const intentResolver = createIntentResolverController(resolverUI)
    const channels = createChannelsController(
      {
        getUserChannels: () => this.getUserChannels(),
        getAppChannelId: instanceId => this.getAppUserChannelId(instanceId),
        changeAppChannel: (instanceId, channelId) =>
          changeAppChannel(
            {
              getState: () => this.state,
              createHandlerParams: id => this.createHandlerParams(id),
              getUserChannels: () => this.getUserChannels(),
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
        addAll: apps => this.addApps(apps),
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

  /**
   * Start the Desktop Agent, activating the app connection edge.
   */
  start(): void {
    if (this.isStarted) {
      throw new Error("DesktopAgent is already started")
    }

    this.appConnection.start()
    this.appConnection.onAppMessage(message => {
      void this.handleMessage(message)
    })

    this.isStarted = true
  }

  /**
   * Stop the Desktop Agent and clean up resources.
   */
  stop(): void {
    if (!this.isStarted) {
      return
    }

    this.appConnection.stop()
    this.isStarted = false
  }

  /**
   * Inbound edge dispatch: WCP4/WCP6 on this agent path, else DACP from apps.
   * WCP1–3 stay on `window.postMessage` in {@link BrowserAppConnection}.
   */
  private async handleMessage(message: unknown): Promise<void> {
    if (!message || typeof message !== "object") {
      return
    }

    const messageType = (message as { type?: string }).type
    if (!messageType) {
      return
    }

    if (messageType.startsWith("WCP")) {
      this.dispatchWcpMessage(message, messageType)
      return
    }

    // Only process messages FROM apps (have source.instanceId).
    // Messages TO apps (destination only) pass through without processing.
    const instanceId = this.extractInstanceId(message)
    if (!instanceId) {
      return
    }

    await routeDACPMessage(message, this.createHandlerParams(instanceId))
  }

  private extractInstanceId(message: unknown): string | null {
    if (!message || typeof message !== "object") {
      return null
    }

    const messageObj = message as {
      meta?: { source?: { instanceId?: string } }
    }
    return messageObj.meta?.source?.instanceId || null
  }

  /**
   * WCP messages that share the app MessagePort with DACP after handshake.
   * One switch: identity validation, goodbye cleanup, or warn+drop.
   */
  private dispatchWcpMessage(message: unknown, messageType: string): void {
    const meta = (message as { meta?: { connectionAttemptUuid?: string; source?: unknown } }).meta

    // Browser MessagePort path already validated in bridgeAppPort before enrichment;
    // enriched WCP4 carries Sail-injected meta.source and must not be re-checked
    // (those fields fail the FDC3 WCP schema).
    const isBrowserEnrichedWcp4 =
      messageType === "WCP4ValidateAppIdentity" && meta?.source !== undefined
    if (
      !isBrowserEnrichedWcp4 &&
      applyInboundValidationPolicy(message, {
        logger: this.logger,
        validation: this.validation,
      }) === "rejected"
    ) {
      return
    }

    switch (messageType) {
      case "WCP4ValidateAppIdentity": {
        const connectionAttemptUuid = meta?.connectionAttemptUuid
        if (!connectionAttemptUuid) {
          this.logger.warn("[WCP4] Missing connectionAttemptUuid, cannot route message")
          return
        }
        handleWcp4ValidateAppIdentity(
          message,
          this.createHandlerParams(`temp-${connectionAttemptUuid}`),
        )
        return
      }
      case "WCP6Goodbye": {
        const instanceId = this.extractInstanceId(message)
        if (!instanceId) {
          this.logger.warn("[WCP] Missing instanceId, cannot route message", { messageType })
          return
        }
        cleanupInstanceDacpState(this.createHandlerParams(instanceId))
        return
      }
      default:
        this.logger.warn(`[WCP] Unhandled message type on agent edge: ${messageType}`)
    }
  }

  private handleDisconnect(): void {
    const allInstances = Object.values(this.state.instances)
    for (const instance of allInstances) {
      const params = this.createHandlerParams(instance.instanceId)
      cleanupInstanceDacpState(params)
    }
  }

  private createHandlerParams(instanceId: string): DACPHandlerParams {
    const conn = this.appConnection
    const responses = createDacpResponseDispatcherFromDelivery(conn, message =>
      conn.connectionRegistry.sendToAppInstance(message),
    )

    return {
      responses,
      instanceId,
      getState: () => this.getState(),
      setState: callback => this.setState(callback),
      appLauncher: this.appLauncher,
      requestIntentResolution: this.requestIntentResolution,
      validation: this.validation,
      logger: this.logger,
      logPayloadDetail: this.logPayloadDetail,
      implementationMetadata: this.implementationMetadata,
      openContextListenerTimeoutMs: this.openContextListenerTimeoutMs,
      pendingIntentTimeoutMs: this.pendingIntentTimeoutMs,
      heartbeatEnabled: this.heartbeatEnabled,
      heartbeatIntervalMs: this.heartbeatIntervalMs,
      heartbeatTimeoutMs: this.heartbeatTimeoutMs,
      disconnectInstance: instanceId => this.disconnectInstance(instanceId),
      notifyChannelMembershipChanged: conn.notifyChannelMembershipChanged?.bind(conn),
    }
  }

  getState(): AgentState {
    return this.state
  }

  private setState(callback: Parameters<StateSetter>[0]): void {
    this.state = callback(this.state)
  }

  private addApp(app: DirectoryApp): void {
    this.state = addDirectoryApp(this.state, app)
  }

  private addApps(apps: DirectoryApp[]): void {
    this.state = addApplications(this.state, apps)
  }

  private async addAppDirectory(url: string): Promise<void> {
    this.state = await loadDirectoryIntoState(this.state, url, this.logger)
  }

  private removeApp(appId: string): void {
    this.state = removeApplicationsByAppId(this.state, appId)
  }

  private getApps(): DirectoryApp[] {
    return retrieveAllApps(this.state.appDirectory)
  }

  private getApp(appId: string): DirectoryApp | undefined {
    return retrieveAppsById(this.state.appDirectory, appId)[0]
  }

  private async openApp(
    app: string | BrowserTypes.AppIdentifier,
    options?: DesktopAgentOpenOptions,
  ): Promise<BrowserTypes.AppIdentifier> {
    if (!this.appLauncher) {
      throw new Error("App launching not available - no AppLauncher configured")
    }

    const appIdentifier = resolveOpenAppIdentifier(app, options)
    const catalogApps = retrieveAppsById(this.state.appDirectory, appIdentifier.appId)
    if (catalogApps.length === 0) {
      throw new Error(`App not found in directory: ${appIdentifier.appId}`)
    }

    const payload: BrowserTypes.OpenRequestPayload = {
      app: appIdentifier,
      ...(options?.context !== undefined ? { context: options.context } : {}),
    }

    const launched = await this.appLauncher.launch(payload, catalogApps[0]!)
    if (launched.instanceId) {
      this.registerPendingHostInstance({
        appId: launched.appId,
        instanceId: launched.instanceId,
      })
    }

    return launched
  }

  private getAppInstances(): DesktopAgentAppInstance[] {
    return getAllInstances(this.state).map(mapToDesktopAgentAppInstance)
  }

  private getAppInstance(instanceId: string): DesktopAgentAppInstance | undefined {
    const instance = getInstance(this.state, instanceId)
    return instance ? mapToDesktopAgentAppInstance(instance) : undefined
  }

  registerPendingHostInstance(params: RunningAppIdentifier): void {
    if (getInstance(this.state, params.instanceId)) {
      return
    }

    this.state = connectInstance(this.state, {
      instanceId: params.instanceId,
      appId: params.appId,
      metadata: { name: params.appId },
    })
  }

  private getAppConnection(instanceId: string): AppConnectionMetadata | undefined {
    return this.appConnection.getConnection(instanceId)
  }

  private getAppConnections(): AppConnectionMetadata[] {
    return this.appConnection.getConnections()
  }

  disconnectInstance(instanceId: string): void {
    cleanupInstanceDacpState(this.createHandlerParams(instanceId))
    this.appConnection.pruneAppConnection(instanceId)
  }

  exportState(): string {
    return JSON.stringify(this.state, null, 2)
  }

  getIsStarted(): boolean {
    return this.isStarted
  }

  getImplementationMetadata(): SailDesktopAgentMetadata {
    return this.implementationMetadata
  }

  private getUserChannels(): BrowserTypes.Channel[] {
    return getAllUserChannels(this.state)
  }

  private getAppUserChannelId(instanceId: string): string | null {
    const instance = getInstance(this.state, instanceId)
    return instance?.currentUserChannel ?? null
  }
}
