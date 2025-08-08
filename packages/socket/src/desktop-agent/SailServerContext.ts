import { Socket } from "socket.io"
import { v4 as uuidv4 } from "uuid"
import {
  AppRegistration,
  ChannelState,
  DirectoryApp,
  InstanceID,
  ServerContext,
  State,
} from "@finos/fdc3-web-impl"
import type { FDC3Server } from "@finos/fdc3-web-impl"
import { AppIdentifier } from "@finos/fdc3"
import { SailDirectory } from "../app-directory/sailDirectory"
import { AppIntent, Context, OpenError } from "@finos/fdc3"
import {
  FDC3_DA_EVENT,
  SAIL_APP_OPEN,
  SAIL_CHANNEL_SETUP,
  SAIL_INTENT_RESOLVE,
  SailAppOpenArgs,
  AppHosting,
  SailIntentResolveResponse,
  AugmentedAppIntent,
  AugmentedAppMetadata,
  SailAppOpenResponse,
  TabDetail,
  ContextHistory,
  SAIL_BROADCAST_CONTEXT,
} from "@finos/fdc3-sail-common"
import {
  BroadcastRequest,
  ChannelChangedEvent,
} from "@finos/fdc3-schema/dist/generated/api/BrowserTypes"
import { mapChannels } from "./sailFDC3Server"
import { APP_CONFIG } from "../constants"

/**
 * Retrieves the icon URL for an application directory entry
 * @param appDirectory - The directory app entry to get icon for
 * @returns The icon source URL or default icon if none found
 */
function getIcon(appDirectory: DirectoryApp | undefined): string {
  if (appDirectory) {
    const icons = appDirectory.icons ?? []
    if (icons.length > 0) {
      return icons[0].src
    }
  }

  return APP_CONFIG.DEFAULT_ICON
}

/** Type for FDC3Server handlers to safely access channel state */
interface FDC3ServerWithHandlers {
  handlers: Array<{
    state: ChannelState[]
  }>
  cleanup: (instanceId: InstanceID) => void
}

/**
 * Represents the state of a Sail app.
 * - Pending: App has a window, but isn't connected to FDC3
 * - Connected: App is connected to FDC3
 * - NotResponding: App is not responding to heartbeats
 * - Terminated: App window has been closed
 */
export interface SailData extends AppRegistration {
  readonly socket?: Socket
  readonly channelSockets: readonly Socket[]
  readonly url?: string
  readonly hosting: AppHosting
  channel: string | null
  readonly instanceTitle: string
}

/**
 * Server context implementation for FDC3 Sail desktop agent.
 * Manages app instances, channels, and communication between client apps and the desktop agent.
 */
export class SailServerContext implements ServerContext<SailData> {
  public readonly directory: SailDirectory
  private readonly instances: SailData[] = []
  private fdc3Server: FDC3ServerWithHandlers | undefined
  private readonly socket: Socket
  private readonly appStartDestinations = new Map<string, string | null>()

  /**
   * Creates a new SailServerContext
   * @param directory - The application directory service
   * @param socket - Socket.io socket for communication with the client
   */
  constructor(directory: SailDirectory, socket: Socket) {
    this.directory = directory
    this.socket = socket
  }

  /**
   * Sets the FDC3 server instance
   * @param server - The FDC3 server to associate with this context
   */
  setFDC3Server(server: FDC3Server): void {
    this.fdc3Server = server as unknown as FDC3ServerWithHandlers
  }

  /**
   * Posts a message to a specific app instance
   * @param message - The message object to send
   * @param instanceId - The ID of the target app instance
   */
  async post(message: object, instanceId: InstanceID): Promise<void> {
    const instance = this.findInstanceById(instanceId)
    if (instance) {
      const messageWithType = message as { type?: string }
      if (!messageWithType?.type?.startsWith("heartbeat")) {
        this.log(`Posting message to app: ${JSON.stringify(message)}`)
      }
      instance.socket?.emit(FDC3_DA_EVENT, message)
    } else {
      this.log(`Cannot find app with instanceId: ${JSON.stringify(instanceId)}`)
    }
  }

  /**
   * Notifies the client about a context broadcast event
   * @param broadcastEvent - The broadcast request containing channel and context data
   */
  notifyBroadcastContext(broadcastEvent: BroadcastRequest): void {
    const { channelId, context } = broadcastEvent.payload
    this.socket.emit(SAIL_BROADCAST_CONTEXT, {
      channelId,
      context,
    })
  }

  /**
   * Opens an app and returns its instance ID
   * @param appId - The ID of the app to open
   * @returns Promise resolving to the new instance ID
   */
  async open(appId: string): Promise<InstanceID> {
    const destination = this.appStartDestinations.get(appId)
    this.appStartDestinations.delete(appId)
    return this.openSail(appId, destination ?? null)
  }

  /**
   * Sets the channel destination for the next app opening
   * @param appId - The ID of the app that will be opened
   * @param channel - The channel where the app should be opened
   */
  async openOnChannel(appId: string, channel: string): Promise<void> {
    this.appStartDestinations.set(appId, channel)
  }

  /**
   * Opens a Sail app in the specified channel
   * @param appId - The ID of the app to open
   * @param channel - The channel to open the app in (null for default)
   * @returns Promise resolving to the new instance ID
   * @throws Error if app is not found or has no URL
   */
  async openSail(appId: string, channel: string | null): Promise<InstanceID> {
    const applications = this.directory.retrieveAppsById(appId)

    if (applications.length === 0) {
      throw new Error(OpenError.AppNotFound)
    }

    const [firstApp] = applications
    const url = (firstApp.details as { url?: string })?.url

    if (!url) {
      throw new Error(OpenError.AppNotFound)
    }

    const forceNewWindow = (
      firstApp.hostManifests as { sail?: { forceNewWindow?: boolean } }
    )?.sail?.forceNewWindow
    const hosting =
      forceNewWindow || channel === null ? AppHosting.Tab : AppHosting.Frame

    const openResponse: SailAppOpenResponse = await this.socket.emitWithAck(
      SAIL_APP_OPEN,
      {
        appDRecord: firstApp,
        approach: hosting,
        channel,
      } as SailAppOpenArgs,
    )

    const sailData: SailData = {
      appId,
      instanceId: openResponse.instanceId,
      url,
      state: State.Pending,
      hosting,
      channel,
      instanceTitle: openResponse.instanceTitle,
      channelSockets: [],
    }

    this.setInstanceDetails(openResponse.instanceId, sailData)

    if (channel) {
      await this.notifyUserChannelsChanged(openResponse.instanceId, channel)
    }

    return openResponse.instanceId
  }

  /**
   * Helper method to find an instance by ID
   * @param instanceId - The instance ID to search for
   * @returns The matching SailData instance or undefined if not found
   */
  private findInstanceById(instanceId: InstanceID): SailData | undefined {
    return this.instances.find((instance) => instance.instanceId === instanceId)
  }

  /**
   * Sets or updates instance details
   * @param uuid - The instance ID
   * @param details - The complete instance data
   */
  setInstanceDetails(uuid: InstanceID, details: SailData): void {
    if (uuid !== details.instanceId) {
      console.error("UUID mismatch", uuid, details.instanceId)
    }

    const instanceIndex = this.instances.findIndex(
      (instance) => instance.instanceId === uuid,
    )
    if (instanceIndex >= 0) {
      this.instances[instanceIndex] = details
    } else {
      this.instances.push(details)
    }
  }

  /**
   * Gets instance details by ID
   * @param uuid - The instance ID to look up
   * @returns The instance data or undefined if not found
   */
  getInstanceDetails(uuid: InstanceID): SailData | undefined {
    return this.findInstanceById(uuid)
  }

  /**
   * Sets up initial channel for an app
   * @param app - The app identifier containing instance ID
   */
  async setInitialChannel(app: AppIdentifier): Promise<void> {
    this.socket.emit(SAIL_CHANNEL_SETUP, app.instanceId)
  }

  /**
   * Gets all currently connected apps
   * @returns Array of connected app registrations
   */
  async getConnectedApps(): Promise<AppRegistration[]> {
    const allApps = await this.getAllApps()
    return allApps.filter((app) => app.state === State.Connected)
  }

  /**
   * Checks if a specific app instance is connected
   * @param instanceId - The instance ID to check
   * @returns True if the app is connected, false otherwise
   */
  async isAppConnected(instanceId: InstanceID): Promise<boolean> {
    const allApps = await this.getAllApps()
    return allApps.some(
      (app) => app.instanceId === instanceId && app.state === State.Connected,
    )
  }

  /**
   * Updates the state of an app instance
   * @param instanceId - The instance ID to update
   * @param state - The new state to set
   */
  async setAppState(instanceId: InstanceID, state: State): Promise<void> {
    const instanceIndex = this.instances.findIndex(
      (instance) => instance.instanceId === instanceId,
    )

    if (instanceIndex === -1) {
      return
    }

    const instance = this.instances[instanceIndex]
    const needsInitialChannelSetup =
      instance.state === State.Pending && state === State.Connected

    // Create updated instance with new state
    const updatedInstance: SailData = { ...instance, state }
    this.instances[instanceIndex] = updatedInstance

    if (needsInitialChannelSetup) {
      await this.setInitialChannel(updatedInstance)
    }

    if (state === State.Terminated) {
      this.instances.splice(instanceIndex, 1)
      this.fdc3Server?.cleanup(instanceId)
    }
  }

  /**
   * Gets all app instances as registrations
   * @returns Array of all app registrations
   */
  async getAllApps(): Promise<AppRegistration[]> {
    return this.instances.map((instance) => ({
      appId: instance.appId,
      instanceId: instance.instanceId,
      state: instance.state,
    }))
  }

  /**
   * Creates a new UUID
   * @returns A new UUID string
   */
  createUUID(): string {
    return uuidv4()
  }

  /**
   * Logs a message with SAIL prefix
   * @param message - The message to log
   */
  log(message: string): void {
    console.log(`SAIL: ${message}`)
  }

  /**
   * Gets the provider name
   * @returns The FDC3 provider name
   */
  provider(): string {
    return APP_CONFIG.PROVIDER_NAME
  }

  /**
   * Gets the provider version
   * @returns The provider version string
   */
  providerVersion(): string {
    return APP_CONFIG.PROVIDER_VERSION
  }

  /**
   * Gets the FDC3 version
   * @returns The FDC3 version string
   */
  fdc3Version(): string {
    return APP_CONFIG.FDC3_VERSION
  }

  /**
   * Converts a ChannelState to TabDetail format
   * @param channel - The channel state to convert
   * @returns Tab detail with id, icon, and background color
   */
  convertToTabDetail(channel: ChannelState): TabDetail {
    return {
      id: channel.id,
      icon: channel.displayMetadata?.glyph ?? "",
      background: channel.displayMetadata?.color ?? "",
    }
  }

  /**
   * Augments app intents with additional metadata like icons, titles, and channel data
   * @param appIntents - The base app intents to augment
   * @returns Augmented app intents with additional metadata
   */
  augmentIntents(appIntents: AppIntent[]): AugmentedAppIntent[] {
    return appIntents.map((appIntent) => ({
      intent: appIntent.intent,
      apps: appIntent.apps.map((app) => {
        const directoryApps = this.directory.retrieveAppsById(app.appId)
        const directoryApp = directoryApps[0]
        const iconSrc = getIcon(directoryApp)
        const title = directoryApp?.title ?? "Unknown App"

        const baseAppMetadata = {
          ...app,
          icons: [{ src: iconSrc }],
          title,
        }

        if (app.instanceId) {
          const instance = this.getInstanceDetails(app.instanceId)
          const channels = this.getChannelDetails()
          const channel = channels.find((c) => c.id === instance?.channel)

          return {
            ...baseAppMetadata,
            channelData: channel ? this.convertToTabDetail(channel) : null,
            instanceTitle: instance?.instanceTitle,
          } as AugmentedAppMetadata
        }

        return baseAppMetadata as AugmentedAppMetadata
      }),
    }))
  }

  /**
   * Helper methods for intent narrowing
   */
  private countRunningAppsInChannel(
    appIntent: AugmentedAppIntent,
    channel: string | null,
  ): number {
    return appIntent.apps.filter(
      (app) => app.instanceId && app.channelData?.id === channel,
    ).length
  }

  private countUniqueApps(appIntent: AppIntent): number {
    const uniqueAppIds = new Set(appIntent.apps.map((app) => app.appId))
    return uniqueAppIds.size
  }

  private isAppRunningInTab(appIdentifier: AppIdentifier): boolean {
    if (!appIdentifier.instanceId) return false
    const details = this.getInstanceDetails(appIdentifier.instanceId)
    return details?.hosting === AppHosting.Tab
  }

  private getRaiserChannel(appIdentifier: AppIdentifier): string | null {
    if (!appIdentifier.instanceId) return null
    const details = this.getInstanceDetails(appIdentifier.instanceId)
    return details?.channel ?? null
  }

  private async handleIntentResolverPromise(
    augmentedIntents: AugmentedAppIntent[],
    context: Context,
  ): Promise<AppIntent[]> {
    return new Promise<AppIntent[]>((resolve) => {
      console.log("SAIL Narrowing intents", augmentedIntents, context)

      this.socket.emit(
        SAIL_INTENT_RESOLVE,
        {
          appIntents: augmentedIntents,
          context,
        },
        async (response: SailIntentResolveResponse, err: string) => {
          if (err) {
            console.error("Intent resolution error:", err)
            resolve([])
            return
          }

          console.log("SAIL Narrowed intents", response)

          if (this.appNeedsStarting(response.appIntents)) {
            const singleAppIntent = this.getSingleAppIntent(response.appIntents)
            if (singleAppIntent) {
              const targetApp = singleAppIntent.apps[0]
              this.appStartDestinations.set(targetApp.appId, response.channel)
            }
          }

          resolve(response.appIntents)
        },
      )
    })
  }

  /**
   * Narrows down intent options based on running apps and user preferences.
   * This is used when the intent resolver is managed by the desktop agent.
   * @param raiser - The app that raised the intent
   * @param incomingIntents - Available intent options
   * @param context - The context being passed with the intent
   * @returns Promise resolving to narrowed intent options
   */
  async narrowIntents(
    raiser: AppIdentifier,
    incomingIntents: AppIntent[],
    context: Context,
  ): Promise<AppIntent[]> {
    const augmentedIntents = this.augmentIntents(incomingIntents)

    // If raiser is in a tab, it needs the intent resolver
    if (this.isAppRunningInTab(raiser)) {
      return augmentedIntents
    }

    // No intents available
    if (augmentedIntents.length === 0) {
      return augmentedIntents
    }

    // Single intent with single app - check if we need to start or raise
    if (
      augmentedIntents.length === 1 &&
      this.countUniqueApps(augmentedIntents[0]) === 1
    ) {
      const raiserChannel = this.getRaiserChannel(raiser)
      const runningApps = this.countRunningAppsInChannel(
        augmentedIntents[0],
        raiserChannel,
      )

      if (runningApps === 0) {
        // Start a new app in the same channel as the raiser
        this.appStartDestinations.set(
          augmentedIntents[0].apps[0].appId,
          raiserChannel,
        )
        return augmentedIntents
      } else if (runningApps === 1) {
        // Raise the existing app
        return augmentedIntents
      }
    }

    // Multiple options - need user to choose
    return this.handleIntentResolverPromise(augmentedIntents, context)
  }

  /**
   * Checks if an app needs to be started (no existing instance)
   */
  private appNeedsStarting(appIntents: AppIntent[]): boolean {
    return (
      appIntents.length === 1 &&
      appIntents[0].apps.length === 1 &&
      appIntents[0].apps[0].instanceId === null
    )
  }

  /**
   * Gets the single app intent from an array (assumes length is 1)
   */
  private getSingleAppIntent(appIntents: AppIntent[]): AppIntent | null {
    return appIntents[0] ?? null
  }

  /**
   * Notifies an app instance about channel changes
   * @param instanceId - The instance ID to notify
   * @param channelId - The new channel ID (null for no channel)
   */
  async notifyUserChannelsChanged(
    instanceId: string,
    channelId: string | null,
  ): Promise<void> {
    console.log("SAIL User channels changed", instanceId, channelId)
    const instance = this.getInstanceDetails(instanceId)

    if (!instance) {
      console.warn(
        `Cannot notify channel change - instance ${instanceId} not found`,
      )
      return
    }

    // Update instance channel
    const updatedInstance: SailData = { ...instance, channel: channelId }
    this.setInstanceDetails(instanceId, updatedInstance)

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

    await this.post(channelChangeEvent, instanceId)
  }

  /**
   * Reloads app directories with new URLs and custom apps
   * @param urls - Array of directory URLs to load
   * @param customApps - Array of custom apps to add
   */
  async reloadAppDirectories(
    urls: string[],
    customApps: DirectoryApp[],
  ): Promise<void> {
    await this.directory.replace(urls)
    customApps.forEach((customApp) => this.directory.add(customApp))
  }

  /**
   * Safely gets channel details from the FDC3 server
   * @returns Array of channel states or empty array if unavailable
   */
  private getChannelDetails(): ChannelState[] {
    try {
      return this.fdc3Server?.handlers[0]?.state ?? []
    } catch (error) {
      console.warn("Failed to access channel details:", error)
      return []
    }
  }

  /**
   * Gets all channels as tab details
   * @returns Array of tab details for all channels
   */
  getTabs(): TabDetail[] {
    return this.getChannelDetails().map((channel) =>
      this.convertToTabDetail(channel),
    )
  }

  /**
   * Filters context history to get only the first occurrence of each context type
   * @param channelId - The channel ID to filter history for
   * @param contextHistory - The complete context history
   * @returns Array of unique context types or undefined if no history
   */
  private getRelevantHistory(
    channelId: string,
    contextHistory?: ContextHistory,
  ): Context[] | undefined {
    if (!contextHistory || !contextHistory[channelId]) {
      return undefined
    }

    const channelHistory = contextHistory[channelId]
    const uniqueContexts = channelHistory.filter(
      (context, index, array) =>
        array.findIndex(
          (otherContext) => otherContext.type === context.type,
        ) === index,
    )

    return uniqueContexts
  }

  /**
   * Updates channel data with new tab details and optional context history
   * @param channelData - Array of tab details to update channels with
   * @param history - Optional context history to preserve
   */
  updateChannelData(channelData: TabDetail[], history?: ContextHistory): void {
    const currentChannelStates = this.getChannelDetails()

    // Clear existing channel state
    currentChannelStates.length = 0

    const newChannelStates = mapChannels(channelData).map((channel) => {
      const existingChannel = currentChannelStates.find(
        (cs) => cs.id === channel.id,
      )
      const contextFromHistory = this.getRelevantHistory(channel.id, history)

      return {
        ...channel,
        context: contextFromHistory ?? existingChannel?.context ?? [],
      }
    })

    currentChannelStates.push(...newChannelStates)
    console.log("SAIL Updated channel data", currentChannelStates)
  }
}
