/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import {
  createOpenWithContextCleanupScheduler,
  OPEN_WITH_CONTEXT_ORPHAN_POPUP_MS,
} from "./harness-open-with-context-cleanup"

describe("createOpenWithContextCleanupScheduler", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("disconnects orphaned popup instances after the FINOS open-with-context budget", () => {
    vi.useFakeTimers()

    const disconnectHarnessInstance = vi.fn()
    const instanceCleanup = {
      prepareLaunchedHostInstance: vi.fn(),
      closeHarnessBrowsingContext: vi.fn(() => true),
      disconnectHarnessInstance,
    }
    const popupWatcher = {
      hasPopup: vi.fn(() => true),
      registerPopup: vi.fn(),
      unregisterPopup: vi.fn(),
      closePopup: vi.fn(() => true),
      closePopupForInstance: vi.fn(() => true),
      findRegisteredIdsForWindowName: vi.fn(() => []),
      findInstanceIdForPopup: vi.fn(() => undefined),
      remapPopupByWindow: vi.fn(() => true),
      stop: vi.fn(),
    }

    const scheduler = createOpenWithContextCleanupScheduler({
      instanceCleanup,
      popupWatcher,
      hasAgentInstance: () => true,
    })

    scheduler.scheduleOrphanPopupCleanup("mock-instance-1", "MockAppId")
    vi.advanceTimersByTime(OPEN_WITH_CONTEXT_ORPHAN_POPUP_MS)

    expect(disconnectHarnessInstance).toHaveBeenCalledWith("mock-instance-1")
    scheduler.dispose()
  })

  it("cancels scheduled cleanup when the popup is torn down normally", () => {
    vi.useFakeTimers()

    const disconnectHarnessInstance = vi.fn()
    const instanceCleanup = {
      prepareLaunchedHostInstance: vi.fn(),
      closeHarnessBrowsingContext: vi.fn(() => true),
      disconnectHarnessInstance,
    }
    const popupWatcher = {
      hasPopup: vi.fn(() => false),
      registerPopup: vi.fn(),
      unregisterPopup: vi.fn(),
      closePopup: vi.fn(() => true),
      closePopupForInstance: vi.fn(() => true),
      findRegisteredIdsForWindowName: vi.fn(() => []),
      findInstanceIdForPopup: vi.fn(() => undefined),
      remapPopupByWindow: vi.fn(() => true),
      stop: vi.fn(),
    }

    const scheduler = createOpenWithContextCleanupScheduler({
      instanceCleanup,
      popupWatcher,
      hasAgentInstance: () => false,
    })

    scheduler.scheduleOrphanPopupCleanup("mock-instance-1", "MockAppId")
    scheduler.cancelOrphanPopupCleanup("mock-instance-1")
    vi.advanceTimersByTime(OPEN_WITH_CONTEXT_ORPHAN_POPUP_MS)

    expect(disconnectHarnessInstance).not.toHaveBeenCalled()
    scheduler.dispose()
  })
})
