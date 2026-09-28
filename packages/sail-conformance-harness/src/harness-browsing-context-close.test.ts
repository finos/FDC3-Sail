/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { createHarnessAppLauncher } from "./app-launcher"
import {
  broadcastHarnessFinOsCloseContext,
  closeHarnessBrowsingContext,
  collectHarnessCloseInstanceIds,
  relayFinOsCloseWindowToMockApps,
  tryCloseBrowsingContext,
} from "./harness-browsing-context-close"
import { createHarnessInstanceCleanup } from "./harness-instance-lifecycle"
import { createPopupCloseWatcher } from "./popup-launcher"

describe("tryCloseBrowsingContext", () => {
  it("returns true when window is already closed", () => {
    expect(tryCloseBrowsingContext({ closed: true } as Window, "gone")).toBe(true)
  })

  it("returns true when window.close succeeds", () => {
    const popup = { closed: false } as Window
    const close = vi.fn(() => {
      Object.defineProperty(popup, "closed", { value: true, configurable: true })
    })
    Object.assign(popup, { close })

    expect(tryCloseBrowsingContext(popup, "instance-1")).toBe(true)
    expect(close).toHaveBeenCalledOnce()
  })
})

describe("closeHarnessBrowsingContext", () => {
  it("falls back to WCP source window when popup registry misses the instance id", () => {
    const popup = { closed: false } as Window
    const close = vi.fn(() => {
      Object.defineProperty(popup, "closed", { value: true, configurable: true })
    })
    Object.assign(popup, { close })

    const desktopAgent = {
      apps: {
        getConnections: () => [
          {
            instanceId: "validated-id",
            appId: "MockApp",
            source: popup,
          },
        ],
        getInstances: () => [],
        getConnection: () => undefined,
      },
    }

    const watcher = createPopupCloseWatcher({ onPopupClosed: vi.fn() })

    expect(
      closeHarnessBrowsingContext({
        instanceId: "validated-id",
        desktopAgent: desktopAgent as never,
        popupWatcher: watcher,
      }),
    ).toBe(true)

    watcher.stop()
  })

  it("does not close unrelated WCP source windows when targeting a specific instance", () => {
    const conformancePopup = { closed: false } as Window
    const mockPopup = { closed: false } as Window
    const conformanceClose = vi.fn()
    const mockClose = vi.fn(() => {
      Object.defineProperty(mockPopup, "closed", { value: true, configurable: true })
    })
    Object.assign(conformancePopup, { close: conformanceClose })
    Object.assign(mockPopup, { close: mockClose })

    const desktopAgent = {
      apps: {
        getConnections: () => [
          {
            instanceId: "conformance-1",
            appId: "Conformance1",
            source: conformancePopup,
          },
          {
            instanceId: "mock-target",
            appId: "ChannelsAppId",
            source: mockPopup,
          },
        ],
        getInstances: () => [],
        getConnection: () => undefined,
      },
    }

    const watcher = createPopupCloseWatcher({ onPopupClosed: vi.fn() })

    expect(
      closeHarnessBrowsingContext({
        instanceId: "mock-target",
        desktopAgent: desktopAgent as never,
        popupWatcher: watcher,
      }),
    ).toBe(true)

    expect(mockClose).toHaveBeenCalledOnce()
    expect(conformanceClose).not.toHaveBeenCalled()

    watcher.stop()
  })

  it("collects connected instance ids for close attempts", () => {
    const desktopAgent = {
      apps: {
        getConnections: () => [{ instanceId: "launcher-id", appId: "MockApp" }],
        getInstances: () => [{ instanceId: "launcher-id", appId: "MockApp", status: "connected" }],
        getConnection: () => undefined,
      },
    }

    expect(collectHarnessCloseInstanceIds(desktopAgent as never, "launcher-id")).toEqual([
      "launcher-id",
    ])
  })

  it("closes browsing context by window.name when registry key differs from launcher id", () => {
    let closed = false
    const close = vi.fn(() => {
      closed = true
    })
    const popup = {
      name: "launcher-L",
      get closed() {
        return closed
      },
      close,
    } as unknown as Window

    const watcher = createPopupCloseWatcher({ onPopupClosed: vi.fn() })
    watcher.registerPopup("stale-registry-key", popup)

    const desktopAgent = {
      apps: {
        getConnections: () => [],
        getInstances: () => [
          { instanceId: "launcher-L", appId: "MockApp", status: "pending" as const },
        ],
        getConnection: () => undefined,
      },
    }

    expect(
      closeHarnessBrowsingContext({
        instanceId: "launcher-L",
        desktopAgent: desktopAgent as never,
        popupWatcher: watcher,
      }),
    ).toBe(true)
    expect(close).toHaveBeenCalledOnce()

    watcher.stop()
  })

  it("closes browsing context by validated id after popup re-key from launcher id", () => {
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

    const watcher = createPopupCloseWatcher({ onPopupClosed: vi.fn() })
    watcher.registerPopup("launcher-L", popup)
    watcher.remapPopupByWindow(popup, "validated-C")

    const desktopAgent = {
      apps: {
        getConnections: () => [{ instanceId: "validated-C", appId: "MockApp", source: popup }],
        getInstances: () => [],
        getConnection: () => undefined,
      },
    }

    expect(
      closeHarnessBrowsingContext({
        instanceId: "validated-C",
        desktopAgent: desktopAgent as never,
        popupWatcher: watcher,
      }),
    ).toBe(true)
    expect(close).toHaveBeenCalledOnce()
    expect(watcher.closePopup("launcher-L")).toBe(false)

    watcher.stop()
  })

  it("AppLauncher.close succeeds with validated id after WCP5 popup re-key", async () => {
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

    const watcher = createPopupCloseWatcher({ onPopupClosed: vi.fn() })
    watcher.registerPopup("launcher-L", popup)
    watcher.remapPopupByWindow(popup, "validated-C")

    const desktopAgent = {
      apps: {
        getConnections: () => [{ instanceId: "validated-C", appId: "MockApp", source: popup }],
        getInstances: () => [],
        getConnection: () => undefined,
        getInstance: vi.fn(() => undefined),
      },
      registerPendingHostInstance: vi.fn(),
      disconnectInstance: vi.fn(),
    }

    const cleanup = createHarnessInstanceCleanup({
      desktopAgent: desktopAgent as never,
      popupWatcher: watcher,
      removePanel: vi.fn(),
    })

    const launcher = createHarnessAppLauncher(vi.fn(), {
      onClose: instanceId => cleanup.disconnectHarnessInstance(instanceId),
    })

    await launcher.close!("validated-C")

    expect(close).toHaveBeenCalledOnce()
    watcher.stop()
  })
})

describe("broadcastHarnessFinOsCloseContext", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("broadcasts closeWindow on app-control and triggers browsing context teardown", async () => {
    const teardownSpy = vi.fn((_instanceId: string) => true)
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

    const watcher = createPopupCloseWatcher({ onPopupClosed: vi.fn() })
    watcher.registerPopup("mock-instance-C", popup)

    const desktopAgent = {
      apps: {
        getConnections: () => [
          { instanceId: "mock-instance-C", appId: "ChannelsAppId", source: popup },
        ],
        getInstances: () => [
          { instanceId: "mock-instance-C", appId: "ChannelsAppId", status: "connected" as const },
        ],
        getConnection: () => undefined,
        getInstance: vi.fn((instanceId: string) =>
          instanceId === "mock-instance-C"
            ? { appId: "ChannelsAppId", instanceId, status: "connected" as const }
            : undefined,
        ),
      },
      registerPendingHostInstance: vi.fn(),
      disconnectInstance: vi.fn(),
      appConnection: { sendToAppInstance: vi.fn() },
    }

    const cleanup = createHarnessInstanceCleanup({
      desktopAgent: desktopAgent as never,
      popupWatcher: watcher,
      removePanel: vi.fn(),
    })

    await broadcastHarnessFinOsCloseContext({
      desktopAgent: desktopAgent as never,
      conformance1InstanceId: "conformance1-instance",
      targetInstanceId: "mock-instance-C",
      context: { type: "closeWindow", testId: "UCBasicUsage1" },
      onBrowsingContextTeardown: instanceId =>
        cleanup.closeHarnessBrowsingContext(instanceId) && teardownSpy(instanceId),
    })

    expect(desktopAgent.appConnection.sendToAppInstance).toHaveBeenCalledWith(
      "mock-instance-C",
      expect.objectContaining({
        type: "broadcastEvent",
        payload: expect.objectContaining({
          context: { type: "closeWindow", testId: "UCBasicUsage1" },
        }),
      }),
    )
    expect(teardownSpy).toHaveBeenCalledWith("mock-instance-C")
    expect(close).toHaveBeenCalledOnce()

    watcher.stop()
  })
})

describe("relayFinOsCloseWindowToMockApps", () => {
  it("delivers closeWindow with testId to connected mocks only", () => {
    const sendToAppInstance = vi.fn()
    const desktopAgent = {
      appConnection: { sendToAppInstance },
      apps: {
        getInstances: () => [
          { instanceId: "c1", appId: "Conformance1", status: "connected" as const },
          { instanceId: "mock-a", appId: "ChannelsAppId", status: "connected" as const },
          { instanceId: "mock-b", appId: "MockAppId", status: "pending" as const },
        ],
      },
    }

    const delivered = relayFinOsCloseWindowToMockApps({
      desktopAgent: desktopAgent as never,
      conformance1InstanceId: "c1",
      context: { type: "closeWindow", testId: "UCFilteredUsage1" },
    })

    expect(delivered).toEqual(["mock-a"])
    expect(sendToAppInstance).toHaveBeenCalledOnce()
    expect(sendToAppInstance.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        type: "broadcastEvent",
        payload: expect.objectContaining({
          channelId: "app-control",
          context: { type: "closeWindow", testId: "UCFilteredUsage1" },
        }),
      }),
    )
  })
})
