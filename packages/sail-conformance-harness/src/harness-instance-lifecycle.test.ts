/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { createHarnessInstanceCleanup } from "./harness-instance-lifecycle"
import { createPopupCloseWatcher } from "./popup-launcher"

describe("createHarnessInstanceCleanup", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("pre-registers launched instance as PENDING before browsing context connects", () => {
    const registerPendingHostInstance = vi.fn()
    const desktopAgent = {
      registerPendingHostInstance,
      apps: { getInstance: vi.fn(() => undefined) },
      disconnectInstance: vi.fn(),
    }

    const cleanup = createHarnessInstanceCleanup({
      desktopAgent: desktopAgent as never,
      popupWatcher: createPopupCloseWatcher({ onPopupClosed: vi.fn() }),
      removePanel: vi.fn(),
    })

    cleanup.prepareLaunchedHostInstance({ appId: "MockAppId", instanceId: "mock-instance-1" })

    expect(registerPendingHostInstance).toHaveBeenCalledWith({
      appId: "MockAppId",
      instanceId: "mock-instance-1",
    })
  })

  it("disconnectHarnessInstance closes popup, removes panel, unregisters watcher, and disconnects agent state", () => {
    const removePanel = vi.fn()
    const disconnectInstance = vi.fn()
    const onPopupClosed = vi.fn()

    const popupWatcher = createPopupCloseWatcher({ onPopupClosed })
    let closed = false
    const close = vi.fn(() => {
      closed = true
    })
    const popup = {
      get closed() {
        return closed
      },
      close,
    } as unknown as Window
    popupWatcher.registerPopup("mock-instance-2", popup)

    const cleanup = createHarnessInstanceCleanup({
      desktopAgent: {
        registerPendingHostInstance: vi.fn(),
        apps: {
          getInstance: vi.fn((instanceId: string) =>
            instanceId === "mock-instance-2"
              ? { appId: "MockAppId", instanceId, status: "connected" as const }
              : undefined,
          ),
          getConnections: () => [],
          getInstances: () => [],
          getConnection: () => undefined,
        },
        disconnectInstance,
      } as never,
      popupWatcher,
      removePanel,
    })

    cleanup.disconnectHarnessInstance("mock-instance-2")

    expect(close).toHaveBeenCalledOnce()
    expect(removePanel).toHaveBeenCalledWith("mock-instance-2")
    expect(popupWatcher.hasPopup("mock-instance-2")).toBe(false)
    expect(disconnectInstance).toHaveBeenCalledWith("mock-instance-2")
  })

  it("disconnects agent instance when close lifecycle runs via closeHarnessBrowsingContext", () => {
    const disconnectInstance = vi.fn()
    let closed = false
    const close = vi.fn(() => {
      closed = true
    })
    const popup = {
      get closed() {
        return closed
      },
      close,
    } as unknown as Window

    const popupWatcher = createPopupCloseWatcher({ onPopupClosed: vi.fn() })
    popupWatcher.registerPopup("validated-C", popup)

    const cleanup = createHarnessInstanceCleanup({
      desktopAgent: {
        registerPendingHostInstance: vi.fn(),
        apps: {
          getInstance: vi.fn((instanceId: string) =>
            instanceId === "validated-C"
              ? { appId: "MockAppId", instanceId, status: "connected" as const }
              : undefined,
          ),
          getConnections: () => [{ instanceId: "validated-C", appId: "MockAppId", source: popup }],
          getInstances: () => [],
          getConnection: () => undefined,
        },
        disconnectInstance,
      } as never,
      popupWatcher,
      removePanel: vi.fn(),
    })

    cleanup.disconnectHarnessInstance("validated-C")

    expect(close).toHaveBeenCalledOnce()
    expect(disconnectInstance).toHaveBeenCalledWith("validated-C")
    expect(popupWatcher.hasPopup("validated-C")).toBe(false)
  })

  it("stops polling after disconnectHarnessInstance closes the popup", () => {
    vi.useFakeTimers()

    const onPopupClosed = vi.fn()
    const popupWatcher = createPopupCloseWatcher({ onPopupClosed, pollIntervalMs: 100 })
    let closed = false
    const close = vi.fn(() => {
      closed = true
    })
    const popup = {
      get closed() {
        return closed
      },
      close,
    } as unknown as Window
    popupWatcher.registerPopup("validated-C", popup)

    const cleanup = createHarnessInstanceCleanup({
      desktopAgent: {
        registerPendingHostInstance: vi.fn(),
        apps: {
          getInstance: vi.fn((instanceId: string) =>
            instanceId === "validated-C"
              ? { appId: "MockAppId", instanceId, status: "connected" as const }
              : undefined,
          ),
          getConnections: () => [],
          getInstances: () => [],
          getConnection: () => undefined,
        },
        disconnectInstance: vi.fn(),
      } as never,
      popupWatcher,
      removePanel: vi.fn(),
    })

    cleanup.disconnectHarnessInstance("validated-C")

    Object.defineProperty(popup, "closed", { value: true, configurable: true })
    vi.advanceTimersByTime(300)

    expect(onPopupClosed).not.toHaveBeenCalled()

    popupWatcher.stop()
  })

  it("keeps popup registered when disconnectHarnessInstance cannot close the browsing context", () => {
    const popupWatcher = createPopupCloseWatcher({ onPopupClosed: vi.fn() })
    const popup = { closed: false, close: vi.fn() } as unknown as Window
    popupWatcher.registerPopup("pending-instance", popup)

    const cleanup = createHarnessInstanceCleanup({
      desktopAgent: {
        registerPendingHostInstance: vi.fn(),
        apps: {
          getInstance: vi.fn((instanceId: string) =>
            instanceId === "pending-instance"
              ? { appId: "MockAppId", instanceId, status: "pending" as const }
              : undefined,
          ),
          getConnections: () => [],
          getInstances: () => [
            { appId: "MockAppId", instanceId: "pending-instance", status: "pending" as const },
          ],
          getConnection: () => undefined,
        },
        disconnectInstance: vi.fn(),
      } as never,
      popupWatcher,
      removePanel: vi.fn(),
    })

    cleanup.disconnectHarnessInstance("pending-instance")

    expect(popupWatcher.hasPopup("pending-instance")).toBe(true)

    popupWatcher.stop()
  })
})
