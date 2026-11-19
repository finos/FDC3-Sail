import {
  ChannelType,
  State,
  type ChannelState,
  type DirectoryApp,
  type WebAppDetails,
} from "@finos/sail-headless-agent"
import {
  createProgrammaticIntentResolver,
  SAIL_FDC3_CHANNELS,
  type IntentResolutionRequest,
  type SailFdc3Channels,
  type SailFdc3SessionHandle,
} from "@finos/sail-extension-fdc3"
import {
  createBrowserSessionHostHooks,
  createPopupCloseWatcher,
  defaultHostWindowRegistry,
  type PopupCloseWatcher,
} from "@finos/sail-platform-browser"
import { isAutoResolve } from "@finos/sail-env"
import type { AppIdentifier, AppMetadata } from "@finos/fdc3-standard-v3"
import type { SailClientStateArgs, TabDetail } from "./client-state"
import { AppHosting } from "./default-app-state"
import { resolveSailForceNewWindow } from "./force-new-window"
import {
  createFdc3SessionAgent,
  getExtensionExport,
  getPlatformCaps,
  loadExtensionCores,
} from "./extensions-runtime"
import { getAppState, getClientState } from "./index"

/**
 * Lifecycle of an app instance as far as the Sail shell is concerned.
 */
export enum AppInstanceState {
  Pending = "pending",
  Connected = "connected",
  Terminated = "terminated",
}

type PendingLaunchIntent = {
  appId: string
  hosting: AppHosting
  instanceTitle: string
}

function sailForceNewWindow(app: Pick<DirectoryApp, "hostManifests">): boolean {
  const sailManifest = app.hostManifests?.sail ?? {}
  if (typeof sailManifest === "string") {
    return resolveSailForceNewWindow(false)
  }
  return resolveSailForceNewWindow(sailManifest.forceNewWindow === true)
}

function resolveLaunchHosting(
  queued: PendingLaunchIntent | undefined,
  app: DirectoryApp,
): AppHosting {
  if (queued) {
    return queued.hosting
  }
  return sailForceNewWindow(app) ? AppHosting.Tab : AppHosting.Frame
}

function openSailAppTab(
  url: string,
  instanceId: string,
  registerWindow: (win: Window, instanceId: string) => void,
  onOpened?: (win: Window) => void,
): Window {
  const win = window.open(url, instanceId)
  if (!win) {
    throw new Error("Failed to open window")
  }

  registerWindow(win, instanceId)
  onOpened?.(win)
  return win
}

export interface ServerState {
  registerDesktopAgent(props: SailClientStateArgs): Promise<void>
  registerAppLaunch(
    appId: string,
    hosting: AppHosting,
    channel: string | null,
    instanceTitle: string,
  ): Promise<string>
  closeAppInstance(instanceId: string): Promise<void>
  registerHostWindow(windowRef: Window, instanceId: string): void
  getInstanceIdForHostWindow(windowRef: Window): string | undefined
  findHostWindow(instanceId: string): Window | undefined
  forgetHostWindow(instanceId: string): void
  openDirectoryApp(appId: string): Promise<string>
  getKnownApps(): DirectoryApp[]
  getApplications(): Promise<DirectoryApp[]>
  getAppInstanceState(instanceId: string): AppInstanceState | undefined
  addStateChangeCallback(cb: () => void): void
  setUserChannel(instanceId: string, channel: string): Promise<void>
  intentChosen(
    requestId: string,
    ai: AppIdentifier | null,
    intent: string | null,
    channel: string | null,
  ): void
  sendClientState(cs: SailClientStateArgs): Promise<void>
}

function tabsToChannelStates(tabs: TabDetail[]): ChannelState[] {
  return tabs.map(c => ({
    id: c.id,
    type: ChannelType.user,
    context: [],
    displayMetadata: {
      name: c.id,
      glyph: c.icon,
      color: c.background,
    },
  }))
}

function activeDirectoryUrls(args: SailClientStateArgs): string[] {
  return args.directories.filter(url => url.startsWith("http://") || url.startsWith("https://"))
}

function channelIdKey(tabs: TabDetail[]): string {
  return JSON.stringify(tabs.map(c => c.id))
}

function toDirectoryApp(app: AppMetadata): DirectoryApp | undefined {
  const candidate = app as Partial<DirectoryApp>
  return candidate.appId && candidate.details ? (candidate as DirectoryApp) : undefined
}

async function fetchDirectoryApps(url: string): Promise<DirectoryApp[]> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`)
  }
  const data: unknown = await res.json()
  const apps = Array.isArray(data)
    ? data
    : (data as { applications?: DirectoryApp[] }).applications
  if (!Array.isArray(apps)) {
    throw new Error(`Invalid AppD at ${url}`)
  }
  return apps as DirectoryApp[]
}

const HOST_APP_SOURCE = "sail-one:host"

export class SailHost implements ServerState {
  private handle: SailFdc3SessionHandle | null = null
  private callbacks: (() => void)[] = []

  private pendingLaunches: PendingLaunchIntent[] = []
  private instanceStates = new Map<string, AppInstanceState>()
  private instanceHosting = new Map<string, AppHosting>()
  private instanceAppIds = new Map<string, string>()

  /** Dynamic apps contributed by this host (custom + fetched directories). */
  private readonly hostSourceApps = new Map<string, DirectoryApp[]>()
  private loadedDirectoryUrls = new Set<string>()
  private lastChannelKey: string | null = null
  private lastCustomAppsKey: string | null = null

  private unsubscribes: (() => void)[] = []
  private popupWatcher: PopupCloseWatcher = createPopupCloseWatcher({
    onPopupClosed: instanceId => {
      void this.handlePopupClosed(instanceId)
    },
  })

  private hostAppsSnapshot(): DirectoryApp[] {
    const byId = new Map<string, DirectoryApp>()
    for (const apps of this.hostSourceApps.values()) {
      for (const app of apps) {
        byId.set(app.appId, app)
      }
    }
    return [...byId.values()]
  }

  addStateChangeCallback(cb: () => void): void {
    this.callbacks.push(cb)
  }

  private notify(): void {
    this.callbacks.forEach(cb => {
      cb()
    })
  }

  async registerDesktopAgent(props: SailClientStateArgs): Promise<void> {
    await this.startAgent(props)
  }

  private async startAgent(props: SailClientStateArgs): Promise<void> {
    await loadExtensionCores()
    const autoResolve = isAutoResolve(import.meta.env.VITE_AUTO_RESOLVE)
    const caps = getPlatformCaps()

    const host = createBrowserSessionHostHooks({
      mountApp: async (request, instanceId) => {
        await this.mountApp(request.appId, instanceId, request.url, request.title)
      },
      unmountApp: async instanceId => {
        await this.closeAppInstance(instanceId)
      },
    })

    const session = caps.sessions.createSession({ host })

    const channelsApi = getExtensionExport<SailFdc3Channels>(SAIL_FDC3_CHANNELS)
    const tabChannels = tabsToChannelStates(props.channels)
    if (channelsApi) {
      await channelsApi.setUserChannels(tabChannels)
    }

    const handle = await createFdc3SessionAgent(session, {
      // Escape hatch when channels export is missing; otherwise catalog is already set.
      ...(channelsApi ? {} : { channels: tabChannels }),
      ...(autoResolve
        ? {
            intentResolver: createProgrammaticIntentResolver({
              log: (message, detail) => {
                console.log(
                  message.replace("[ProgrammaticIntentResolver]", "[SailHost]"),
                  detail ?? "",
                )
              },
            }),
          }
        : {}),
    })
    this.handle = handle
    this.hostSourceApps.clear()
    handle.appContribution.registerSource(HOST_APP_SOURCE, {
      returnApps: () => this.hostAppsSnapshot(),
    })
    this.unsubscribes.push(() => {
      handle.appContribution.unregisterSource(HOST_APP_SOURCE)
      this.hostSourceApps.clear()
    })

    this.unsubscribes.push(
      handle.core.onAppStateChange((instanceId, state) => {
        if (state === State.Connected) {
          this.instanceStates.set(instanceId, AppInstanceState.Connected)
          const panel = getClientState()
            .getPanels()
            .find(p => p.panelId === instanceId)
          if (panel) {
            void this.setUserChannel(instanceId, panel.tabId)
          }
          this.notify()
        } else if (state === State.Terminated) {
          this.instanceStates.set(instanceId, AppInstanceState.Terminated)
          this.notify()
        } else if (state === State.Pending) {
          this.instanceStates.set(instanceId, AppInstanceState.Pending)
          this.notify()
        }
      }),
    )

    if (!autoResolve) {
      this.unsubscribes.push(
        handle.intentResolver.onRequest(request => {
          this.presentIntentResolution(request)
        }),
      )
    }

    this.lastChannelKey = channelIdKey(props.channels)
    this.lastCustomAppsKey = JSON.stringify(props.customApps)
    this.loadedDirectoryUrls = new Set()

    // Seed custom apps into the host contributor cache.
    if (props.customApps.length > 0) {
      this.hostSourceApps.set("custom", props.customApps)
    } else {
      this.hostSourceApps.delete("custom")
    }

    await this.loadDirectories(activeDirectoryUrls(props))
    this.notify()
  }

  private async mountApp(
    appId: string,
    instanceId: string,
    url?: string,
    title?: string,
  ): Promise<void> {
    const fromDir =
      this.handle?.appContribution
        .retrieveAllApps(this.handle.sessionId)
        .find(a => a.appId === appId) ??
      ({
        appId,
        title: title ?? appId,
        type: "web",
        details: { url: url ?? "" },
      } as DirectoryApp)

    const app = toDirectoryApp(fromDir as AppMetadata) ?? fromDir
    const queuedIdx = this.pendingLaunches.findIndex(p => p.appId === app.appId)
    const queued = queuedIdx >= 0 ? this.pendingLaunches.splice(queuedIdx, 1)[0] : undefined

    const hosting = resolveLaunchHosting(queued, app)
    const instanceTitle = queued?.instanceTitle ?? getAppState().createTitle(app)
    const launchUrl = url ?? (app.details as WebAppDetails).url

    this.instanceStates.set(instanceId, AppInstanceState.Pending)
    this.instanceHosting.set(instanceId, hosting)
    this.instanceAppIds.set(instanceId, app.appId)

    if (hosting === AppHosting.Tab) {
      try {
        openSailAppTab(
          launchUrl,
          instanceId,
          (win, id) => {
            this.registerHostWindow(win, id)
          },
          win => {
            this.popupWatcher.registerPopup(instanceId, win)
          },
        )
      } catch (e) {
        this.popupWatcher.unregisterPopup(instanceId)
        this.instanceStates.delete(instanceId)
        this.instanceHosting.delete(instanceId)
        this.instanceAppIds.delete(instanceId)
        throw e
      }
    } else {
      getClientState().newPanel(app, instanceId, instanceTitle)
    }

    this.notify()
  }

  async closeAppInstance(instanceId: string): Promise<void> {
    const hosting =
      this.instanceHosting.get(instanceId) ??
      (getClientState()
        .getPanels()
        .some(p => p.panelId === instanceId)
        ? AppHosting.Frame
        : AppHosting.Tab)

    this.popupWatcher.unregisterPopup(instanceId)

    if (hosting === AppHosting.Frame) {
      await getClientState().removePanel(instanceId)
      this.forgetHostWindow(instanceId)
    } else {
      const win = this.findHostWindow(instanceId)
      this.forgetHostWindow(instanceId)
      if (win && !win.closed) {
        win.close()
      }
    }

    this.instanceStates.set(instanceId, AppInstanceState.Terminated)
    this.instanceHosting.delete(instanceId)
    this.instanceAppIds.delete(instanceId)
    this.notify()
  }

  private async handlePopupClosed(instanceId: string): Promise<void> {
    this.forgetHostWindow(instanceId)
    this.instanceStates.set(instanceId, AppInstanceState.Terminated)
    this.instanceHosting.delete(instanceId)
    this.instanceAppIds.delete(instanceId)
    try {
      await this.handle?.agent.close(instanceId)
    } catch (e) {
      console.warn(`[SailHost] close after popup close failed for ${instanceId}`, e)
    }
    this.notify()
  }

  registerHostWindow(windowRef: Window, instanceId: string): void {
    defaultHostWindowRegistry.registerHostWindow(windowRef, instanceId)
  }

  getInstanceIdForHostWindow(windowRef: Window): string | undefined {
    return defaultHostWindowRegistry.getInstanceIdForWindow(windowRef)
  }

  findHostWindow(instanceId: string): Window | undefined {
    return defaultHostWindowRegistry.getWindowForInstanceId(instanceId)
  }

  forgetHostWindow(instanceId: string): void {
    defaultHostWindowRegistry.unregisterHostWindow(instanceId)
  }

  async openDirectoryApp(appId: string): Promise<string> {
    if (!this.handle) {
      throw new Error("Desktop Agent not registered")
    }
    return this.handle.agent.open(appId)
  }

  getKnownApps(): DirectoryApp[] {
    return this.handle
      ? this.handle.appContribution.retrieveAllApps(this.handle.sessionId)
      : []
  }

  getApplications(): Promise<DirectoryApp[]> {
    if (!this.handle) {
      return Promise.reject(new Error("Desktop Agent not registered"))
    }
    return Promise.resolve(
      this.handle.appContribution.retrieveAllApps(this.handle.sessionId),
    )
  }

  getAppInstanceState(instanceId: string): AppInstanceState | undefined {
    const known = this.instanceStates.get(instanceId)
    if (known) {
      return known
    }
    const details = this.handle?.agent.getInstanceDetails(instanceId)
    if (!details) {
      return undefined
    }
    return details.state === State.Connected
      ? AppInstanceState.Connected
      : AppInstanceState.Pending
  }

  async registerAppLaunch(
    appId: string,
    hosting: AppHosting,
    _channel: string | null,
    instanceTitle: string,
  ): Promise<string> {
    if (!this.handle) {
      throw new Error("Desktop Agent not registered")
    }

    this.pendingLaunches.push({ appId, hosting, instanceTitle })
    try {
      return await this.handle.agent.open(appId)
    } catch (e) {
      const idx = this.pendingLaunches.findIndex(p => p.appId === appId)
      if (idx >= 0) {
        this.pendingLaunches.splice(idx, 1)
      }
      throw e
    }
  }

  async sendClientState(cs: SailClientStateArgs): Promise<void> {
    if (!this.handle) {
      return
    }

    const nextChannelKey = channelIdKey(cs.channels)
    const nextUrls = activeDirectoryUrls(cs)
    const removedDirectory = [...this.loadedDirectoryUrls].some(url => !nextUrls.includes(url))
    const nextCustomAppsKey = JSON.stringify(cs.customApps)
    const customAppsChanged = nextCustomAppsKey !== this.lastCustomAppsKey

    if (nextChannelKey !== this.lastChannelKey || removedDirectory || customAppsChanged) {
      await this.restart(cs)
      return
    }

    const added = nextUrls.filter(url => !this.loadedDirectoryUrls.has(url))
    if (added.length > 0) {
      await this.loadDirectories(added)
      this.notify()
    }
  }

  private async loadDirectories(urls: string[]): Promise<void> {
    if (!this.handle) {
      return
    }
    for (const url of urls) {
      try {
        const apps = await fetchDirectoryApps(url)
        this.hostSourceApps.set(`url:${url}`, apps)
        this.loadedDirectoryUrls.add(url)
      } catch (e) {
        console.error(`Failed to load app directory ${url}`, e)
      }
    }
  }

  private async restart(cs: SailClientStateArgs): Promise<void> {
    this.unsubscribes.forEach(unsubscribe => {
      unsubscribe()
    })
    this.unsubscribes = []
    this.popupWatcher.stop()
    this.popupWatcher = createPopupCloseWatcher({
      onPopupClosed: instanceId => {
        void this.handlePopupClosed(instanceId)
      },
    })
    this.handle?.dispose()
    this.handle = null
    this.instanceStates.clear()
    this.instanceHosting.clear()
    this.instanceAppIds.clear()
    this.pendingLaunches = []
    defaultHostWindowRegistry.clear()

    await this.startAgent(cs)
  }

  async setUserChannel(instanceId: string, channelId: string): Promise<void> {
    if (!this.handle) {
      return
    }

    if (!this.handle.agent.getInstanceDetails(instanceId)) {
      return
    }

    try {
      const channelsApi = getExtensionExport<SailFdc3Channels>(SAIL_FDC3_CHANNELS)
      if (channelsApi) {
        await channelsApi.changeAppChannel(instanceId, channelId)
      } else {
        await this.handle.core.setUserChannel(instanceId, channelId)
      }
    } catch (e) {
      console.error(`Failed to move ${instanceId} to channel ${channelId}`, e)
    }
  }

  private presentIntentResolution(request: IntentResolutionRequest): void {
    const tabs = getClientState().getTabs()
    const channelFor = (instanceId?: string): TabDetail | null => {
      if (!instanceId || !this.handle) {
        return null
      }
      const channelId = this.handle.agent.getCurrentChannel(instanceId)?.id ?? null
      return tabs.find(t => t.id === channelId) ?? null
    }

    const choices = request.choices ?? request.handlers.map(h => ({ intent: h.intent, handler: h }))

    getClientState().setIntentResolution({
      requestId: request.requestId,
      context: request.context,
      appIntents: choices.map(choice => ({
        intent: choice.intent,
        apps: [
          {
            ...choice.handler.app,
            instanceId: choice.handler.instanceId,
            channelData: channelFor(choice.handler.instanceId),
          },
        ],
      })),
    })
  }

  intentChosen(
    requestId: string,
    ai: AppIdentifier | null,
    intent: string | null,
    _channel: string | null,
  ): void {
    if (!this.handle) {
      return
    }

    if (!ai || !intent) {
      this.handle.intentResolver.cancel(requestId)
      return
    }

    const pending = this.handle.intentResolver
      .getPendingRequests()
      .find(r => r.requestId === requestId)
    if (!pending) {
      return
    }

    const choices = pending.choices ?? pending.handlers.map(h => ({ intent: h.intent, handler: h }))
    const chosen = choices.find(
      choice =>
        choice.intent.name === intent &&
        choice.handler.app.appId === ai.appId &&
        (ai.instanceId === undefined || choice.handler.instanceId === ai.instanceId),
    )

    if (!chosen) {
      this.handle.intentResolver.cancel(requestId)
      return
    }

    this.handle.intentResolver.select(requestId, chosen)
  }
}
