/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from "vite-plus/test"

import { createHarnessInstanceCleanup } from "./harness-instance-lifecycle"
import { pruneStalePendingHostInstances } from "./harness-stale-instance-prune"
import { createPopupCloseWatcher } from "./popup-launcher"

describe("pruneStalePendingHostInstances", () => {
  it("disconnects orphan PENDING rows without a registered popup", () => {
    const disconnectInstance = vi.fn()
    const popupWatcher = createPopupCloseWatcher({ onPopupClosed: vi.fn() })

    const desktopAgent = {
      apps: {
        getInstances: () => [
          { appId: "MockAppId", instanceId: "stale-pending", status: "pending" as const },
          { appId: "MockAppId", instanceId: "active-launch", status: "pending" as const },
        ],
      },
      disconnectInstance,
    }

    popupWatcher.registerPopup("active-launch", { closed: false } as Window)

    const pruned = pruneStalePendingHostInstances({
      desktopAgent: desktopAgent as never,
      appId: "MockAppId",
      popupWatcher,
      keepInstanceId: "active-launch",
    })

    expect(pruned).toEqual(["stale-pending"])
    expect(disconnectInstance).toHaveBeenCalledWith("stale-pending")
    expect(disconnectInstance).not.toHaveBeenCalledWith("active-launch")

    popupWatcher.stop()
  })

  it("does not disconnect when instance cleanup is wired and popup is still open", () => {
    const disconnectInstance = vi.fn()
    const popupWatcher = createPopupCloseWatcher({ onPopupClosed: vi.fn() })
    popupWatcher.registerPopup("active-launch", { closed: false } as Window)

    const desktopAgent = {
      apps: {
        getInstances: () => [
          { appId: "MockAppId", instanceId: "active-launch", status: "pending" as const },
        ],
        getInstance: vi.fn(),
        getConnections: () => [],
      },
      disconnectInstance,
    }

    createHarnessInstanceCleanup({
      desktopAgent: desktopAgent as never,
      popupWatcher,
      removePanel: vi.fn(),
    })

    const pruned = pruneStalePendingHostInstances({
      desktopAgent: desktopAgent as never,
      appId: "MockAppId",
      popupWatcher,
      keepInstanceId: "active-launch",
    })

    expect(pruned).toEqual([])
    expect(disconnectInstance).not.toHaveBeenCalled()

    popupWatcher.stop()
  })
})
