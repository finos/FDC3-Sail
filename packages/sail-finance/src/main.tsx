import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { SailDesktopAgent, type AppLauncher } from "@finos/sail-desktop-agent"
import type { AppMetadata } from "@finos/fdc3"

import { loadConformanceApplications } from "../../sail-conformance-harness/src/conformance-app-directory"
import { createHarnessIntentResolver } from "../../sail-conformance-harness/src/intent-resolver-wiring"
import {
  installHarnessInboundAppMessageObserver,
  parseMockAppControlTeardownBroadcast,
} from "../../sail-conformance-harness/src/harness-finos-teardown"
import { bootstrapDockviewPopoutShell, isDockviewPopoutShell } from "./utils/dockview-popout"

import "./index.css"
import App from "./App"
import { useWorkspaceStore } from "./stores/workspace-store"
import { ChannelSelectorTestPage } from "./tests/ChannelSelectorTestPage"

const FINOS_APP_DIRECTORY_URL = "https://directory.fdc3.finos.org/v2/apps"

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

  const conformance = loadConformanceApplications({
    // Same-origin with sail-finance so WCP host-instance adoption works via the /apps proxy.
    localOrigin: window.location.origin,
  })

  // `dev:local` (VITE_CONFORMANCE_TOOLBOX=local) is a FINOS toolbox measurement run, not the
  // product shell: conformance apps only (the public directory inflates findIntent counts), no
  // heartbeat to kill a ~9-minute suite, and no modal resolver waiting on a human.
  const isToolboxRun = conformance.profile === "local"

  const toolboxOverrides = isToolboxRun
    ? {
        heartbeatEnabled: false,
        implementationMetadata: { fdc3Version: conformance.fdc3Version },
        intentResolver: createHarnessIntentResolver(),
        // Teardown rides inside `broadcastRequest` on the `app-control` channel; metadata-only
        // logs hide it. Matches the harness debug profile.
        logPayloadDetail: "full" as const,
      }
    : { appDirectories: [FINOS_APP_DIRECTORY_URL] }

  console.info(
    `[Sail] Conformance toolbox: ${conformance.profile} — FDC3 target ${conformance.fdc3Version} — origin ${conformance.origin}${isToolboxRun ? " — toolbox profile ON (heartbeat off, auto intent resolve, conformance apps only)" : ""}`,
  )

  const agent = new SailDesktopAgent({
    appLauncher,
    apps: [...conformance.applications],
    ...toolboxOverrides,
  })

  if (isToolboxRun) {
    // FINOS mocks answer Conformance1's `closeWindow` with `windowClosed` on `app-control`, then
    // behave as if gone. No DACP message asks the host to destroy the container, so without this
    // the scenario passes while the iframe panel leaks. Must be installed before `start()`.
    installHarnessInboundAppMessageObserver(agent.appConnection, message => {
      // Diagnostic at warn level on purpose: vite forwards warn/error to the dev-server
      // terminal and drops log/info, so this is the only teardown trace visible outside DevTools.
      const record = message as {
        type?: string
        meta?: { source?: { appId?: string; instanceId?: string } }
        payload?: { channelId?: string; context?: { type?: string } }
      }
      // oxlint-disable-next-line typescript/no-unnecessary-condition -- unvalidated DACP wire cast
      if (record?.type === "broadcastRequest" && record.payload?.channelId === "app-control") {
        console.warn(
          `[SailProbe] app-control context=${record.payload.context?.type} from=${record.meta?.source?.appId}/${record.meta?.source?.instanceId}`,
        )
      }

      const teardown = parseMockAppControlTeardownBroadcast(message)
      if (!teardown) {
        return
      }
      // Defer so Conformance1 receives `windowClosed` before the MessagePort is torn down.
      setTimeout(() => {
        console.warn(`[Sail] FINOS teardown: closing ${teardown.appId} (${teardown.instanceId})`)
        void appLauncher.close?.(teardown.instanceId)
      }, 0)
    })
  }

  agent.start()

  console.log("[Sail] FDC3 Browser Desktop Agent started and listening for connections")

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
