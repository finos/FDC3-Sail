import {
  SailDesktopAgent,
  type AppLauncher,
  type DirectoryApp,
  type IntentResolutionRequest,
  type WebAppDetails,
} from "@finos/sail-desktop-agent"
import type { AppIdentifier, AppMetadata, BrowserTypes } from "@finos/fdc3"
import type { SailClientStateArgs, TabDetail } from "./client-state"
import { AppHosting } from "./default-app-state"
import { getAppState, getClientState } from "./index"

/**
 * Lifecycle of an app instance as far as the Sail shell is concerned.
 *
 * The Desktop Agent reports `"pending" | "connected"` for instances it knows about
 * and emits a disconnect event when an instance goes away; `Terminated` is derived
 * from that event rather than read from agent state.
 *
 * `NotResponding` (a missed-heartbeat state in the pre-2.2 host API) has no
 * equivalent on the current agent surface — heartbeat health is not exposed to
 * hosts. The corresponding icon is simply never shown.
 */
export enum AppInstanceState {
  Pending = "pending",
  Connected = "connected",
  Terminated = "terminated",
}

/**
 * A launch the shell initiated itself, waiting to be paired with the instance id
 * minted by the shell's own {@link AppLauncher}.
 *
 * Apps opened by the user (via the app directory) carry an explicit hosting
 * choice; apps opened by another app through `fdc3.open()` have no queued intent
 * and default to {@link AppHosting.Frame}.
 */
type PendingLaunchIntent = {
  appId: string
  hosting: AppHosting
  instanceTitle: string
}

export interface ServerState {
  registerDesktopAgent(props: SailClientStateArgs): Promise<void>
  /**
   * Record the shell's intent to host `appId` a particular way, then ask the
   * Desktop Agent to open it. Resolves with the instance id the agent assigned.
   */
  registerAppLaunch(
    appId: string,
    hosting: AppHosting,
    channel: string | null,
    instanceTitle: string,
  ): Promise<string>
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

/**
 * Sail tabs are user channels. `displayMetadata.glyph` carries the tab icon and
 * `color` the tab background, which is what the FDC3 standard reserves those
 * fields for (api/spec.md, "User Channels").
 */
function tabsToChannels(tabs: TabDetail[]): BrowserTypes.Channel[] {
  return tabs.map(c => ({
    id: c.id,
    type: "user",
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

/** Identity of the channel *set*, ignoring cosmetic glyph/colour edits. */
function channelIdKey(tabs: TabDetail[]): string {
  return JSON.stringify(tabs.map(c => c.id))
}

function toDirectoryApp(app: AppMetadata): DirectoryApp | undefined {
  const candidate = app as Partial<DirectoryApp>
  return candidate.appId && candidate.details ? (candidate as DirectoryApp) : undefined
}

export class SailHost implements ServerState {
  private agent: SailDesktopAgent | null = null
  private callbacks: (() => void)[] = []

  private pendingLaunches: PendingLaunchIntent[] = []
  private instanceStates = new Map<string, AppInstanceState>()

  private loadedDirectoryUrls = new Set<string>()
  private lastChannelKey: string | null = null
  private lastCustomAppsKey: string | null = null

  private unsubscribes: (() => void)[] = []

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
    const agent = new SailDesktopAgent({
      appLauncher: this.createAppLauncher(),
      apps: props.customApps,
      userChannels: tabsToChannels(props.channels),
      onAppConnected: metadata => {
        this.instanceStates.set(metadata.instanceId, AppInstanceState.Connected)
        const panel = getClientState()
          .getPanels()
          .find(p => p.panelId === metadata.instanceId)
        if (panel) {
          void this.setUserChannel(metadata.instanceId, panel.tabId)
        }
        this.notify()
      },
      onAppDisconnected: instanceId => {
        this.instanceStates.set(instanceId, AppInstanceState.Terminated)
        this.notify()
      },
      onHandshakeFailed: error => {
        console.error("WCP handshake failed", error)
      },
    })

    agent.start()
    this.agent = agent

    this.unsubscribes.push(
      agent.channels.onAppChannelChange(() => {
        this.notify()
      }),
      agent.intentResolver.onRequest(request => {
        this.presentIntentResolution(request)
      }),
    )

    this.lastChannelKey = channelIdKey(props.channels)
    this.lastCustomAppsKey = JSON.stringify(props.customApps)
    this.loadedDirectoryUrls = new Set()

    await this.loadDirectories(activeDirectoryUrls(props))
    this.notify()
  }

  /**
   * The shell's own {@link AppLauncher}, mounting apps as panels or breakout windows.
   *
   * Mints the instance id when the agent has not supplied one, so the id the shell
   * renders with is the id WCP4 later adopts.
   */
  private createAppLauncher(): AppLauncher {
    return {
      // eslint-disable-next-line @typescript-eslint/require-await -- async so a throw rejects the returned promise
      launch: async (request, appMetadata) => {
        const instanceId = request.app.instanceId || crypto.randomUUID()
        const app = toDirectoryApp(appMetadata)
        if (!app) {
          throw new Error(`Cannot launch ${appMetadata.appId}: metadata has no directory details`)
        }

        const queuedIdx = this.pendingLaunches.findIndex(p => p.appId === app.appId)
        const queued = queuedIdx >= 0 ? this.pendingLaunches.splice(queuedIdx, 1)[0] : undefined

        const hosting = queued?.hosting ?? AppHosting.Frame
        const instanceTitle = queued?.instanceTitle ?? getAppState().createTitle(app)

        this.instanceStates.set(instanceId, AppInstanceState.Pending)

        if (hosting === AppHosting.Tab) {
          const url = (app.details as WebAppDetails).url
          const win = window.open(url, instanceId)
          if (!win) {
            this.instanceStates.delete(instanceId)
            throw new Error("Failed to open window")
          }
          getAppState().registerAppWindow(win, instanceId)
        } else {
          getClientState().newPanel(app, instanceId, instanceTitle)
        }

        this.notify()
        return { appId: app.appId, instanceId }
      },

      close: (instanceId: string) => {
        void getClientState().removePanel(instanceId)
        this.instanceStates.set(instanceId, AppInstanceState.Terminated)
        this.notify()
        return Promise.resolve()
      },
    }
  }

  getKnownApps(): DirectoryApp[] {
    return this.agent ? this.agent.apps.getAll() : []
  }

  getApplications(): Promise<DirectoryApp[]> {
    if (!this.agent) {
      return Promise.reject(new Error("Desktop Agent not registered"))
    }
    return Promise.resolve(this.agent.apps.getAll())
  }

  getAppInstanceState(instanceId: string): AppInstanceState | undefined {
    const known = this.instanceStates.get(instanceId)
    if (known) {
      return known
    }
    const instance = this.agent?.apps.getInstance(instanceId)
    if (!instance) {
      return undefined
    }
    return instance.status === "connected" ? AppInstanceState.Connected : AppInstanceState.Pending
  }

  async registerAppLaunch(
    appId: string,
    hosting: AppHosting,
    _channel: string | null,
    instanceTitle: string,
  ): Promise<string> {
    if (!this.agent) {
      throw new Error("Desktop Agent not registered")
    }

    this.pendingLaunches.push({ appId, hosting, instanceTitle })
    try {
      const identifier = await this.agent.apps.open(appId)
      if (!identifier.instanceId) {
        throw new Error(`Desktop Agent returned no instance id for ${appId}`)
      }
      return identifier.instanceId
    } catch (e) {
      const idx = this.pendingLaunches.findIndex(p => p.appId === appId)
      if (idx >= 0) {
        this.pendingLaunches.splice(idx, 1)
      }
      throw e
    }
  }

  /**
   * Reconcile agent state with client state after a settings change.
   *
   * Additive changes (new directory URL, new custom app) are applied in place.
   * Structural channel or directory *removals* have no in-place equivalent on the
   * current agent surface, so they force a restart — see the Phase 2 items for
   * `channels.ensureUserChannel` and `apps.setDirectories`.
   */
  async sendClientState(cs: SailClientStateArgs): Promise<void> {
    if (!this.agent) {
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
    if (!this.agent) {
      return
    }
    for (const url of urls) {
      try {
        await this.agent.apps.addDirectory(url)
        this.loadedDirectoryUrls.add(url)
      } catch (e) {
        console.error(`Failed to load app directory ${url}`, e)
      }
    }
  }

  /**
   * Tear down and rebuild the Desktop Agent.
   *
   * Connected apps lose their `MessagePort` and must re-handshake, so this is
   * reserved for changes the agent cannot absorb in place.
   */
  private async restart(cs: SailClientStateArgs): Promise<void> {
    this.unsubscribes.forEach(unsubscribe => {
      unsubscribe()
    })
    this.unsubscribes = []
    this.agent?.stop()
    this.agent = null
    this.instanceStates.clear()
    this.pendingLaunches = []

    await this.startAgent(cs)
  }

  async setUserChannel(instanceId: string, channelId: string): Promise<void> {
    if (!this.agent) {
      return
    }

    // `changeAppChannel` resolves on the agent's `channelChanged` push, so an
    // instance the agent has never seen (a stale panel, an app that never
    // handshook) would leave the caller hanging until the change timeout.
    if (!this.agent.apps.getInstance(instanceId)) {
      return
    }

    try {
      await this.agent.channels.changeAppChannel(instanceId, channelId)
    } catch (e) {
      console.error(`Failed to move ${instanceId} to channel ${channelId}`, e)
    }
  }

  /**
   * Translate a Desktop Agent resolution request into the shell's resolver popup.
   *
   * The agent only calls this when a choice is genuinely needed, so the
   * "single app, single intent" short-circuit the old host did itself is gone.
   */
  private presentIntentResolution(request: IntentResolutionRequest): void {
    const tabs = getClientState().getTabs()
    const channelFor = (instanceId?: string): TabDetail | null => {
      if (!instanceId) {
        return null
      }
      const channelId = this.agent?.channels.getAppChannelId(instanceId) ?? null
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
    if (!this.agent) {
      return
    }

    if (!ai || !intent) {
      this.agent.intentResolver.cancel(requestId)
      return
    }

    const pending = this.agent.intentResolver
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
      this.agent.intentResolver.cancel(requestId)
      return
    }

    this.agent.intentResolver.select(requestId, chosen)
  }
}
