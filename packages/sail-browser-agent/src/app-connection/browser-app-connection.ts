/**
 * Browser-resident FDC3 app connection listener.
 *
 * Owns WCP1–3 handshake (postMessage), per-instance MessagePorts, and WCP6 lifecycle.
 * All app MessagePort traffic (DACP + WCP4) is forwarded to {@link SailDesktopAgent}
 * via {@link onAppMessage}.
 */

import { type Logger, type LogPayloadDetail, consoleLogger } from "../logging/logger"
import { isWebConnectionProtocol1Hello } from "@finos/fdc3-schema/dist/generated/api/BrowserTypes"
import type {
  AppRequestMessage,
  WebConnectionProtocolMessage,
} from "@finos/fdc3-schema/dist/generated/api/BrowserTypes"
import type { ValidationMode } from "./inbound-validation"
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

type BrowserAppConnectionOptions = AppConnectionOptions & {
  validation?: ValidationMode
  logPayloadDetail?: LogPayloadDetail
  /** Desktop Agent maximum supported FDC3 version (WCP1 negotiation cap). */
  fdc3Version: string
}

export class BrowserAppConnection extends AppConnectionEventEmitter {
  readonly connectionRegistry: AppConnectionRegistry

  private options: Required<AppConnectionOptions>
  private validation: ValidationMode
  private logPayloadDetail: LogPayloadDetail
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
  /** temp handshake id → validated instanceId */
  private handshakeRouting = new Map<string, string>()
  private cleanupInterval?: ReturnType<typeof setInterval>
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
      // oxlint-disable-next-line typescript/no-unnecessary-condition -- message crosses the MessagePort trust boundary
      "meta" in message && message.meta && typeof message.meta === "object"
        ? message.meta
        : undefined
    const isIdentityValidation = message.type === "WCP4ValidateAppIdentity"
    const storedConnection = this.connectionRegistry.connections.get(instanceId)
    const storedMessageOrigin = storedConnection?.messageOrigin
    const storedSourceWindow = storedConnection?.source
    const trustedAppId = storedConnection?.appId

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
    const resolvedInstanceId = this.handshakeRouting.get(instanceId) ?? instanceId
    clearPendingWcpSourceWindow(this, instanceId)
    if (resolvedInstanceId !== instanceId) {
      clearPendingWcpSourceWindow(this, resolvedInstanceId)
    }
    disconnectApp(this.getConnectionContext(), resolvedInstanceId)
  }

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

  resolveHostIdentifierForSource(source: Window): string | undefined {
    return this.options.resolveHostIdentifier(source)
  }

  pruneAppConnection(instanceId: string): void {
    const resolvedInstanceId = this.handshakeRouting.get(instanceId) ?? instanceId
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
      handshakeRouting: this.handshakeRouting,
      emit: this.emit.bind(this),
      logger: this.options.logger,
      onInstanceTeardown: this.onInstanceTeardown,
    }
  }

  private getHandshakeContext(): WCPHandshakeContext {
    return {
      ...this.getRoutingContext(),
      options: this.options,
      logPayloadDetail: this.logPayloadDetail,
      maxFdc3Version: this.fdc3Version,
    }
  }
}
