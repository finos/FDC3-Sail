import {
  AbstractFDC3ServerInstance,
  AppRegistration,
  ChannelState,
  ChannelType,
  DirectoryApp,
  HandlersByVersion,
  InstanceID,
  State,
} from "@finos/fdc3-sail-da-impl"
import { getIcon, SailDirectory } from "../appd/SailDirectory"
import { Connection } from "./connection/Connection"
import {
  AppHosting,
  AugmentedAppIntent,
  AugmentedAppMetadata,
  ContextHistory,
  FDC3_DA_EVENT,
  SAIL_APP_CLOSE,
  SAIL_APP_OPEN,
  SAIL_BROADCAST_CONTEXT,
  SAIL_CHANNEL_SETUP,
  SAIL_INTENT_RESOLVE,
  SAIL_WSCP_PAIRING_UPDATE,
  SailAppCloseArgs,
  SailAppOpenArgs,
  SailAppOpenResponse,
  SailIntentResolveResponse,
  TabDetail,
  WscpPairing,
} from "@finos/fdc3-sail-common"
import { BrowserTypes } from "@finos/fdc3-schema"
import { AppIdentifier, AppIntent, OpenError } from "@finos/fdc3-standard"
import { v4 as uuidv4 } from "uuid"
import { ChannelChangedEvent } from "@finos/fdc3-schema/dist/generated/api/BrowserTypes"
import { mapChannels } from "./SailFDC3ServerFactory"
import { SocketIOConnection } from "./connection"
import { createLogger } from "../logger"

const log = createLogger("FDC3ServerInstance")
/**
 * Represents the state of a Sail app.
 * Pending: App has a window, but isn't connected to FDC3
 * Open: App is connected to FDC3
 * NotResponding: App is not responding to heartbeats
 * Terminated: App Window has been closed
 */
export type SailData = AppRegistration & {
  connection?: Connection
  channelConnections: Connection[]
  url?: string
  hosting: AppHosting
  channel: string | null
  instanceTitle: string
}

/**
 * Extends AbstractFDC3ServerInstance to allow for more detailed (and changeable) user channel metadata
 * as well as user-configurable SailDirectory.
 */
export class SailFDC3ServerInstance extends AbstractFDC3ServerInstance {
  readonly directory: SailDirectory
  private instances: SailData[] = []
  private readonly connection: SocketIOConnection
  private readonly channelState: ChannelState[] = []
  private readonly appStartDestinations: Map<string, string | null> = new Map()
  /** In-memory mirror of browser WSCP pairings (source of truth is LocalStorageClientState). */
  private wscpPairings: WscpPairing[] = []

  constructor(
    directory: SailDirectory,
    connection: SocketIOConnection,
    handlersByVersion: HandlersByVersion,
    channels: ChannelState[],
  ) {
    super(handlersByVersion, channels)
    this.directory = directory
    this.connection = connection
    this.channelState = channels
  }

  setWscpPairings(pairings: WscpPairing[]): void {
    this.wscpPairings = pairings.map((p) => ({ ...p }))
  }

  getWscpPairingBySecret(sharedSecret: string): WscpPairing | undefined {
    return this.wscpPairings.find((p) => p.sharedSecret === sharedSecret)
  }

  /**
   * Persist instanceId on the session mirror and notify the browser DA so localStorage stays in sync.
   */
  assignWscpInstanceId(
    sharedSecret: string,
    instanceId: string,
  ): WscpPairing | undefined {
    const idx = this.wscpPairings.findIndex(
      (p) => p.sharedSecret === sharedSecret,
    )
    if (idx === -1) {
      return undefined
    }
    const updated: WscpPairing = {
      ...this.wscpPairings[idx],
      instanceId,
    }
    this.wscpPairings[idx] = updated
    this.connection.emit(SAIL_WSCP_PAIRING_UPDATE, {
      appId: updated.appId,
      sharedSecret: updated.sharedSecret,
      instanceId,
    })
    return updated
  }

  post(message: object, instanceId: InstanceID): Promise<void> {
    const instance = this.instances.find((i) => i.instanceId == instanceId)
    if (instance) {
      if (!(message as { type?: string })?.type?.startsWith("heartbeat")) {
        this.log("Posting message to app: " + JSON.stringify(message))
      }
      instance.connection?.emit(FDC3_DA_EVENT, message)
    } else {
      this.log(`Can't find app: ${JSON.stringify(instanceId)}`)
    }
    return Promise.resolve()
  }

  notifyBroadcastContext(broadcastEvent: BrowserTypes.BroadcastRequest) {
    const channel = broadcastEvent.payload.channelId
    const context = broadcastEvent.payload.context
    this.connection.emit(SAIL_BROADCAST_CONTEXT, {
      channelId: channel,
      context: context,
    })
  }

  async open(appId: string): Promise<InstanceID> {
    const destination = this.appStartDestinations.get(appId)
    this.appStartDestinations.delete(appId)
    return this.openSail(appId, destination ?? null)
  }

  async close(instanceId: InstanceID): Promise<void> {
    const details = this.getInstanceDetails(instanceId)
    if (details) {
      try {
        await this.connection.emitWithAck(SAIL_APP_CLOSE, {
          instanceId,
          hosting: details.hosting,
        } as SailAppCloseArgs)
      } catch (e) {
        log.error({ instanceId, error: e }, "Failed to close app container in browser DA")
        throw e
      }

      // Remote apps keep an app-side socket; drop it when closing.
      if (details.hosting === AppHosting.Remote) {
        details.connection?.shutdown()
      }
    }

    await this.setAppState(instanceId, State.Terminated)
    await this.cleanupApp(instanceId)
  }

  async openOnChannel(appId: string, channel: string): Promise<void> {
    this.appStartDestinations.set(appId, channel)
  }

  async openSail(appId: string, channel: string | null): Promise<InstanceID> {
    const app: DirectoryApp[] = this.directory.retrieveAppsById(appId)

    if (app.length == 0) {
      throw new Error(OpenError.AppNotFound)
    }

    const url = (app[0].details as { url?: string })?.url ?? undefined
    if (url) {
      const forceNewWindow = (
        app[0].hostManifests as { sail?: { forceNewWindow?: boolean } }
      )?.sail?.forceNewWindow
      const approach =
        forceNewWindow || channel === null ? AppHosting.Tab : AppHosting.Frame

      const details: SailAppOpenResponse = await this.connection.emitWithAck(
        SAIL_APP_OPEN,
        {
          appDRecord: app[0],
          approach,
          channel,
        } as SailAppOpenArgs,
      )

      this.setInstanceDetails(details.instanceId, {
        appId,
        instanceId: details.instanceId,
        url,
        state: State.Pending,
        hosting: approach,
        channel: channel ?? null,
        instanceTitle: details.instanceTitle,
        channelConnections: [],
      })

      if (channel) {
        this.notifyUserChannelsChanged(details.instanceId, channel)
      }

      return details.instanceId
    }

    throw new Error(OpenError.AppNotFound)
  }

  setInstanceDetails(uuid: InstanceID, details: SailData): void {
    if (uuid != details.instanceId) {
      log.error({ uuid, instanceId: details.instanceId }, "UUID mismatch")
    }

    this.instances = this.instances.filter((ca) => ca.instanceId !== uuid)
    this.instances.push(details)
  }

  getInstanceDetails(uuid: InstanceID): SailData | undefined {
    return this.instances.find((ca) => ca.instanceId === uuid)
  }

  async setInitialChannel(app: AppIdentifier): Promise<void> {
    this.connection.emit(SAIL_CHANNEL_SETUP, app.instanceId)
  }

  async getConnectedApps(): Promise<AppRegistration[]> {
    return (await this.getAllApps()).filter((ca) => ca.state == State.Connected)
  }

  async isAppConnected(app: InstanceID): Promise<boolean> {
    const found = (await this.getAllApps()).find(
      (a) => a.instanceId == app && a.state == State.Connected,
    )
    return found != null
  }

  async setAppState(app: InstanceID, state: State): Promise<void> {
    const found = this.instances.find((a) => a.instanceId == app)
    if (found) {
      const needsInitialChannelSetup =
        found.state == State.Pending && state == State.Connected
      found.state = state
      if (needsInitialChannelSetup) {
        this.setInitialChannel(found)
      }

      if (state == State.Terminated) {
        this.instances = this.instances.filter((a) => a.instanceId !== app)
        log.info({ app }, "App terminated")
      } else {
        log.debug({ app, state }, "App state updated")
      }
    } else {
      log.error({ app, state }, "App state not found")
    }
  }

  async getAllApps(): Promise<AppRegistration[]> {
    return this.instances.map((x) => {
      return {
        appId: x.appId,
        instanceId: x.instanceId,
        state: x.state,
        fdc3Version: x.fdc3Version,
      }
    })
  }

  createUUID(): string {
    return uuidv4()
  }

  log(message: string): void {
    log.debug(message)
  }

  provider(): string {
    return "FDC3 Sail"
  }

  providerVersion(): string {
    return "2.0"
  }

  fdc3Version(): string {
    return "3.0"
  }

  private convertToTabDetail(channel: ChannelState): TabDetail {
    return {
      id: channel.id,
      icon: channel.displayMetadata?.glyph ?? "",
      background: channel.displayMetadata?.color ?? "",
    }
  }

  augmentIntents(appIntents: AppIntent[]): AugmentedAppIntent[] {
    return appIntents.map((a) => ({
      intent: a.intent,
      apps: a.apps.map((a) => {
        const dir = this.directory.retrieveAppsById(a.appId)
        const iconSrc = getIcon(dir[0])
        const title = dir.length > 0 ? dir[0]?.title : "Unknown App"

        if (a.instanceId) {
          const instance = this.getInstanceDetails(a.instanceId)
          const channel = this.getChannelDetails().find(
            (c) => c.id == instance?.channel,
          )
          return {
            ...a,
            channelData: channel ? this.convertToTabDetail(channel) : null,
            instanceTitle: instance?.instanceTitle ?? undefined,
            icons: [{ src: iconSrc }],
            title,
          } as AugmentedAppMetadata
        } else {
          return {
            ...a,
            icons: [{ src: iconSrc }],
            title,
          } as AugmentedAppMetadata
        }
      }),
    }))
  }

  /**
   * This is used when the intent resolver is managed by the desktop agent as opposed
   * to running inside an iframe in the client app.
   */
  async narrowIntents(
    raiser: AppIdentifier,
    incomingIntents: AppIntent[],
    context: BrowserTypes.Context,
  ): Promise<AppIntent[]> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const sc = this

    function runningAppsInChannel(
      arg0: AugmentedAppIntent,
      channel: string | null,
    ): number {
      return arg0.apps.filter(
        (a) => a.instanceId && a.channelData?.id == channel,
      ).length
    }

    function uniqueApps(arg0: AppIntent): number {
      return arg0.apps
        .map((a) => a.appId)
        .filter((value, index, self) => self.indexOf(value) === index).length
    }

    function isRunningInTab(arg0: AppIdentifier): boolean {
      const details = sc.getInstanceDetails(arg0.instanceId!)
      return details?.hosting == AppHosting.Tab
    }

    function raiserChannel(arg0: AppIdentifier): string | null {
      const details = sc.getInstanceDetails(arg0.instanceId!)
      return details?.channel ?? null
    }

    const augmentedIntents = this.augmentIntents(incomingIntents)

    if (isRunningInTab(raiser)) {
      // in this case, the tab needs the intent resolver
      return augmentedIntents
    }

    if (augmentedIntents.length == 0) {
      return augmentedIntents
    }

    if (augmentedIntents.length == 1 && uniqueApps(augmentedIntents[0]) == 1) {
      const channel = raiserChannel(raiser)
      const runners = runningAppsInChannel(augmentedIntents[0], channel)
      if (runners == 0) {
        // we start a new app
        this.appStartDestinations.set(
          augmentedIntents[0].apps[0].appId,
          channel,
        )
        return augmentedIntents
      } else if (runners == 1) {
        // we raise in the existing app
        return augmentedIntents
      }
    }

    return new Promise<AppIntent[]>((resolve) => {
      log.debug({ augmentedIntents, context }, "Narrowing intents")

      this.connection.emitWithCallback(
        SAIL_INTENT_RESOLVE,
        {
          appIntents: augmentedIntents,
          context,
        },
        async (response: unknown, err?: string) => {
          if (err) {
            log.error(err)
            resolve([])
          } else {
            const typedResponse = response as SailIntentResolveResponse
            log.debug({ response: typedResponse }, "Narrowed intents")

            if (appNeedsStarting(typedResponse.appIntents)) {
              // tell sail where to open the app
              const theAppIntent = getSingleAppIntent(typedResponse.appIntents)
              const theApp = theAppIntent.apps[0]
              this.appStartDestinations.set(theApp.appId, typedResponse.channel)
            }

            resolve(typedResponse.appIntents)
          }
        },
      )
    })
  }

  async notifyUserChannelsChanged(
    instanceId: string,
    channelId: string | null,
  ): Promise<void> {
    log.debug({ instanceId, channelId }, "User channels changed")
    const instance = this.getInstanceDetails(instanceId!)
    if (instance) {
      instance.channel = channelId
      const channelChangeEvent: ChannelChangedEvent = {
        type: "channelChangedEvent",
        payload: {
          newChannelId: channelId,
        },
        meta: {
          eventUuid: uuidv4(),
          timestamp: new Date(),
        },
      }
      this.post(channelChangeEvent, instanceId)
    }
  }

  async reloadAppDirectories(
    urls: string[],
    customApps: DirectoryApp[],
  ): Promise<void> {
    await this.directory.refresh(urls, customApps)
  }

  private getChannelDetails(): ChannelState[] {
    return this.channelState
  }

  getTabs(): TabDetail[] {
    return this.getChannelDetails()
      .filter((c) => c.type === ChannelType.user)
      .map((c) => this.convertToTabDetail(c))
  }

  updateUserChannelData(tabs: TabDetail[], history?: ContextHistory): void {
    function relevantHistory(
      id: string,
      history?: ContextHistory,
    ): undefined | { context: BrowserTypes.Context; metadata: { source: { appId: string; instanceId: string } } }[] {
      if (history) {
        const basicHistory = history[id]
        if (!basicHistory) {
          return undefined
        }
        // just the first item of each unique type
        const relevant = basicHistory.filter(
          (h, i, a) => a.findIndex((h2) => h2.type == h.type) == i,
        )
        return relevant.map((context) => ({
          context,
          metadata: {
            source: { appId: "sail", instanceId: "history" },
          },
        }))
      }
      return undefined
    }

    const newUserChannels = mapChannels(tabs).map((c) => {
      return {
        ...c,
        context:
          relevantHistory(c.id, history) ??
          this.channelState.find((cs) => cs.id == c.id)?.context ??
          [],
      }
    })
    // Client state only carries user-channel tabs. Preserve app/private channels
    // (and their stored context) across SAIL_CLIENT_STATE syncs — otherwise a
    // broadcast's history save wipes them and getCurrentContext returns NoChannelFound.
    const preserved = this.channelState.filter(
      (c) => c.type === ChannelType.app || c.type === ChannelType.private,
    )
    this.channelState.length = 0
    this.channelState.push(...newUserChannels, ...preserved)
    log.debug({ channelState: this.channelState }, "Updated user channel data")
  }

  getDirectory(): SailDirectory {
    return this.directory
  }
}

function appNeedsStarting(appIntents: AppIntent[]) {
  return (
    appIntents.length == 1 &&
    appIntents[0].apps.length == 1 &&
    appIntents[0].apps[0].instanceId == null
  )
}

function getSingleAppIntent(appIntents: AppIntent[]) {
  return appIntents[0]
}
