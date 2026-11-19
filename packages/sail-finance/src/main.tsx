import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { createProgrammaticIntentResolver } from "@finos/sail-extension-fdc3"
import type { DirectoryApp as HeadlessDirectoryApp } from "@finos/sail-headless-agent"
import {
  createBrowserSessionHostHooks,
  createPopupCloseWatcher,
  defaultHostWindowRegistry,
} from "@finos/sail-platform-browser"
import {
  isAutoResolve,
  resolveDeepLinkAppId,
  SAIL_MAX_FDC3_VERSION,
} from "@finos/sail-env"

import { bootstrapDockviewPopoutShell, isDockviewPopoutShell } from "./utils/dockview-popout"

import "./index.css"
import App from "./App"
import { useWorkspaceStore } from "./stores/workspace-store"
import { ChannelSelectorTestPage } from "./tests/ChannelSelectorTestPage"
import {
  createFdc3SessionAgent,
  getPlatformCaps,
  loadExtensionUIs,
  loadRegistry,
} from "./state/extensions-runtime"
import { createSailHostAgent, type SailHostAgent } from "./agent/sail-host-agent"

const FINOS_APP_DIRECTORY_URL = "https://directory.fdc3.finos.org/v2/apps"
const EXAMPLE_APPS_DIRECTORY_URL = "http://localhost:4005/static/generated/fdc3-example-apps.json"

const isChannelSelectorE2e =
  new URLSearchParams(window.location.search).get("e2e") === "channel-selector"

function shouldForceNewWindow(app: HeadlessDirectoryApp): boolean {
  const sailManifest = app.hostManifests?.sail
  return (
    typeof sailManifest === "object" &&
    sailManifest !== null &&
    (sailManifest as { forceNewWindow?: boolean }).forceNewWindow === true
  )
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
  console.log("[Sail] Initializing FDC3 Desktop Agent")

  const autoResolve = isAutoResolve(import.meta.env.VITE_AUTO_RESOLVE)
  const deepLinkAppId = resolveDeepLinkAppId(window.location.search)

  let agent: SailHostAgent | null = null
  let forceFrameForNextLaunch = false

  const popupWatcher = createPopupCloseWatcher({
    onPopupClosed: instanceId => {
      console.log(`[Sail] Popup closed for ${instanceId}`)
      agent?.forgetHostWindow(instanceId)
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

    const host = createBrowserSessionHostHooks({
      mountApp: async (request, instanceId) => {
        const apps = agent?.apps.getAll() ?? []
        const app =
          apps.find(a => a.appId === request.appId) ??
          ({
            appId: request.appId,
            title: request.title ?? request.appId,
            type: "web",
            details: { url: request.url ?? "" },
          } as HeadlessDirectoryApp)

        const url = request.url ?? (app.details as { url?: string }).url
        if (!url) {
          throw new Error(`App ${request.appId} has no URL`)
        }

        const preferFrame = forceFrameForNextLaunch
        forceFrameForNextLaunch = false
        const openAsTab = !preferFrame && shouldForceNewWindow(app)

        if (openAsTab) {
          const win = window.open(url, instanceId)
          if (!win) {
            throw new Error(`Failed to open window for ${request.appId}`)
          }
          defaultHostWindowRegistry.registerHostWindow(win, instanceId)
          popupWatcher.registerPopup(instanceId, win)
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
          icon: app.icons?.[0]?.src || null,
        })

        console.log(`[Sail] Launched app ${app.appId} as panel ${instanceId}`, {
          workspaceId: activeWorkspaceId,
          tabId: activeTabId,
          url,
        })
      },
      unmountApp: async instanceId => {
        if (popupWatcher.hasPopup(instanceId)) {
          popupWatcher.closePopupForInstance(instanceId)
          defaultHostWindowRegistry.unregisterHostWindow(instanceId)
          console.log(`[Sail] Closed app tab ${instanceId}`)
          return
        }
        if (!removePanelIfPresent(instanceId)) {
          console.warn(`[Sail] close: no panel/tab found for instance ${instanceId}`)
        }
      },
    })

    const session = caps.sessions.createSession({ host })
    const handle = await createFdc3SessionAgent(session, {
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

    agent = createSailHostAgent(handle)
    await loadExtensionUIs()

    if (agent.apps.getAll().length === 0) {
      await agent.apps.addDirectory(FINOS_APP_DIRECTORY_URL)
      await agent.apps.addDirectory(EXAMPLE_APPS_DIRECTORY_URL)
    }

    console.log("[Sail] FDC3 Browser Desktop Agent started and listening for connections", {
      maxFdc3Version: SAIL_MAX_FDC3_VERSION,
      autoResolve,
    })

    if (deepLinkAppId) {
      forceFrameForNextLaunch = true
      void agent.apps
        .open(deepLinkAppId)
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
        <App agent={agent} />
      </StrictMode>,
    )
  })()
}
