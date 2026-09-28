/**
 * Browser-resident FDC3 app connection listener.
 *
 * Owns WCP1–3 handshake (postMessage), per-instance MessagePorts, and WCP6 lifecycle.
 * DACP traffic is forwarded to {@link SailDesktopAgent} via {@link onAppMessage}.
 */

import { type Logger, type LogPayloadDetail, consoleLogger } from "../logging/logger"
import { isWebConnectionProtocol1Hello } from "@finos/fdc3-schema/dist/generated/api/BrowserTypes"
import type {
  AppRequestMessage,
  WebConnectionProtocolMessage,
} from "@finos/fdc3-schema/dist/generated/api/BrowserTypes"
import type { ValidationMode } from "../dacp/validate-dacp-message"
import {
  handleWCP1Hello as handleWCP1HelloHandshake,
  type WCPHandshakeContext,
} from "./wcp/wcp1-3-handshake"
import type { WCPRoutingContext } from "./wcp/wcp-message-routing"
import {
  requestIntentResolution,
  resolveIntentSelection,
  type PendingIntentResolution,
} from "./wcp/wcp-intent-resolver"
import {
  cleanupStaleDisconnects,
  disconnectApp,
  disconnectAppByInstanceId,
  getConnection,
  getConnections,
  handleWCP6Goodbye,
  updateConnectionMetadata,
  type AppConnectionContext,
} from "./wcp/wcp-connection-management"
import { AppConnectionEventEmitter } from "./wcp/app-connection-event-emitter"
import { clearPendingWcpSourceWindow, setPendingWcpSourceWindow } from "./wcp/pending-source-window"
import { resolveInstanceId } from "../state/selectors/wcp-handshake-routing"
import type { AgentState, StateSetter } from "../state/types"
import type { HostIntentResolverPayload, HostIntentResolverResponse } from "../host-contracts"
import {
  DEFAULT_INTENT_RESOLUTION_TIMEOUT_MS,
  type AppConnectionMetadata,
  type AppConnectionOptions,
  type WCP1HelloMessage,
} from "./wcp/wcp-types"
import type { AppMessageHandler } from "./types"
import { AppConnectionRegistry } from "./app-connection-registry"

export type { AppConnectionMetadata, AppConnectionOptions } from "./wcp/wcp-types"
export type { AppConnectionEvents } from "./app-connection-events"

/**
 * Browser edge options: host-settable WCP handshake config plus values threaded from
 * {@link SailDesktopAgent} — validation mode, log payload detail, and the advertised FDC3 version.
 */
type BrowserAppConnectionOptions = AppConnectionOptions & {
  validation?: ValidationMode
  /** How much DACP/WCP payload to include in MessagePortTransport debug logs. */
  logPayloadDetail?: LogPayloadDetail
  /**
   * FDC3 version to advertise in WCP3Handshake. Threaded from the agent's
   * `implementationMetadata.fdc3Version` so WCP3, WCP5, `getInfo` and `closeRequest` gating
   * all read one setting. Not part of {@link AppConnectionOptions} — hosts set the version on
   * `implementationMetadata`, not here.
   */
  fdc3Version: string
}

export class BrowserAppConnection extends AppConnectionEventEmitter {
  readonly connectionRegistry: AppConnectionRegistry

  private options: Required<AppConnectionOptions>
  private validation: ValidationMode
  private logPayloadDetail: LogPayloadDetail
  /** Agent-threaded `implementationMetadata.fdc3Version`, advertised in WCP3Handshake. */
  private fdc3Version: string
  private isStarted = false
  private appMessageHandler?: AppMessageHandler
  private boundHandleWindowMessage = this.handleWindowMessage.bind(this)
  private pendingIntentResolutions = new Map<string, PendingIntentResolution>()
  private pendingDisconnects = new Map<string, ReturnType<typeof setTimeout>>()
  private recentlyDisconnected = new Map<
    string,
    { metadata: AppConnectionMetadata; disconnectedAt: number }
  >()
  private cleanupInterval?: ReturnType<typeof setInterval>
  private getAgentState?: () => AgentState
  private setAgentState?: StateSetter
  private onInstanceTeardown?: (instanceId: string) => void

  constructor(options: BrowserAppConnectionOptions) {
    super()
    const logger: Logger = options.logger ?? consoleLogger
    const intentResolverUrl = options.intentResolverUrl ?? false
    const channelSelectorUrl = options.channelSelectorUrl ?? false
    this.validation = options.validation ?? "warn"
    this.logPayloadDetail = options.logPayloadDetail ?? "metadata"
    this.fdc3Version = options.fdc3Version
    this.options = {
      intentResolverUrl,
      channelSelectorUrl,
      getIntentResolverUrl:
        options.getIntentResolverUrl ??
        (options.intentResolverUrl !== undefined ? () => intentResolverUrl : () => false),
      getChannelSelectorUrl:
        options.getChannelSelectorUrl ??
        (options.channelSelectorUrl !== undefined ? () => channelSelectorUrl : () => false),
      handshakeTimeout: options.handshakeTimeout ?? 5000,
      disconnectGracePeriod: options.disconnectGracePeriod ?? 2000,
      intentResolutionTimeout:
        options.intentResolutionTimeout ?? DEFAULT_INTENT_RESOLUTION_TIMEOUT_MS,
      debug: options.debug ?? false,
      logger,
      resolveHostIdentifier: options.resolveHostIdentifier ?? (() => undefined),
    }

    this.connectionRegistry = new AppConnectionRegistry({
      emit: this.emit.bind(this),
      logger: this.options.logger,
      updateConnectionMetadata: (temp, actual, appId) =>
        this.updateConnectionMetadata(temp, actual, appId),
      disconnectApp: instanceId => this.disconnectHandshakeApp(instanceId),
    })
  }

  bindAgentState(access: { getAgentState: () => AgentState; setAgentState: StateSetter }): void {
    this.getAgentState = access.getAgentState
    this.setAgentState = access.setAgentState
  }

  /** Wire unified instance teardown from {@link SailDesktopAgent.disconnectInstance}. */
  setOnInstanceTeardown(handler: (instanceId: string) => void): void {
    this.onInstanceTeardown = handler
  }

  notifyChannelMembershipChanged(instanceId: string, channelId: string | null): void {
    this.emit("channelChanged", instanceId, channelId)
  }

  onAppMessage(handler: AppMessageHandler): void {
    this.appMessageHandler = handler
  }

  sendToAppInstance(_instanceId: string, message: unknown): void {
    this.connectionRegistry.sendToAppInstance(message)
  }

  start(): void {
    if (this.isStarted) {
      throw new Error("BrowserAppConnection is already started")
    }
    if (typeof window === "undefined") {
      throw new Error("BrowserAppConnection requires a browser environment")
    }

    window.addEventListener("message", this.boundHandleWindowMessage)
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleDisconnects()
    }, 30000)
    this.isStarted = true
  }

  stop(): void {
    if (!this.isStarted) {
      return
    }

    if (typeof window !== "undefined") {
      window.removeEventListener("message", this.boundHandleWindowMessage)
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = undefined
    }

    for (const [instanceId] of this.connectionRegistry.connections) {
      this.disconnectApp(instanceId)
    }

    this.isStarted = false
  }

  private handleWindowMessage(event: MessageEvent): void {
    if (!isWebConnectionProtocol1Hello(event.data)) {
      return
    }

    try {
      handleWCP1HelloHandshake(event as MessageEvent<WCP1HelloMessage>, this.getHandshakeContext())
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err))
      this.options.logger.error("Error handling WCP1Hello:", error)
      this.emit("handshakeFailed", error, event.data.meta.connectionAttemptUuid)
    }
  }

  private enrichMessageWithSource(
    message: AppRequestMessage | WebConnectionProtocolMessage,
    instanceId: string,
  ): AppRequestMessage | WebConnectionProtocolMessage {
    const currentMeta =
      // oxlint-disable-next-line typescript/no-unnecessary-condition -- message crosses the MessagePort trust boundary; app-authored `meta` is stripped and re-stamped here, so the declared type is an assumption, not a guarantee.
      "meta" in message && message.meta && typeof message.meta === "object"
        ? message.meta
        : undefined
    const isIdentityValidation = message.type === "WCP4ValidateAppIdentity"
    const storedConnection = this.connectionRegistry.connections.get(instanceId)
    const storedMessageOrigin = storedConnection?.messageOrigin
    const storedSourceWindow = storedConnection?.source
    const trustedAppId = storedConnection?.appId

    // Strip app-authored identity fields before spreading — DA determines source/origin.
    // `hostInstanceId` is included: handlers resolve identity from it, so an app that
    // supplies its own could act as any other live instance.
    const {
      source: _appSource,
      messageOrigin: _appMessageOrigin,
      hostInstanceId: _appHostInstanceId,
      ...safeMetaRest
    } = (currentMeta ?? {}) as Record<string, unknown>

    const nextMeta = { ...safeMetaRest } as unknown as typeof message.meta
    const nextMetaRecord = nextMeta as unknown as Record<string, unknown>

    nextMetaRecord.source = {
      appId: trustedAppId,
      instanceId,
    }

    // Absence of a trusted origin must clear the field — never keep the client's value.
    if (storedMessageOrigin) {
      nextMetaRecord.messageOrigin = storedMessageOrigin
    } else {
      delete nextMetaRecord.messageOrigin
    }

    if (isIdentityValidation && storedSourceWindow) {
      setPendingWcpSourceWindow(this, instanceId, storedSourceWindow)
    }

    return {
      ...message,
      meta: nextMeta,
    } as unknown as AppRequestMessage | WebConnectionProtocolMessage
  }

  private handleWCP6Goodbye(instanceId: string): void {
    handleWCP6Goodbye(this.getConnectionContext(), instanceId)
  }

  private cleanupStaleDisconnects(): void {
    cleanupStaleDisconnects(this.getConnectionContext())
  }

  disconnectAppByInstanceId(instanceId: string): void {
    disconnectAppByInstanceId(this.getConnectionContext(), instanceId)
  }

  private disconnectApp(instanceId: string): void {
    const state = this.getAgentState?.()
    const resolvedInstanceId = state ? resolveInstanceId(state, instanceId) : instanceId
    clearPendingWcpSourceWindow(this, instanceId)
    if (resolvedInstanceId !== instanceId) {
      clearPendingWcpSourceWindow(this, resolvedInstanceId)
    }
    disconnectApp(this.getConnectionContext(), resolvedInstanceId)
  }

  /**
   * Disconnect a connection still keyed by its temporary handshake id, using that id exactly.
   *
   * Unlike {@link disconnectApp}, this does NOT resolve through the `temp -> validated` link that
   * {@link updateConnectionMetadata} records on WCP5 success. Both callers are handshake-scoped and
   * are handed a temp id: the pre-WCP5 handshake timeout, and a WCP5 failure response (always
   * addressed to the temp id — see `sendFailureResponse`'s `getInboundInstanceId()` fallback).
   * Resolving either forward would disconnect the live connection that a *different*, successful
   * handshake had already established under that same temp id.
   */
  private disconnectHandshakeApp(instanceId: string): void {
    clearPendingWcpSourceWindow(this, instanceId)
    disconnectApp(this.getConnectionContext(), instanceId)
  }

  updateConnectionMetadata(tempInstanceId: string, actualInstanceId: string, appId: string): void {
    updateConnectionMetadata(this.getConnectionContext(), tempInstanceId, actualInstanceId, appId)
  }

  getConnections(): AppConnectionMetadata[] {
    return getConnections(this.getConnectionContext())
  }

  getConnection(instanceId: string): AppConnectionMetadata | undefined {
    return getConnection(this.getConnectionContext(), instanceId)
  }

  /** Host launcher id when `window.name` was cleared before WCP1. */
  resolveHostIdentifierForSource(source: Window): string | undefined {
    return this.options.resolveHostIdentifier(source)
  }

  pruneAppConnection(instanceId: string): void {
    const state = this.getAgentState?.()
    const resolvedInstanceId = state ? resolveInstanceId(state, instanceId) : instanceId
    clearPendingWcpSourceWindow(this, instanceId)
    if (resolvedInstanceId !== instanceId) {
      clearPendingWcpSourceWindow(this, resolvedInstanceId)
    }
    disconnectApp(this.getConnectionContext(), resolvedInstanceId)
  }

  getIsStarted(): boolean {
    return this.isStarted
  }

  requestIntentResolution(
    payload: HostIntentResolverPayload,
    timeoutMs?: number,
  ): Promise<HostIntentResolverResponse> {
    const timeout = timeoutMs ?? this.options.intentResolutionTimeout
    return requestIntentResolution(
      this.pendingIntentResolutions,
      intentPayload => this.emit("intentResolverNeeded", intentPayload),
      payload,
      timeout,
    )
  }

  resolveIntentSelection(response: HostIntentResolverResponse): void {
    resolveIntentSelection(this.pendingIntentResolutions, response)
  }

  private forwardAppMessage(message: unknown): void {
    if (!this.appMessageHandler) {
      this.options.logger.warn(
        "BrowserAppConnection received app message before onAppMessage handler was set",
      )
      return
    }
    void this.appMessageHandler(message)
  }

  private getRoutingContext(): WCPRoutingContext {
    const onInstanceTeardown = (instanceId: string) => {
      if (this.onInstanceTeardown) {
        this.onInstanceTeardown(instanceId)
        return
      }
      this.disconnectApp(instanceId)
    }
    return {
      connectionRegistry: this.connectionRegistry,
      onAppMessage: message => this.forwardAppMessage(message),
      emit: this.emit.bind(this),
      logger: this.options.logger,
      validation: this.validation,
      enrichMessageWithSource: this.enrichMessageWithSource.bind(this),
      handleWCP6Goodbye: this.handleWCP6Goodbye.bind(this),
      onInstanceTeardown,
      disconnectApp: this.disconnectHandshakeApp.bind(this),
    }
  }

  private getConnectionContext(): AppConnectionContext {
    return {
      connectionRegistry: this.connectionRegistry,
      options: this.options,
      pendingDisconnects: this.pendingDisconnects,
      recentlyDisconnected: this.recentlyDisconnected,
      emit: this.emit.bind(this),
      logger: this.options.logger,
      getAgentState: this.getAgentState,
      setAgentState: this.setAgentState,
      onInstanceTeardown: this.onInstanceTeardown,
    }
  }

  private getHandshakeContext(): WCPHandshakeContext {
    return {
      ...this.getRoutingContext(),
      options: this.options,
      logPayloadDetail: this.logPayloadDetail,
      fdc3Version: this.fdc3Version,
    }
  }
}
