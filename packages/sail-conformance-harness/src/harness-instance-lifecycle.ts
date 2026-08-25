import type { SailDesktopAgent } from "@finos/sail-desktop-agent"

import { closeHarnessBrowsingContext } from "./harness-browsing-context-close"
import type { PopupCloseWatcher } from "./popup-launcher"
import type { HarnessPanel } from "./types"

export type HarnessInstanceCleanup = {
  prepareLaunchedHostInstance: (panel: Pick<HarnessPanel, "appId" | "instanceId">) => void
  closeHarnessBrowsingContext: (instanceId: string) => boolean
  disconnectHarnessInstance: (instanceId: string) => void
}

/**
 * Host-side instance lifecycle for FINOS toolbox runs: pre-register launcher ids
 * before browsing context load (same contract as Conformance1 iframe) and tear
 * down agent state when popups close or WCP disconnects.
 */
export function createHarnessInstanceCleanup(options: {
  desktopAgent: SailDesktopAgent
  popupWatcher: PopupCloseWatcher
  removePanel: (instanceId: string) => void
}): HarnessInstanceCleanup {
  const { desktopAgent, popupWatcher, removePanel } = options

  const prepareLaunchedHostInstance = (panel: Pick<HarnessPanel, "appId" | "instanceId">) => {
    desktopAgent.registerPendingHostInstance({
      appId: panel.appId,
      instanceId: panel.instanceId,
    })
  }

  const closeHarnessBrowsingContextForInstance = (instanceId: string) =>
    closeHarnessBrowsingContext({
      instanceId,
      desktopAgent,
      popupWatcher,
    })

  const disconnectHarnessInstance = (instanceId: string) => {
    const closed = closeHarnessBrowsingContextForInstance(instanceId)

    if (closed) {
      for (const registeredId of popupWatcher.findRegisteredIdsForWindowName(instanceId)) {
        popupWatcher.unregisterPopup(registeredId)
      }
      popupWatcher.unregisterPopup(instanceId)
    }

    removePanel(instanceId)
    if (desktopAgent.apps.getInstance(instanceId)) {
      desktopAgent.disconnectInstance(instanceId)
    }
  }

  return {
    prepareLaunchedHostInstance,
    closeHarnessBrowsingContext: closeHarnessBrowsingContextForInstance,
    disconnectHarnessInstance,
  }
}
