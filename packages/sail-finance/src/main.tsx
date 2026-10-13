import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import {
  createPopupCloseWatcher,
  createProgrammaticIntentResolver,
  SailDesktopAgent,
  type AppLauncher,
} from "@finos/sail-browser-agent"
import {
  isAutoResolve,
  resolveDeepLinkAppId,
  resolveSoleFdc3Directory,
  SAIL_MAX_FDC3_VERSION,
} from "@finos/sail-env"
import type { AppMetadata } from "@finos/fdc3"

import { bootstrapDockviewPopoutShell, isDockviewPopoutShell } from "./utils/dockview-popout"

import "./index.css"
import App from "./App"
import { useWorkspaceStore } from "./stores/workspace-store"
import { ChannelSelectorTestPage } from "./tests/ChannelSelectorTestPage"

const FINOS_APP_DIRECTORY_URL = "https://directory.fdc3.finos.org/v2/apps"

/** Local `@finos/fdc3-example-apps` App Directory (`npm run apps`). */
const EXAMPLE_APPS_DIRECTORY_URL = "http://localhost:4005/static/generated/fdc3-example-apps.json"

const isChannelSelectorE2e =
  new URLSearchParams(window.location.search).get("e2e") === "channel-selector"

type AppMetadataWithManifest = AppMetadata & {
  details?: { url?: string }
  hostManifests?: { sail?: unknown }
}

/** 2.2 conformance mocks set `hostManifests.sail.forceNewWindow` for tab/popup launches. */
function shouldForceNewWindow(appMetadata: AppMetadataWithManifest): boolean {
  const sailManifest = appMetadata.hostManifests?.sail
  return (
    typeof sailManifest === "object" &&
    sailManifest !== null &&
    (sailManifest as { forceNewWindow?: boolean }).forceNewWindow === true
  )
}

function extractAppUrl(appMetadata: AppMetadataWithManifest): string | undefined {
  const details = appMetadata.details
  return details && typeof details.url === "string" ? details.url : undefined
}

if (isDockviewPopoutShell()) {
  bootstrapDockviewPopoutShell()
} else if (isChannelSelectorE2e) {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <ChannelSelectorTestPage />
    </StrictMode>,
  )
} else {
  // Initialize the FDC3 Desktop Agent BEFORE React renders
  // This ensures the agent is listening for WCP1Hello messages when getAgent() is called
  console.log("[Sail] Initializing FDC3 Desktop Agent")

  const soleDirectoryUrl = resolveSoleFdc3Directory({
    search: window.location.search,
    viteDirectoryUrl: import.meta.env.VITE_FDC3_DIRECTORY_URL,
  })
  const autoResolve = isAutoResolve(import.meta.env.VITE_AUTO_RESOLVE)
  const deepLinkAppId = resolveDeepLinkAppId(window.location.search)

  /** Assigned after construction so the popup watcher can disconnect instances. */
  let agent: SailDesktopAgent | null = null
  /** Deep-link / Playwright Conformance1 must stay an iframe on the host page. */
  let forceFrameForNextLaunch = false

  const popupWatcher = createPopupCloseWatcher({
    onPopupClosed: instanceId => {
      console.log(`[Sail] Popup closed for ${instanceId} — disconnecting agent instance`)
      void agent?.disconnectInstance(instanceId).catch((e: unknown) => {
        console.warn(`[Sail] disconnect after popup close failed for ${instanceId}`, e)
      })
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

  const appLauncher: AppLauncher = {
    // eslint-disable-next-line @typescript-eslint/require-await -- async so a throw rejects the returned promise
    launch: async (request, appMetadata: AppMetadata) => {
      const instanceId = request.app.instanceId || crypto.randomUUID()
      const metadata = appMetadata as AppMetadataWithManifest
      const url = extractAppUrl(metadata)
      if (!url) {
        throw new Error(`App ${appMetadata.appId} has no URL in metadata`)
      }

      const preferFrame = forceFrameForNextLaunch
      forceFrameForNextLaunch = false
      const openAsTab = !preferFrame && shouldForceNewWindow(metadata)

      if (openAsTab) {
        // Top-level browsing context so 2.2 mocks can `window.close()` and tear down.
        const win = window.open(url, instanceId)
        if (!win) {
          throw new Error(`Failed to open window for ${appMetadata.appId}`)
        }
        agent?.registerHostWindow(win, instanceId)
        popupWatcher.registerPopup(instanceId, win)
        console.log(`[Sail] Launched app ${appMetadata.appId} as tab ${instanceId}`, { url })
        return { appId: request.app.appId, instanceId }
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

      // Agent registers Pending before launch; shell only mounts the panel/iframe.
      const panel = {
        panelId: instanceId,
        appId: appMetadata.appId,
        title: appMetadata.title || appMetadata.name || appMetadata.appId,
        url,
        icon: appMetadata.icons?.[0]?.src || null,
      }

      workspaceStore.addPanel(activeWorkspaceId, activeTabId, panel)

      console.log(`[Sail] Launched app ${appMetadata.appId} as panel ${instanceId}`, {
        workspaceId: activeWorkspaceId,
        tabId: activeTabId,
        url,
      })
      return { appId: request.app.appId, instanceId }
    },

    close: (instanceId: string) => {
      if (popupWatcher.hasPopup(instanceId)) {
        popupWatcher.closePopupForInstance(instanceId)
        agent?.forgetHostWindow(instanceId)
        console.log(`[Sail] Closed app tab ${instanceId}`)
        return Promise.resolve()
      }

      if (!removePanelIfPresent(instanceId)) {
        console.warn(`[Sail] close: no panel/tab found for instance ${instanceId}`)
      }
      return Promise.resolve()
    },
  }

  agent = new SailDesktopAgent({
    appLauncher,
    appDirectories: soleDirectoryUrl
      ? [soleDirectoryUrl]
      : [FINOS_APP_DIRECTORY_URL, EXAMPLE_APPS_DIRECTORY_URL],
    implementationMetadata: {
      fdc3Version: SAIL_MAX_FDC3_VERSION,
    },
    ...(autoResolve
      ? {
          intentResolver: createProgrammaticIntentResolver({
            log: (message, detail) => {
              console.log(message.replace("[ProgrammaticIntentResolver]", "[Sail]"), detail ?? "")
            },
          }),
        }
      : {}),
  })

  agent.start()

  console.log("[Sail] FDC3 Browser Desktop Agent started and listening for connections", {
    maxFdc3Version: SAIL_MAX_FDC3_VERSION,
    soleDirectoryUrl,
    autoResolve,
  })

  if (deepLinkAppId) {
    // Conformance1 declares forceNewWindow; Playwright scrapes the host-page iframe.
    forceFrameForNextLaunch = true
    void agent.directoriesLoaded
      .then(() => agent.apps.open(deepLinkAppId))
      .then(id => {
        console.log(`[Sail] Deep-linked open ${deepLinkAppId}`, id)
        ;(window as Window & { __sailConformanceReady?: string }).__sailConformanceReady =
          deepLinkAppId
      })
      .catch((err: unknown) => {
        console.error(`[Sail] Deep-link open failed for ${deepLinkAppId}`, err)
        ;(window as Window & { __sailConformanceOpenError?: string }).__sailConformanceOpenError =
          err instanceof Error ? err.message : String(err)
      })
  }

  if (import.meta.env.DEV) {
    // Smoke / local debugging only — call `await __sailAppLauncher.close(instanceId)`.
    ;(window as Window & { __sailAppLauncher?: typeof appLauncher }).__sailAppLauncher = appLauncher
  }

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App agent={agent} />
    </StrictMode>,
  )
}
