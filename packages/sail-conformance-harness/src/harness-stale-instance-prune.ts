import type { SailDesktopAgent } from "@finos/sail-desktop-agent"

import type { PopupCloseWatcher } from "./popup-launcher"

/**
 * Remove orphan PENDING host rows left by incomplete FINOS scenario teardown.
 * Stale pendings break WCP hostIdentifier adoption when multiple PENDING rows exist
 * for the same appId.
 */
export function pruneStalePendingHostInstances(options: {
  desktopAgent: SailDesktopAgent
  appId: string
  popupWatcher: PopupCloseWatcher
  keepInstanceId?: string
}): string[] {
  const { desktopAgent, appId, popupWatcher, keepInstanceId } = options
  const pruned: string[] = []

  for (const instance of desktopAgent.apps.getInstances()) {
    if (instance.appId !== appId || instance.status !== "pending") {
      continue
    }
    if (instance.instanceId === keepInstanceId) {
      continue
    }
    if (popupWatcher.hasPopup(instance.instanceId)) {
      continue
    }

    desktopAgent.disconnectInstance(instance.instanceId)
    pruned.push(instance.instanceId)
  }

  return pruned
}
