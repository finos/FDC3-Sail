import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import {
  createProgrammaticIntentResolver,
  isConformanceAutoResolve,
  resolveConformanceDirectoryUrl,
  resolveConformanceFdc3Version,
  resolveDeepLinkAppId,
  SailDesktopAgent,
  type AppLauncher,
} from "@finos/sail-browser-agent"
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

  const fdc3Version = resolveConformanceFdc3Version(import.meta.env.VITE_FDC3_VERSION)
  const conformanceDirectoryUrl = resolveConformanceDirectoryUrl({
    version: fdc3Version,
    override: import.meta.env.VITE_CONFORMANCE_DIRECTORY_URL,
  })
  const autoResolve = isConformanceAutoResolve(import.meta.env.VITE_CONFORMANCE_AUTO_RESOLVE)

  const appLauncher: AppLauncher = {
    // eslint-disable-next-line @typescript-eslint/require-await -- async so a throw rejects the returned promise
    launch: async (request, appMetadata: AppMetadata) => {
      const instanceId = request.app.instanceId || crypto.randomUUID()
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

      const details =
        "details" in appMetadata ? (appMetadata as { details?: unknown }).details : undefined
      const detailsUrl =
        details && typeof details === "object" && "url" in details
          ? (details as { url?: unknown }).url
          : undefined
      const url = typeof detailsUrl === "string" ? detailsUrl : undefined
      if (!url) {
        throw new Error(`App ${appMetadata.appId} has no URL in metadata`)
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
      const workspaceStore = useWorkspaceStore.getState()
      for (const workspace of workspaceStore.workspaces.values()) {
        for (const [tabId, tab] of workspace.layout.tabs) {
          if (tab.panels.has(instanceId)) {
            workspaceStore.removePanel(workspace.uuid, tabId, instanceId)
            console.log(`[Sail] Closed app panel ${instanceId}`, {
              workspaceId: workspace.uuid,
              tabId,
            })
            return Promise.resolve()
          }
        }
      }
      console.warn(`[Sail] close: no panel found for instance ${instanceId}`)
      return Promise.resolve()
    },
  }

  const agent = new SailDesktopAgent({
    appLauncher,
    appDirectories: [FINOS_APP_DIRECTORY_URL, EXAMPLE_APPS_DIRECTORY_URL, conformanceDirectoryUrl],
    implementationMetadata: {
      fdc3Version,
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
    fdc3Version,
    conformanceDirectoryUrl,
    autoResolve,
  })

  const deepLinkAppId = resolveDeepLinkAppId(window.location.search)
  if (deepLinkAppId) {
    void agent.directoriesLoaded
      .then(() => agent.apps.open(deepLinkAppId))
      .then(id => {
        console.log(`[Sail] Deep-linked open ${deepLinkAppId}`, id)
      })
      .catch((err: unknown) => {
        console.error(`[Sail] Deep-link open failed for ${deepLinkAppId}`, err)
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
