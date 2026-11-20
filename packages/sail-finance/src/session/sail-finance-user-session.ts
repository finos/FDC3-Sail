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
import { useWorkspaceStore } from "../stores/workspace-store"

function isWebApp(app: SailApp | undefined): app is SailWebApp {
  return typeof (app as SailWebApp | undefined)?.url === "string"
}

function shouldForceNewWindow(app: SailApp | undefined): boolean {
  return isWebApp(app) && app.location === NEW_WINDOW
}

function catalogAppUrl(app: SailApp | undefined): string | undefined {
  return isWebApp(app) && app.url.length > 0 ? app.url : undefined
}

export type SailFinanceUserSessionOptions = {
  catalog: SailPlatformCatalog
  popupWatcher: PopupCloseWatcher
  createAppInstanceId?: () => AppInstanceId
}

/**
 * sail-finance session: owns open/close mounting (Dockview panel vs popup)
 * and rehydrates apps from the workspace store on load.
 */
export class SailFinanceUserSession implements SailUserSession {
  private readonly catalog: SailPlatformCatalog
  private readonly popupWatcher: PopupCloseWatcher
  private readonly createAppInstanceId: () => AppInstanceId

  private readonly apps = new Map<AppInstanceId, SailAppInstance>()
  private readonly listeners = new Set<() => void>()
  private readonly windowsByInstance = new Map<AppInstanceId, WeakRef<Window>>()
  private readonly instanceByWindow = new WeakMap<Window, AppInstanceId>()

  private snapshot: SailUserSessionSnapshot = { apps: [] }
  private forceFrameForNextLaunch = false

  constructor(options: SailFinanceUserSessionOptions) {
    this.catalog = options.catalog
    this.popupWatcher = options.popupWatcher
    this.createAppInstanceId = options.createAppInstanceId ?? (() => crypto.randomUUID())
  }

  /** Register persisted workspace panels as session apps. */
  load(): void {
    this.apps.clear()
    const workspaceStore = useWorkspaceStore.getState()
    for (const workspace of workspaceStore.workspaces.values()) {
      for (const tab of workspace.layout.tabs.values()) {
        for (const panel of tab.panels.values()) {
          this.apps.set(panel.panelId, {
            instanceId: panel.panelId,
            appId: panel.appId,
            placement: {
              url: panel.url,
              title: panel.title,
              icon: panel.icon ?? undefined,
              workspaceId: workspace.uuid,
              tabId: tab.tabId,
            },
          })
        }
      }
    }
    this.emit()
  }

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
      this.removePanelIfPresent(instanceId)
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

  private removePanelIfPresent(instanceId: string): boolean {
    const workspaceStore = useWorkspaceStore.getState()
    for (const workspace of workspaceStore.workspaces.values()) {
      for (const [tabId, tab] of workspace.layout.tabs) {
        if (tab.panels.has(instanceId)) {
          workspaceStore.removePanel(workspace.uuid, tabId, instanceId)
          console.log(`[Sail] Closed app panel ${instanceId}`, {
            workspaceId: workspace.uuid,
            tabId,
          })
          return true
        }
      }
    }
    return false
  }

  private async mountApp(request: SailOpenAppRequest, instanceId: AppInstanceId): Promise<void> {
    const apps = this.catalog.list()
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
    const openAsTab = !preferFrame && shouldForceNewWindow(app)

    if (openAsTab) {
      const win = window.open(url, instanceId)
      if (!win) {
        throw new Error(`Failed to open window for ${request.appId}`)
      }
      this.registerHostWindow(win, instanceId)
      this.popupWatcher.registerPopup(instanceId, win)
      console.log(`[Sail] Launched app ${request.appId} as tab ${instanceId}`, { url })
      return
    }

    const workspaceStore = useWorkspaceStore.getState()
    const { activeWorkspaceId } = workspaceStore
    if (!activeWorkspaceId) {
      throw new Error("No active workspace available")
    }
    const workspace = workspaceStore.getWorkspace(activeWorkspaceId)
    if (!workspace) {
      throw new Error(`Workspace ${activeWorkspaceId} not found`)
    }
    const activeTabId = workspace.layout.activeTabId
    if (!activeTabId) {
      throw new Error(`No active tab in workspace ${activeWorkspaceId}`)
    }

    workspaceStore.addPanel(activeWorkspaceId, activeTabId, {
      panelId: instanceId,
      appId: app.appId,
      title: app.title || app.appId,
      url,
      icon: app.icon || null,
    })

    console.log(`[Sail] Launched app ${app.appId} as panel ${instanceId}`, {
      workspaceId: activeWorkspaceId,
      tabId: activeTabId,
      url,
    })
  }

  private async unmountApp(instanceId: AppInstanceId): Promise<void> {
    if (this.popupWatcher.hasPopup(instanceId)) {
      this.popupWatcher.closePopupForInstance(instanceId)
      this.unregisterHostWindow(instanceId)
      console.log(`[Sail] Closed app tab ${instanceId}`)
      return
    }
    if (!this.removePanelIfPresent(instanceId)) {
      console.warn(`[Sail] close: no panel/tab found for instance ${instanceId}`)
    }
  }
}
