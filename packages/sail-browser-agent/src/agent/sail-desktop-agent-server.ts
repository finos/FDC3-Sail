/**
 * sail-headless-agent bridge for {@link SailDesktopAgent}: AbstractFDC3ServerInstance
 * overrides plus inbound WCP/DACP routing onto {@link receive}.
 */

import {
  OpenError,
  type AppIdentifier,
  type AppIntent,
  type AppMetadata,
  type BrowserTypes,
  type Context,
} from "@finos/fdc3"
import {
  AbstractFDC3ServerInstance,
  ChannelType,
  State,
  type AppRegistration,
  type BasicDirectory,
  type ChannelState,
  type InstanceID,
  type LogFunction,
} from "@finos/sail-headless-agent"
import { AppConnectionRegistry } from "../app-connection/app-connection-registry"
import type { AgentAppConnection } from "../app-connection/types"
import type { AppLauncher } from "../host-contracts/app-launcher"
import type { Logger } from "../logging/logger"
import type { SailDesktopAgentMetadata } from "./default-config"
import { toFdc3ApiVersion } from "./fdc3-version"
import type { DesktopAgentAppInstanceStatus } from "./sail-desktop-agent-types"

export function createHandlerLog(logger: Logger, name: string): LogFunction {
  return (message: string, ...args: unknown[]) => {
    if (args.length > 0) {
      logger.debug(`[${name}] ${message}`, { args })
    } else {
      logger.debug(`[${name}] ${message}`)
    }
  }
}

export function mapUserChannelsToChannelState(channels: BrowserTypes.Channel[]): ChannelState[] {
  return channels.map(c => ({
    id: c.id,
    type: ChannelType.user,
    displayMetadata: {
      name: c.displayMetadata?.name ?? c.id,
      glyph: c.displayMetadata?.glyph,
      color: c.displayMetadata?.color,
    },
    context: [],
  }))
}

export function mapStateToStatus(state: State): DesktopAgentAppInstanceStatus {
  switch (state) {
    case State.Connected:
      return "connected"
    case State.NotResponding:
      return "not-responding"
    case State.Pending:
    default:
      return "pending"
  }
}

function uniqueAppCount(intent: AppIntent): number {
  return intent.apps.map(a => a.appId).filter((value, index, self) => self.indexOf(value) === index)
    .length
}

/**
 * Shared server surface: instance registry + AbstractFDC3ServerInstance methods.
 */
export abstract class SailDesktopAgentServer extends AbstractFDC3ServerInstance {
  protected instances: AppRegistration[] = []
  protected abstract directory: BasicDirectory
  protected abstract appConnection: AgentAppConnection
  protected abstract appLauncher?: AppLauncher
  protected abstract logger: Logger
  protected abstract implementationMetadata: SailDesktopAgentMetadata

  createUUID(): string {
    return crypto.randomUUID()
  }

  post(message: object, instanceId: InstanceID): Promise<void> {
    const registry = this.appConnection.connectionRegistry
    if (!(registry instanceof AppConnectionRegistry)) {
      registry.sendToAppInstance(message)
      return Promise.resolve()
    }

    const msg = message as {
      type?: string
      meta?: Record<string, unknown>
      payload?: { instanceId?: string; appId?: string }
    }

    let destinationId = instanceId

    // WCP5 success is addressed to the validated instanceId, but the MessagePort is
    // still keyed by the temporary handshake id until updateConnectionMetadata runs.
    if (msg.type === "WCP5ValidateAppIdentityResponse") {
      const attemptUuid = msg.meta?.connectionAttemptUuid
      if (typeof attemptUuid === "string") {
        const tempId = `temp-${attemptUuid}`
        if (registry.messagePortTransports.has(tempId)) {
          destinationId = tempId
        }
      }
      if (destinationId === instanceId) {
        for (const [id, conn] of registry.connections) {
          if (conn.hostIdentifier === instanceId || id === instanceId) {
            destinationId = id
            break
          }
        }
      }
    } else if (!registry.messagePortTransports.has(instanceId)) {
      for (const [id, conn] of registry.connections) {
        if (conn.hostIdentifier === instanceId) {
          destinationId = id
          break
        }
      }
    }

    registry.sendToAppInstance({
      ...msg,
      meta: {
        ...msg.meta,
        destination: {
          appId: msg.payload?.appId ?? "unknown",
          instanceId: destinationId,
        },
      },
    })
    return Promise.resolve()
  }

  getInstanceDetails(uuid: InstanceID): AppRegistration | undefined {
    return this.instances.find(i => i.instanceId === uuid)
  }

  setInstanceDetails(uuid: InstanceID, meta: AppRegistration): void {
    this.instances = this.instances.filter(
      i => i.instanceId !== uuid && i.instanceId !== meta.instanceId,
    )
    this.instances.push({ ...meta, instanceId: meta.instanceId || uuid })
  }

  async open(appId: string): Promise<InstanceID> {
    if (!this.appLauncher) {
      throw new Error("App launching not available - no AppLauncher configured")
    }

    const catalogApps = this.directory.retrieveAppsById(appId)
    if (catalogApps.length === 0) {
      throw new Error(OpenError.AppNotFound)
    }

    const instanceId = this.createUUID()
    const payload: BrowserTypes.OpenRequestPayload = {
      app: { appId, instanceId },
    }
    const launched = await this.appLauncher.launch(payload, catalogApps[0] as AppMetadata)
    const id = launched.instanceId ?? instanceId
    this.setInstanceDetails(id, {
      appId: launched.appId,
      instanceId: id,
      state: State.Pending,
      fdc3Version: toFdc3ApiVersion(this.implementationMetadata.fdc3Version),
    })
    return id
  }

  async close(instanceId: InstanceID): Promise<void> {
    try {
      await this.appLauncher?.close?.(instanceId)
    } catch (e) {
      this.logger.error(`[SailDesktopAgent] AppLauncher.close failed for ${instanceId}`, e)
      throw e
    }
    await this.setAppState(instanceId, State.Terminated)
    await this.cleanupApp(instanceId)
    this.instances = this.instances.filter(i => i.instanceId !== instanceId)
    this.appConnection.pruneAppConnection(instanceId)
  }

  async getConnectedApps(): Promise<AppRegistration[]> {
    return (await this.getAllApps()).filter(a => a.state === State.Connected)
  }

  isAppConnected(app: InstanceID): Promise<boolean> {
    const found = this.instances.find(a => a.instanceId === app && a.state === State.Connected)
    return Promise.resolve(found != null)
  }

  setAppState(app: InstanceID, newState: State): Promise<void> {
    const found = this.instances.find(a => a.instanceId === app)
    if (found) {
      found.state = newState
      if (newState === State.Terminated) {
        this.instances = this.instances.filter(a => a.instanceId !== app)
      }
    }
    return Promise.resolve()
  }

  getAllApps(): Promise<AppRegistration[]> {
    return Promise.resolve([...this.instances])
  }

  log(message: string): void {
    this.logger.debug(message)
  }

  provider(): string {
    return this.implementationMetadata.provider
  }

  providerVersion(): string {
    return this.implementationMetadata.providerVersion ?? "0.0.0"
  }

  fdc3Version(): string {
    return this.implementationMetadata.fdc3Version
  }

  getDirectory(): BasicDirectory {
    return this.directory
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

    if (!this.appConnection.requestIntentResolution) {
      return appIntents.length > 0 ? [appIntents[0]!] : []
    }

    const primary = appIntents[0]!
    const handlers = appIntents.flatMap(ai =>
      ai.apps.map(app => ({
        ...app,
        isRunning: Boolean(app.instanceId),
      })),
    )

    try {
      const response = await this.appConnection.requestIntentResolution({
        requestId: this.createUUID(),
        intent: primary.intent.name,
        context,
        handlers,
        choices: appIntents.flatMap(ai =>
          ai.apps.map(app => ({
            intent: ai.intent,
            handler: { ...app, isRunning: Boolean(app.instanceId) },
          })),
        ),
      })

      if (!response.selectedHandler) {
        return []
      }

      const selectedIntentName = response.intent ?? primary.intent.name
      const matching = appIntents.find(ai => ai.intent.name === selectedIntentName) ?? primary
      const selectedApp = matching.apps.find(
        a =>
          a.appId === response.selectedHandler!.appId &&
          (response.selectedHandler!.instanceId
            ? a.instanceId === response.selectedHandler!.instanceId
            : true),
      )

      if (!selectedApp) {
        return [
          {
            intent: matching.intent,
            apps: [
              {
                appId: response.selectedHandler.appId,
                instanceId: response.selectedHandler.instanceId,
              },
            ],
          },
        ]
      }

      return [{ intent: matching.intent, apps: [selectedApp] }]
    } catch (error) {
      this.logger.error("[SailDesktopAgent] narrowIntents failed", error)
      return []
    }
  }

  /**
   * Forward all inbound app messages (DACP + WCP4) to {@link receive}.
   */
  protected async handleMessage(message: unknown): Promise<void> {
    if (!message || typeof message !== "object") {
      return
    }

    const messageType = (message as { type?: string }).type
    if (!messageType) {
      return
    }

    const from = this.resolveInboundInstanceId(message)
    if (!from) {
      return
    }

    await this.receive(message as { type: string }, from)
  }

  private resolveInboundInstanceId(message: unknown): string | null {
    if (!message || typeof message !== "object") {
      return null
    }

    const messageObj = message as {
      type?: string
      meta?: {
        source?: { instanceId?: string }
        connectionAttemptUuid?: string
      }
    }

    const sourceInstanceId = messageObj.meta?.source?.instanceId
    if (sourceInstanceId) {
      if (messageObj.type === "WCP4ValidateAppIdentity") {
        return this.resolveWcp4From(sourceInstanceId)
      }
      return sourceInstanceId
    }

    if (messageObj.type === "WCP4ValidateAppIdentity" && messageObj.meta?.connectionAttemptUuid) {
      return this.resolveWcp4From(`temp-${messageObj.meta.connectionAttemptUuid}`)
    }

    return null
  }

  /**
   * Prefer a host-pre-registered pending instance (iframe `window.name`) over the
   * temporary handshake id so OpenHandler can validate identity.
   */
  private resolveWcp4From(tempOrSourceId: string): string {
    if (this.getInstanceDetails(tempOrSourceId)) {
      return tempOrSourceId
    }
    const conn = this.appConnection.getConnection(tempOrSourceId)
    const hostId = conn?.hostIdentifier
    if (hostId && this.getInstanceDetails(hostId)) {
      return hostId
    }
    return tempOrSourceId
  }
}
