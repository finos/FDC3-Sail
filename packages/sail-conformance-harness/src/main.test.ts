/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import * as sailDesktopAgent from "@finos/sail-desktop-agent"
import { SailDesktopAgent } from "@finos/sail-desktop-agent"

import {
  createHarnessBootstrap,
  getConformance1PanelState,
  HARNESS_FDC3_TARGET_VERSION,
} from "./harness-bootstrap"
import { createPopupCloseWatcher } from "./popup-launcher"

describe("createHarnessBootstrap", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("creates DesktopAgent with heartbeat disabled and the harness FDC3 version", () => {
    const OriginalSailDesktopAgent = sailDesktopAgent.SailDesktopAgent
    let capturedOptions: sailDesktopAgent.SailDesktopAgentOptions | undefined
    const constructorSpy = vi
      .spyOn(sailDesktopAgent, "SailDesktopAgent")
      .mockImplementation(function (options) {
        capturedOptions = options
        return new OriginalSailDesktopAgent(options)
      })
    const bootstrap = createHarnessBootstrap({ debug: false })
    try {
      expect(constructorSpy).toHaveBeenCalledOnce()
      expect(capturedOptions?.heartbeatEnabled).toBe(false)
      expect(capturedOptions?.implementationMetadata?.fdc3Version).toBe(HARNESS_FDC3_TARGET_VERSION)
      // Assert against the constructed agent rather than re-running the internal merge.
      expect(bootstrap.desktopAgent.getImplementationMetadata().fdc3Version).toBe(
        HARNESS_FDC3_TARGET_VERSION,
      )
    } finally {
      bootstrap.desktopAgent.stop()
    }
  })

  it("bootstraps a started SailDesktopAgent with Conformance1 pre-registered as pending", () => {
    const bootstrap = createHarnessBootstrap({ debug: false })
    try {
      expect(bootstrap.desktopAgent).toBeInstanceOf(SailDesktopAgent)
      expect(bootstrap.desktopAgent.appConnection.getIsStarted()).toBe(true)
      expect(bootstrap.desktopAgent.apps.getById("Conformance1")).toBeDefined()
      expect(bootstrap.toolboxProfile).toBeDefined()
      expect(bootstrap.fdc3Version).toBe(HARNESS_FDC3_TARGET_VERSION)

      const panelState = getConformance1PanelState(bootstrap)

      expect(panelState).toBeDefined()
      expect(panelState?.state).toBe("pending")

      const instance = bootstrap.desktopAgent.apps.getInstance(panelState!.instanceId)
      expect(instance?.appId).toBe("Conformance1")
      expect(instance?.status).toBe("pending")
    } finally {
      bootstrap.desktopAgent.stop()
    }
  })

  it("logs toolbox profile and FDC3 target on host startup", () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {})
    const bootstrap = createHarnessBootstrap({ debug: false })
    try {
      expect(infoSpy).toHaveBeenCalled()
      const startupLine = infoSpy.mock.calls
        .map(call => String(call[0]))
        .find(line => line.includes("[ConformanceHarness] Desktop agent started"))
      expect(startupLine).toBeDefined()
      expect(startupLine).toContain(`FDC3 target: ${HARNESS_FDC3_TARGET_VERSION}`)
    } finally {
      bootstrap.desktopAgent.stop()
      infoSpy.mockRestore()
    }
  })
})

describe("harness popup disconnect cleanup", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("disconnects agent instance when popup close watcher fires", () => {
    vi.useFakeTimers()

    const disconnectInstance = vi.fn()
    const popup = { closed: false } as Window

    const watcher = createPopupCloseWatcher({
      onPopupClosed: instanceId => {
        disconnectInstance(instanceId)
      },
      pollIntervalMs: 100,
    })

    watcher.registerPopup("popup-instance-1", popup)
    Object.defineProperty(popup, "closed", { value: true, configurable: true })

    vi.advanceTimersByTime(100)

    expect(disconnectInstance).toHaveBeenCalledWith("popup-instance-1")
    watcher.stop()
  })
})
