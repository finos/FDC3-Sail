import type { HarnessInstanceCleanup } from "./harness-instance-lifecycle"
import type { PopupCloseWatcher } from "./popup-launcher"

export const OPEN_WITH_CONTEXT_ORPHAN_POPUP_MS = 20_000

const HARNESS_LOG_PREFIX = "[ConformanceHarness]"

export type OpenWithContextCleanupScheduler = {
  scheduleOrphanPopupCleanup: (instanceId: string, appId: string) => void
  cancelOrphanPopupCleanup: (instanceId: string) => void
  dispose: () => void
}

/**
 * FINOS open-with-context scenarios that hang leave mock popups open (no `fdc3.close()`
 * / close-context handshake). Stale popups inflate instance cardinality and break WCP
 * host-instance adoption for the next scenario.
 */
export function createOpenWithContextCleanupScheduler(options: {
  instanceCleanup: HarnessInstanceCleanup
  popupWatcher: PopupCloseWatcher
  hasAgentInstance: (instanceId: string) => boolean
  orphanAfterMs?: number
}): OpenWithContextCleanupScheduler {
  const {
    instanceCleanup,
    popupWatcher,
    hasAgentInstance,
    orphanAfterMs = OPEN_WITH_CONTEXT_ORPHAN_POPUP_MS,
  } = options

  const timers = new Map<string, ReturnType<typeof setTimeout>>()

  const cancelOrphanPopupCleanup = (instanceId: string) => {
    const timer = timers.get(instanceId)
    if (timer !== undefined) {
      clearTimeout(timer)
      timers.delete(instanceId)
    }
  }

  const scheduleOrphanPopupCleanup = (instanceId: string, appId: string) => {
    cancelOrphanPopupCleanup(instanceId)

    const timer = setTimeout(() => {
      timers.delete(instanceId)
      const popupStillOpen = popupWatcher.hasPopup(instanceId)
      const instanceStillTracked = hasAgentInstance(instanceId)

      if (!popupStillOpen && !instanceStillTracked) {
        return
      }

      console.warn(
        `${HARNESS_LOG_PREFIX} Orphan popup cleanup after open-with-context (${appId}, ${instanceId}) — popup=${popupStillOpen}, agentInstance=${instanceStillTracked}`,
      )
      instanceCleanup.disconnectHarnessInstance(instanceId)
    }, orphanAfterMs)

    timers.set(instanceId, timer)
  }

  const dispose = () => {
    for (const timer of timers.values()) {
      clearTimeout(timer)
    }
    timers.clear()
  }

  return {
    scheduleOrphanPopupCleanup,
    cancelOrphanPopupCleanup,
    dispose,
  }
}
