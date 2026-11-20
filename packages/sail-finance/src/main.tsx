import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import {
  NEW_WINDOW,
  type SailApp,
  type SailPlatformCatalog,
  type SailUserSession,
  type SailWebApp,
} from "@finos/sail-platform"
import {
  createBrowserSessionHostHooks,
  createPopupCloseWatcher,
} from "@finos/sail-platform-browser"
import { resolveDeepLinkAppId } from "@finos/sail-env"

import { bootstrapDockviewPopoutShell, isDockviewPopoutShell } from "./utils/dockview-popout"

import "./index.css"
import App from "./App"
import { useWorkspaceStore } from "./stores/workspace-store"
import { getPlatformCaps, loadExtensionUIs, loadRegistry } from "./state/extensions-runtime"

function isWebApp(app: SailApp | undefined): app is SailWebApp {
  return typeof (app as SailWebApp | undefined)?.url === "string"
}

function shouldForceNewWindow(app: SailApp | undefined): boolean {
  return isWebApp(app) && app.location === NEW_WINDOW
}

function catalogAppUrl(app: SailApp | undefined): string | undefined {
  return isWebApp(app) && app.url.length > 0 ? app.url : undefined
}

async function openCatalogApp(
  session: SailUserSession,
  catalog: SailPlatformCatalog,
  appId: string,
): Promise<string> {
  const app = catalog.list().find(entry => entry.appId === appId)
  const url = catalogAppUrl(app)
  if (!url) {
    throw new Error(`App ${appId} has no URL in the platform catalog`)
  }
  return session.openApp({
    appId,
    url,
    title: app?.title ?? appId,
    icon: app?.icon,
  })
}

if (isDockviewPopoutShell()) {
  bootstrapDockviewPopoutShell()
} else {
  console.log("[Sail] Initializing host shell")

  const deepLinkAppId = resolveDeepLinkAppId(window.location.search)

  let session: SailUserSession | null = null
  let catalog: SailPlatformCatalog | null = null
  let forceFrameForNextLaunch = false

  const popupWatcher = createPopupCloseWatcher({
    onPopupClosed: instanceId => {
      console.log(`[Sail] Popup closed for ${instanceId}`)
      session?.unregisterHostWindow(instanceId)
    },
  })

  const removePanelIfPresent = (instanceId: string): boolean => {
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

  void (async () => {
    await loadRegistry()
    const caps = getPlatformCaps()
    catalog = caps.catalog

    const sessionHost = createBrowserSessionHostHooks({
      mountApp: (request, instanceId) => {
        const apps = catalog?.list() ?? []
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
          return Promise.reject(new Error(`App ${request.appId} has no URL`))
        }

        const preferFrame = forceFrameForNextLaunch
        forceFrameForNextLaunch = false
        const openAsTab = !preferFrame && shouldForceNewWindow(app)

        if (openAsTab) {
          const win = window.open(url, instanceId)
          if (!win) {
            return Promise.reject(new Error(`Failed to open window for ${request.appId}`))
          }
          session?.registerHostWindow(win, instanceId)
          popupWatcher.registerPopup(instanceId, win)
          console.log(`[Sail] Launched app ${request.appId} as tab ${instanceId}`, { url })
          return Promise.resolve()
        }

        const workspaceStore = useWorkspaceStore.getState()
        const { activeWorkspaceId } = workspaceStore
        if (!activeWorkspaceId) {
          return Promise.reject(new Error("No active workspace available"))
        }
        const workspace = workspaceStore.getWorkspace(activeWorkspaceId)
        if (!workspace) {
          return Promise.reject(new Error(`Workspace ${activeWorkspaceId} not found`))
        }
        const activeTabId = workspace.layout.activeTabId
        if (!activeTabId) {
          return Promise.reject(new Error(`No active tab in workspace ${activeWorkspaceId}`))
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
        return Promise.resolve()
      },
      unmountApp: instanceId => {
        if (popupWatcher.hasPopup(instanceId)) {
          popupWatcher.closePopupForInstance(instanceId)
          session?.unregisterHostWindow(instanceId)
          console.log(`[Sail] Closed app tab ${instanceId}`)
          return Promise.resolve()
        }
        if (!removePanelIfPresent(instanceId)) {
          console.warn(`[Sail] close: no panel/tab found for instance ${instanceId}`)
        }
        return Promise.resolve()
      },
    })

    session = caps.sessions.createSession({
      host: sessionHost,
    })
    await loadExtensionUIs()

    // Allow async directory contributors a beat to warm the catalog.
    if (catalog.list().length === 0) {
      await new Promise<void>(resolve => setTimeout(resolve, 250))
    }

    console.log("[Sail] Host session ready", {
      catalogApps: catalog.list().length,
    })

    if (deepLinkAppId) {
      forceFrameForNextLaunch = true
      void openCatalogApp(session, catalog, deepLinkAppId)
        .then(id => {
          console.log("[Sail] Deep-linked open %s", deepLinkAppId, id)
          ;(window as Window & { __sailConformanceReady?: string }).__sailConformanceReady =
            deepLinkAppId
        })
        .catch((err: unknown) => {
          console.error("[Sail] Deep-link open failed for %s", deepLinkAppId, err)
          ;(window as Window & { __sailConformanceOpenError?: string }).__sailConformanceOpenError =
            err instanceof Error ? err.message : String(err)
        })
    }

    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <App session={session} catalog={catalog} />
      </StrictMode>,
    )
  })()
}
