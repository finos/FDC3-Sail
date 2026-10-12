import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import {
  createProgrammaticIntentResolver,
  SailDesktopAgent,
  type AppLauncher,
  type DirectoryApp,
} from "@finos/sail-desktop-agent"
import { readSailHostParams } from "@finos/sail-platform"
import type { AppMetadata } from "@finos/fdc3"

import { bootstrapDockviewPopoutShell, isDockviewPopoutShell } from "./utils/dockview-popout"

import "./index.css"
import App from "./App"
import { useWorkspaceStore } from "./stores/workspace-store"
import { ChannelSelectorTestPage } from "./tests/ChannelSelectorTestPage"

function isAppInWorkspace(appId: string): boolean {
  for (const workspace of useWorkspaceStore.getState().workspaces.values()) {
    for (const tab of workspace.layout.tabs.values()) {
      for (const panel of tab.panels.values()) {
        if (panel.appId === appId) {
          return true
        }
      }
    }
  }
  return false
}

/** `hostManifests.sail.forceNewWindow`: the app wants its own browser tab, not a panel. */
function wantsNewWindow(appMetadata: AppMetadata): boolean {
  const sail = (appMetadata as Partial<DirectoryApp>).hostManifests?.sail
  return typeof sail === "object" && (sail as { forceNewWindow?: unknown }).forceNewWindow === true
}

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

  /** Instances launched in their own browser tab rather than a panel. */
  const tabInstanceIds = new Set<string>()

  const appLauncher: AppLauncher = {
    // eslint-disable-next-line @typescript-eslint/require-await -- async so a throw rejects the returned promise
    launch: async (request, appMetadata: AppMetadata) => {
      const instanceId = request.app.instanceId || crypto.randomUUID()
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

      if (wantsNewWindow(appMetadata)) {
        // Named after the instance so WCP can match it; script-opened, so the app can close it.
        const win = window.open(url, instanceId)
        if (!win) {
          throw new Error(`Failed to open a window for ${appMetadata.appId}`)
        }
        agent.hostWindows.register(win, instanceId)
        tabInstanceIds.add(instanceId)
        console.log(`[Sail] Launched app ${appMetadata.appId} in a new window ${instanceId}`)
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
      if (tabInstanceIds.delete(instanceId)) {
        agent.hostWindows.find(instanceId)?.close()
        agent.hostWindows.forget(instanceId)
        return Promise.resolve()
      }
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

  const params = readSailHostParams({
    search: window.location.search,
    viteDirectoryUrl: import.meta.env.VITE_FDC3_DIRECTORY_URL,
    viteAutoResolve: import.meta.env.VITE_AUTO_RESOLVE,
  })

  const agent: SailDesktopAgent = new SailDesktopAgent({
    appLauncher,
    appDirectories: params.appDirectories,
    ...(params.autoResolve
      ? {
          intentResolver: createProgrammaticIntentResolver({
            log: (message, detail) => console.log(`[Sail] ${message}`, detail),
          }),
        }
      : {}),
  })

  agent.start()

  console.log("[Sail] FDC3 Browser Desktop Agent started and listening for connections", params)

  if (params.deepLinkAppId) {
    // `?appId=`: open one app on start-up; the conformance run reads the flags it sets.
    const appId = params.deepLinkAppId
    const flags = window as Window & {
      __sailConformanceReady?: string
      __sailConformanceOpenError?: string
    }
    const openOnce = async () => {
      await agent.directoriesLoaded
      // A reload (e.g. Vite re-optimising deps) restores the saved workspace; don't open twice.
      if (!isAppInWorkspace(appId)) {
        console.log(`[Sail] Deep-linked open ${appId}`, await agent.apps.open(appId))
      }
      flags.__sailConformanceReady = appId
    }
    void openOnce().catch((error: unknown) => {
      console.error(`[Sail] Deep-link open failed for ${appId}`, error)
      flags.__sailConformanceOpenError = error instanceof Error ? error.message : String(error)
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
