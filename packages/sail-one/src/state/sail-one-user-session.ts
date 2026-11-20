import {
  NEW_WINDOW,
  type AppInstanceId,
  type SailApp,
  type SailAppInstance,
  type SailOpenAppRequest,
  type SailPlatformCatalog,
  type SailUserSession,
  type SailUserSessionSnapshot,
  type SailWebApp,
} from "@finos/sail-platform"
import type { PopupCloseWatcher } from "@finos/sail-platform-browser"
import { AppHosting, type PendingHosting } from "./app-hosting"
import { PlatformClientState, type ClientState } from "./client-state"

function isWebApp(app: SailApp | undefined): app is SailWebApp {
  return typeof (app as SailWebApp | undefined)?.url === "string"
}

function catalogAppUrl(app: SailApp | undefined): string | undefined {
  return isWebApp(app) && app.url.length > 0 ? app.url : undefined
}

export type SailOneUserSessionOptions = {
  catalog: SailPlatformCatalog
  popupWatcher: PopupCloseWatcher
  createAppInstanceId?: () => AppInstanceId
  /** Optional ClientState storage backend (tests). */
  clientState?: PlatformClientState
}

/**
 * sail-one session: owns panel/tab persistence ({@link ClientState}) and
 * open/close mounting (GridStack panel vs popup).
 */
export class SailOneUserSession implements SailUserSession {
  private readonly catalog: SailPlatformCatalog
  private readonly popupWatcher: PopupCloseWatcher
  private readonly createAppInstanceId: () => AppInstanceId
  private readonly client: PlatformClientState

  private readonly apps = new Map<AppInstanceId, SailAppInstance>()
  private readonly listeners = new Set<() => void>()
  private readonly windowsByInstance = new Map<AppInstanceId, WeakRef<Window>>()
  private readonly instanceByWindow = new WeakMap<Window, AppInstanceId>()

  private snapshot: SailUserSessionSnapshot = { apps: [] }
  private pending: Array<{ appId: string; hosting: AppHosting; instanceTitle: string }> = []
  private forceFrameForNextLaunch = false

  constructor(options: SailOneUserSessionOptions) {
    this.catalog = options.catalog
    this.popupWatcher = options.popupWatcher
    this.createAppInstanceId = options.createAppInstanceId ?? (() => crypto.randomUUID())
    this.client = options.clientState ?? new PlatformClientState()
  }

  /** Shell chrome (tabs/panels) — same object the UI already reads via getClientState(). */
  get clientState(): ClientState {
    return this.client
  }

  /** Hydrate layout from storage and register restored panels as session apps. */
  async load(): Promise<void> {
    await this.client.load()
    this.apps.clear()
    for (const panel of this.client.getPanels()) {
      this.apps.set(panel.panelId, {
        instanceId: panel.panelId,
        appId: panel.appId,
        placement: {
          url: panel.url,
          title: panel.title,
          icon: panel.icon ?? undefined,
          tabId: panel.tabId,
        },
      })
    }
    this.emit()
  }

  /** Queue hosting choice for the next matching {@link openApp} (Frame vs Tab). */
  queueHosting(appId: string, hosting: AppHosting, instanceTitle: string): void {
    this.pending.push({ appId, hosting, instanceTitle })
  }

  takePendingHosting(appId: string): PendingHosting | undefined {
    const idx = this.pending.findIndex(p => p.appId === appId)
    if (idx < 0) {
      return undefined
    }
    const launch = this.pending.splice(idx, 1)[0]
    return launch
      ? { hosting: launch.hosting, instanceTitle: launch.instanceTitle }
      : undefined
  }

  /** Force the next open into a docked panel (e.g. deep-link / conformance). */
  forceNextOpenAsFrame(): void {
    this.forceFrameForNextLaunch = true
  }

  getSnapshot(): SailUserSessionSnapshot {
    return this.snapshot
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  async openApp(request: SailOpenAppRequest): Promise<AppInstanceId> {
    const instanceId = this.createAppInstanceId()
    const app: SailAppInstance = {
      instanceId,
      appId: request.appId,
      placement: {
        ...(request.placement ?? {}),
        ...(request.url ? { url: request.url } : {}),
        ...(request.title ? { title: request.title } : {}),
        ...(request.icon ? { icon: request.icon } : {}),
      },
    }
    this.apps.set(instanceId, app)
    this.emit()
    try {
      await this.mountApp(request, instanceId)
    } catch (err) {
      this.apps.delete(instanceId)
      this.emit()
      throw err
    }
    return instanceId
  }

  async closeApp(instanceId: AppInstanceId): Promise<void> {
    const app = this.apps.get(instanceId)
    if (!app) {
      // Still drop chrome if present (defensive).
      if (this.client.getPanels().some(p => p.panelId === instanceId)) {
        await this.client.removePanel(instanceId)
      }
      this.forgetWindow(instanceId)
      return
    }
    await this.unmountApp(instanceId)
    this.apps.delete(instanceId)
    this.forgetWindow(instanceId)
    this.emit()
  }

  registerHostWindow(windowRef: Window, instanceId: AppInstanceId): void {
    this.windowsByInstance.set(instanceId, new WeakRef(windowRef))
    this.instanceByWindow.set(windowRef, instanceId)
  }

  unregisterHostWindow(instanceId: AppInstanceId): void {
    this.forgetWindow(instanceId)
  }

  getInstanceIdForHostWindow(windowRef: Window): AppInstanceId | undefined {
    return this.instanceByWindow.get(windowRef)
  }

  getHostWindow(instanceId: AppInstanceId): Window | undefined {
    return this.windowsByInstance.get(instanceId)?.deref()
  }

  private forgetWindow(instanceId: AppInstanceId): void {
    const ref = this.windowsByInstance.get(instanceId)
    this.windowsByInstance.delete(instanceId)
    const win = ref?.deref()
    if (win) {
      this.instanceByWindow.delete(win)
    }
  }

  private emit(): void {
    this.snapshot = { apps: [...this.apps.values()] }
    for (const listener of [...this.listeners]) {
      listener()
    }
  }

  private async mountApp(request: SailOpenAppRequest, instanceId: AppInstanceId): Promise<void> {
    const apps = await this.catalog.list()
    const app =
      apps.find(a => a.appId === request.appId) ??
      (request.url
        ? ({
            appId: request.appId,
            title: request.title ?? request.appId,
            icon: request.icon,
            url: request.url,
          } satisfies SailWebApp)
        : ({
            appId: request.appId,
            title: request.title ?? request.appId,
            icon: request.icon,
          } satisfies SailApp))

    const url = request.url ?? catalogAppUrl(app)
    if (!url) {
      throw new Error(`App ${request.appId} has no URL`)
    }

    const preferFrame = this.forceFrameForNextLaunch
    this.forceFrameForNextLaunch = false
    const pending = this.takePendingHosting(request.appId)
    const openAsTab =
      !preferFrame &&
      (pending?.hosting === AppHosting.Tab ||
        (pending == null && isWebApp(app) && app.location === NEW_WINDOW))

    if (openAsTab) {
      const win = window.open(url, instanceId)
      if (!win) {
        throw new Error(`Failed to open window for ${request.appId}`)
      }
      this.registerHostWindow(win, instanceId)
      this.popupWatcher.registerPopup(instanceId, win)
      return
    }

    const detail: SailWebApp = isWebApp(app) ? app : { ...app, url }
    const title = pending?.instanceTitle ?? this.createTitle(detail)
    this.client.newPanel(detail, instanceId, title)
  }

  private async unmountApp(instanceId: AppInstanceId): Promise<void> {
    if (this.popupWatcher.hasPopup(instanceId)) {
      this.popupWatcher.closePopupForInstance(instanceId)
      this.unregisterHostWindow(instanceId)
      return
    }
    await this.client.removePanel(instanceId)
    this.unregisterHostWindow(instanceId)
  }

  private createTitle(detail: SailApp): string {
    const existingPanels = this.client.getPanels()
    const usedNumbers = new Set(
      existingPanels
        .filter(p => p.title.startsWith(detail.title))
        .map(p => {
          const match = /\d+$/.exec(p.title)
          return match ? parseInt(match[0]) : 0
        }),
    )
    let number = 1
    while (usedNumbers.has(number)) {
      number++
    }
    return `${detail.title} ${number.toString()}`
  }
}
