import { describe, expect, it, vi } from "vite-plus/test"

import {
  createHarnessFinOsTeardownObserver,
  installHarnessInboundAppMessageObserver,
  parseConformance1CloseWindowBroadcast,
  parseMockAppControlTeardownBroadcast,
} from "./harness-finos-teardown"
import type { HarnessInstanceCleanup } from "./harness-instance-lifecycle"

describe("parseMockAppControlTeardownBroadcast", () => {
  it("detects mock app-control windowClosed teardown from a mock app", () => {
    expect(
      parseMockAppControlTeardownBroadcast({
        type: "broadcastRequest",
        meta: {
          source: { appId: "ChannelsAppId", instanceId: "mock-instance-1" },
        },
        payload: {
          channelId: "app-control",
          context: { type: "windowClosed" },
        },
      }),
    ).toEqual({ appId: "ChannelsAppId", instanceId: "mock-instance-1" })
  })

  it("ignores Conformance1 teardown broadcasts", () => {
    expect(
      parseMockAppControlTeardownBroadcast({
        type: "broadcastRequest",
        meta: {
          source: { appId: "Conformance1", instanceId: "conformance-1" },
        },
        payload: {
          channelId: "app-control",
          context: { type: "windowClosed" },
        },
      }),
    ).toBeUndefined()
  })

  it("ignores non app-control channels", () => {
    expect(
      parseMockAppControlTeardownBroadcast({
        type: "broadcastRequest",
        meta: {
          source: { appId: "ChannelsAppId", instanceId: "mock-instance-1" },
        },
        payload: {
          channelId: "custom-app-channel",
          context: { type: "windowClosed" },
        },
      }),
    ).toBeUndefined()
  })
})

describe("parseConformance1CloseWindowBroadcast", () => {
  it("detects Conformance1 closeWindow with testId for FINOS closeMockAppWindow", () => {
    expect(
      parseConformance1CloseWindowBroadcast({
        type: "broadcastRequest",
        meta: {
          source: { appId: "Conformance1", instanceId: "conformance-1" },
        },
        payload: {
          channelId: "app-control",
          context: {
            type: "closeWindow",
            testId: "(UCBasicUsage1) Should receive context…",
          },
        },
      }),
    ).toEqual({
      conformance1InstanceId: "conformance-1",
      context: {
        type: "closeWindow",
        testId: "(UCBasicUsage1) Should receive context…",
      },
    })
  })

  it("ignores closeWindow from mock apps", () => {
    expect(
      parseConformance1CloseWindowBroadcast({
        type: "broadcastRequest",
        meta: {
          source: { appId: "ChannelsAppId", instanceId: "mock-1" },
        },
        payload: {
          channelId: "app-control",
          context: { type: "closeWindow", testId: "t1" },
        },
      }),
    ).toBeUndefined()
  })
})

describe("createHarnessFinOsTeardownObserver", () => {
  it("disconnects mock instance after FINOS teardown broadcast (deferred)", () => {
    vi.useFakeTimers()

    const disconnectHarnessInstance = vi.fn()
    const instanceCleanup = {
      disconnectHarnessInstance,
    } as unknown as HarnessInstanceCleanup

    const observer = createHarnessFinOsTeardownObserver({ instanceCleanup })

    observer({
      type: "broadcastRequest",
      meta: {
        source: { appId: "ChannelsAppId", instanceId: "mock-instance-2" },
      },
      payload: {
        channelId: "app-control",
        context: { type: "windowClosed" },
      },
    })

    expect(disconnectHarnessInstance).not.toHaveBeenCalled()

    vi.runAllTimers()

    expect(disconnectHarnessInstance).toHaveBeenCalledWith("mock-instance-2")

    vi.useRealTimers()
  })

  it("relays Conformance1 closeWindow to connected mock instances with testId", () => {
    const sendToAppInstance = vi.fn()
    const disconnectHarnessInstance = vi.fn()
    const instanceCleanup = {
      disconnectHarnessInstance,
    } as unknown as HarnessInstanceCleanup

    const desktopAgent = {
      appConnection: { sendToAppInstance },
      apps: {
        getInstances: () => [
          { instanceId: "conformance-1", appId: "Conformance1", status: "connected" as const },
          { instanceId: "channels-mock", appId: "ChannelsAppId", status: "connected" as const },
          { instanceId: "pending-mock", appId: "ChannelsAppId", status: "pending" as const },
        ],
      },
    }

    const observer = createHarnessFinOsTeardownObserver({
      instanceCleanup,
      getDesktopAgent: () => desktopAgent as never,
    })

    const testId = "(UCFilteredUsage1) Should receive context…"
    observer({
      type: "broadcastRequest",
      meta: {
        source: { appId: "Conformance1", instanceId: "conformance-1" },
      },
      payload: {
        channelId: "app-control",
        context: { type: "closeWindow", testId },
      },
    })

    expect(sendToAppInstance).toHaveBeenCalledOnce()
    expect(sendToAppInstance).toHaveBeenCalledWith(
      "channels-mock",
      expect.objectContaining({
        type: "broadcastEvent",
        payload: expect.objectContaining({
          channelId: "app-control",
          context: { type: "closeWindow", testId },
          originatingApp: { appId: "Conformance1", instanceId: "conformance-1" },
        }),
      }),
    )
    expect(disconnectHarnessInstance).not.toHaveBeenCalled()
  })
})

describe("installHarnessInboundAppMessageObserver", () => {
  it("observes inbound app messages before forwarding to the desktop agent handler", () => {
    let registeredHandler: ((message: unknown) => void | Promise<void>) | undefined
    const appConnection = {
      onAppMessage(handler: (message: unknown) => void | Promise<void>) {
        registeredHandler = handler
      },
    }
    const observer = vi.fn()
    const agentHandler = vi.fn()
    const message = { type: "broadcastRequest" }

    installHarnessInboundAppMessageObserver(appConnection, observer)
    appConnection.onAppMessage(agentHandler)
    void registeredHandler?.(message)

    expect(observer).toHaveBeenCalledWith(message)
    expect(agentHandler).toHaveBeenCalledWith(message)
    expect(observer.mock.invocationCallOrder[0]).toBeLessThan(
      agentHandler.mock.invocationCallOrder[0]!,
    )
  })
})
