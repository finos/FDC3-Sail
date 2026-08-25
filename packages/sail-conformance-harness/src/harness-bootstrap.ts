import type { Dispatch, SetStateAction } from "react"
import {
  type AppConnectionMetadata,
  DEFAULT_FDC3_USER_CHANNELS,
  SailDesktopAgent,
  type DirectoryApp,
} from "@finos/sail-desktop-agent"

import { loadConformanceApplications } from "./conformance-app-directory"
import { createHarnessAppLauncher } from "./app-launcher"
import {
  createHarnessInstanceCleanup,
  type HarnessInstanceCleanup,
} from "./harness-instance-lifecycle"
import {
  createHarnessFinOsTeardownObserver,
  installHarnessInboundAppMessageObserver,
} from "./harness-finos-teardown"
import { createOpenWithContextCleanupScheduler } from "./harness-open-with-context-cleanup"
import { pruneStalePendingHostInstances } from "./harness-stale-instance-prune"
import { createHarnessIntentResolver } from "./intent-resolver-wiring"
import { createPopupCloseWatcher, openHarnessPopup } from "./popup-launcher"
import type { HarnessPanel } from "./types"

import { resolveConformanceToolboxProfile } from "./conformance-app-directory"

/** Default harness FDC3 target for the active toolbox profile (hosted → 3.0, local → 2.2). */
export const HARNESS_FDC3_TARGET_VERSION = resolveConformanceToolboxProfile().fdc3Version

export const HARNESS_DEBUG = true

/** Default app the harness mounts when no `?appId=` is given. */
export const DEFAULT_HARNESS_APP_ID = "Conformance1"

export function extractAppUrl(
  apps: DirectoryApp[],
  appId: string = DEFAULT_HARNESS_APP_ID,
): string {
  const app = apps.find(entry => entry.appId === appId)
  const url =
    app?.type === "web" &&
    // oxlint-disable-next-line typescript/no-unnecessary-condition -- unvalidated conformance directory fixture
    app.details &&
    "url" in app.details &&
    typeof app.details.url === "string"
      ? app.details.url
      : undefined

  if (!url) {
    const known = apps.map(entry => entry.appId).join(", ")
    throw new Error(
      `App "${appId}" with web details.url not found in the conformance app directory. Known appIds: ${known}`,
    )
  }

  return url
}

export type HarnessBootstrap = {
  desktopAgent: SailDesktopAgent
  initialPanels: HarnessPanel[]
  onPanelsChange: (setter: Dispatch<SetStateAction<HarnessPanel[]>>) => void
  popupWatcher: ReturnType<typeof createPopupCloseWatcher>
  toolboxProfile: ReturnType<typeof loadConformanceApplications>["profile"]
  toolboxOrigin: string
  fdc3Version: ReturnType<typeof loadConformanceApplications>["fdc3Version"]
}

/**
 * Bootstrap FDC3 desktop agent before React renders so WCP1Hello is handled
 * as soon as the Conformance1 iframe loads.
 */
export function createHarnessBootstrap(options?: {
  debug?: boolean
  /** App to mount on startup. Use `Conformance1Headless` for an unattended run (HEADLESS.md). */
  appId?: string
}): HarnessBootstrap {
  const debug = options?.debug ?? HARNESS_DEBUG
  const {
    applications: conformanceApps,
    fdc3Version,
    profile,
    origin,
  } = loadConformanceApplications()
  const appId = options?.appId ?? DEFAULT_HARNESS_APP_ID
  const conformance1InstanceId = crypto.randomUUID()
  const conformance1Url = extractAppUrl(conformanceApps, appId)

  const initialPanels: HarnessPanel[] = [
    {
      instanceId: conformance1InstanceId,
      appId,
      url: conformance1Url,
      title: "FDC3 Conformance Framework",
      launchMode: "iframe",
    },
  ]

  let setPanels: Dispatch<SetStateAction<HarnessPanel[]>> | null = null

  const removePanel = (instanceId: string) => {
    setPanels?.(current => current.filter(panel => panel.instanceId !== instanceId))
  }

  const instanceCleanup: HarnessInstanceCleanup = {
    prepareLaunchedHostInstance() {},
    closeHarnessBrowsingContext() {
      return false
    },
    disconnectHarnessInstance() {},
  }

  let desktopAgentRef: SailDesktopAgent | null = null

  const finOsTeardownObserver = createHarnessFinOsTeardownObserver({
    instanceCleanup,
    getDesktopAgent: () => desktopAgentRef,
  })

  let openWithContextCleanup!: ReturnType<typeof createOpenWithContextCleanupScheduler>

  const popupWatcher = createPopupCloseWatcher({
    onPopupClosed: instanceId => {
      openWithContextCleanup.cancelOrphanPopupCleanup(instanceId)
      instanceCleanup.disconnectHarnessInstance(instanceId)
    },
  })

  openWithContextCleanup = createOpenWithContextCleanupScheduler({
    instanceCleanup,
    popupWatcher,
    hasAgentInstance: instanceId => Boolean(desktopAgentRef?.apps.getInstance(instanceId)),
  })

  const mountLaunchedPanel = (panel: HarnessPanel) => {
    pruneStalePendingHostInstances({
      desktopAgent: desktopAgentRef!,
      appId: panel.appId,
      popupWatcher,
      keepInstanceId: panel.instanceId,
    })

    instanceCleanup.prepareLaunchedHostInstance(panel)

    if (panel.launchMode === "popup") {
      const popup = openHarnessPopup(panel, {
        onPopupCreated: opened => popupWatcher.registerPopup(panel.instanceId, opened),
      })
      if (!popup) {
        console.error(
          `[ConformanceHarness] Failed to open tab for ${panel.appId} (${panel.instanceId}) — popup blocked?`,
        )
        return
      }

      if (panel.openWithContext) {
        openWithContextCleanup.scheduleOrphanPopupCleanup(panel.instanceId, panel.appId)
      }
    }

    setPanels?.(current => [...current, panel])
  }

  const appLauncher = createHarnessAppLauncher(mountLaunchedPanel, {
    onClose: instanceId => {
      openWithContextCleanup.cancelOrphanPopupCleanup(instanceId)
      instanceCleanup.disconnectHarnessInstance(instanceId)
    },
  })

  const desktopAgent = new SailDesktopAgent({
    apps: conformanceApps,
    appLauncher,
    intentResolver: createHarnessIntentResolver(debug),
    heartbeatEnabled: false,
    userChannels: DEFAULT_FDC3_USER_CHANNELS,
    implementationMetadata: {
      fdc3Version,
    },
    appConnectionOptions: {
      // Sail host UI is wired externally (no injected resolver/selector iframes).
      getIntentResolverUrl: () => false,
      getChannelSelectorUrl: () => false,
      resolveHostIdentifier: source => popupWatcher.findInstanceIdForPopup(source),
    },
    logPayloadDetail: debug ? "full" : "metadata",
    onAppConnected: (metadata: AppConnectionMetadata) => {
      openWithContextCleanup.cancelOrphanPopupCleanup(metadata.instanceId)
      if (metadata.hostIdentifier && metadata.hostIdentifier !== metadata.instanceId) {
        openWithContextCleanup.cancelOrphanPopupCleanup(metadata.hostIdentifier)
      }
      popupWatcher.remapPopupByWindow(metadata.source, metadata.instanceId)
      console.log(
        `[ConformanceHarness] WCP connected: ${metadata.appId} (${metadata.instanceId}) hostIdentifier=${metadata.hostIdentifier ?? "n/a"}`,
      )
    },
    onAppDisconnected: instanceId => {
      openWithContextCleanup.cancelOrphanPopupCleanup(instanceId)
      console.log(`[ConformanceHarness] WCP disconnected: ${instanceId}`)
      instanceCleanup.disconnectHarnessInstance(instanceId)
    },
  })

  desktopAgentRef = desktopAgent

  installHarnessInboundAppMessageObserver(desktopAgent.appConnection, finOsTeardownObserver)

  Object.assign(
    instanceCleanup,
    createHarnessInstanceCleanup({
      desktopAgent,
      popupWatcher,
      removePanel,
    }),
  )

  const disconnectHarnessInstance = instanceCleanup.disconnectHarnessInstance.bind(instanceCleanup)
  instanceCleanup.disconnectHarnessInstance = instanceId => {
    openWithContextCleanup.cancelOrphanPopupCleanup(instanceId)
    disconnectHarnessInstance(instanceId)
  }

  desktopAgent.registerPendingHostInstance({
    appId,
    instanceId: conformance1InstanceId,
  })

  desktopAgent.start()

  const startupMessage = `[ConformanceHarness] Desktop agent started (toolbox: ${profile}, origin: ${origin}, FDC3 target: ${fdc3Version}${debug ? ", debug logging enabled" : ""})`
  console.info(startupMessage)

  return {
    desktopAgent,
    initialPanels,
    onPanelsChange: setter => {
      setPanels = setter
    },
    popupWatcher,
    toolboxProfile: profile,
    toolboxOrigin: origin,
    fdc3Version,
  }
}

export function getConformance1PanelState(
  bootstrap: HarnessBootstrap,
): { instanceId: string; state: "pending" | "connected" } | undefined {
  const panel = bootstrap.initialPanels[0]
  if (!panel) {
    return undefined
  }

  const instance = bootstrap.desktopAgent.apps.getInstance(panel.instanceId)
  if (!instance) {
    return undefined
  }

  return { instanceId: panel.instanceId, state: instance.status }
}
