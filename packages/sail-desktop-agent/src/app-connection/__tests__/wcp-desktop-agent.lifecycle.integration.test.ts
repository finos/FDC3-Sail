/**
 * WCP Option A instance lifecycle integration tests.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, afterEach, vi } from "vite-plus/test"
import type { BrowserTypes } from "@finos/fdc3"
import type { SailDesktopAgent } from "../../agent/sail-desktop-agent"
import { AppInstanceState } from "../../state/types"
import {
  clearAllHeartbeatTimersForTesting,
  getActiveHeartbeatTimerCount,
} from "../../handlers/heartbeat/runtime"
import {
  connectWcpApp,
  createMessageEvent,
  createOpenRequestMessage,
  createWCP1Hello,
  flushAsyncDelivery,
  postDacpOnPort,
  waitForPortMessage,
} from "./wcp-edge-test-helpers"
import {
  CHART_APP,
  createHostInstanceAppLauncher,
  createTestAgent,
  HOST_LAUNCHER_INSTANCE_ID,
  PORTFOLIO_APP,
} from "./wcp-desktop-agent.integration.fixtures"

describe("Option A instance lifecycle (WCP path)", () => {
  const activeAgents: SailDesktopAgent[] = []

  afterEach(() => {
    clearAllHeartbeatTimersForTesting()
    for (const agent of activeAgents.splice(0)) {
      agent.stop()
    }
  })

  it("marks instance connected after WCP5 success without manual state updates", async () => {
    const agent = createTestAgent()
    activeAgents.push(agent)

    const connected = await connectWcpApp(agent, {
      connectionAttemptUuid: "lifecycle-wcp5-connected-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    expect(agent.getState().instances[connected.validatedInstanceId]?.appId).toBe("portfolioApp")
    expect(agent.getState().instances[connected.validatedInstanceId]?.state).toBe(
      AppInstanceState.CONNECTED,
    )
  })

  it("keeps host pre-registered instance pending until WCP5 succeeds", async () => {
    const agent = createTestAgent({ appLauncher: createHostInstanceAppLauncher() })
    activeAgents.push(agent)

    const source = await connectWcpApp(agent, {
      connectionAttemptUuid: "lifecycle-pending-source-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    await postDacpOnPort(
      source.appPort,
      createOpenRequestMessage(source.validatedInstanceId, source.appId, CHART_APP.appId),
    )
    await flushAsyncDelivery()

    await vi.waitFor(() => {
      const preWcp5 = agent.getState().instances[HOST_LAUNCHER_INSTANCE_ID]
      expect(preWcp5?.appId).toBe(CHART_APP.appId)
      expect(preWcp5?.state).toBe(AppInstanceState.PENDING)
    })

    const chart = await connectWcpApp(agent, {
      connectionAttemptUuid: "lifecycle-pending-target-uuid",
      appId: "chartApp",
      identityUrl: CHART_APP.details.url,
      hostInstanceId: HOST_LAUNCHER_INSTANCE_ID,
      instanceUuid: crypto.randomUUID(),
    })

    expect(chart.validatedInstanceId).toBe(HOST_LAUNCHER_INSTANCE_ID)
    expect(agent.getState().instances[HOST_LAUNCHER_INSTANCE_ID]?.state).toBe(
      AppInstanceState.CONNECTED,
    )
  })

  it("removes instance from agent state when app sends WCP6Goodbye", async () => {
    const agent = createTestAgent({ disconnectGracePeriod: 0 })
    activeAgents.push(agent)

    const connected = await connectWcpApp(agent, {
      connectionAttemptUuid: "lifecycle-wcp6-goodbye-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    expect(agent.getState().instances[connected.validatedInstanceId]?.state).toBe(
      AppInstanceState.CONNECTED,
    )

    connected.appPort.postMessage({
      type: "WCP6Goodbye",
      meta: { timestamp: new Date().toISOString() },
    })
    await flushAsyncDelivery()

    await vi.waitFor(() => {
      expect(agent.getState().instances[connected.validatedInstanceId]).toBeUndefined()
    })
  })

  it("skips heartbeat machinery when heartbeat is disabled and keeps instance until disconnect", async () => {
    const agent = createTestAgent({
      heartbeatEnabled: false,
      disconnectGracePeriod: 0,
    })
    activeAgents.push(agent)

    const connected = await connectWcpApp(agent, {
      connectionAttemptUuid: "lifecycle-heartbeat-off-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    expect(agent.getState().instances[connected.validatedInstanceId]?.state).toBe(
      AppInstanceState.CONNECTED,
    )
    expect(getActiveHeartbeatTimerCount()).toBe(0)
    expect(agent.getState().heartbeats[connected.validatedInstanceId]).toBeUndefined()

    await new Promise(resolve => setTimeout(resolve, 300))

    expect(agent.getState().instances[connected.validatedInstanceId]).toBeDefined()
    expect(getActiveHeartbeatTimerCount()).toBe(0)
  })

  it("removes validated instance when disconnectInstance is called with WCP4 temp id and heartbeat is disabled", async () => {
    const agent = createTestAgent({
      heartbeatEnabled: false,
      disconnectGracePeriod: 0,
    })
    activeAgents.push(agent)

    const connected = await connectWcpApp(agent, {
      connectionAttemptUuid: "lifecycle-temp-disconnect-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    expect(agent.getState().instances[connected.validatedInstanceId]?.state).toBe(
      AppInstanceState.CONNECTED,
    )

    agent.disconnectInstance(connected.tempInstanceId)

    expect(agent.getState().instances[connected.validatedInstanceId]).toBeUndefined()
  })

  it("removes instance on heartbeat timeout when heartbeat is enabled", async () => {
    const agent = createTestAgent({
      heartbeatEnabled: true,
      heartbeatIntervalMs: 50,
      heartbeatTimeoutMs: 150,
      disconnectGracePeriod: 0,
    })
    activeAgents.push(agent)

    const connected = await connectWcpApp(agent, {
      connectionAttemptUuid: "lifecycle-heartbeat-timeout-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    expect(agent.getState().instances[connected.validatedInstanceId]?.state).toBe(
      AppInstanceState.CONNECTED,
    )
    expect(getActiveHeartbeatTimerCount()).toBeGreaterThan(0)

    await vi.waitFor(
      () => {
        expect(agent.getState().instances[connected.validatedInstanceId]).toBeUndefined()
      },
      { timeout: 2000 },
    )
    expect(getActiveHeartbeatTimerCount()).toBe(0)
  })

  it("reconnects with the same instance identity when WCP4 revalidates from the same app", async () => {
    const agent = createTestAgent()
    activeAgents.push(agent)

    const firstChart = await connectWcpApp(agent, {
      connectionAttemptUuid: "lifecycle-reconnect-chart-first",
      appId: CHART_APP.appId,
      identityUrl: CHART_APP.details.url,
    })

    const secondChart = await connectWcpApp(agent, {
      connectionAttemptUuid: "lifecycle-reconnect-chart-second",
      appId: CHART_APP.appId,
      identityUrl: CHART_APP.details.url,
      hostInstanceId: firstChart.validatedInstanceId,
      instanceUuid: firstChart.instanceUuid,
    })

    expect(secondChart.validatedInstanceId).toBe(firstChart.validatedInstanceId)
    expect(agent.getState().instances[firstChart.validatedInstanceId]?.state).toBe(
      AppInstanceState.CONNECTED,
    )
  })

  it("rejects WCP4 revalidation when the app is not in the app directory", async () => {
    const agent = createTestAgent()
    activeAgents.push(agent)

    const connectionAttemptUuid = "lifecycle-unknown-reconnect-uuid"
    const unknownUrl = "https://example.com/unknown"
    const postMessageSpy = vi.spyOn(window, "postMessage")
    window.dispatchEvent(createMessageEvent(createWCP1Hello(connectionAttemptUuid, unknownUrl)))

    const calls = postMessageSpy.mock.calls as unknown as Array<
      [BrowserTypes.WebConnectionProtocol3Handshake, string, MessagePort[]]
    >
    postMessageSpy.mockRestore()

    const appPort = calls[0]![2][0]!
    appPort.start()

    const wcp4Failed = waitForPortMessage<{ type: string; payload?: { message?: string } }>(
      appPort,
      data => (data as { type?: string }).type === "WCP5ValidateAppIdentityFailedResponse",
    )

    appPort.postMessage({
      type: "WCP4ValidateAppIdentity",
      meta: {
        connectionAttemptUuid,
        timestamp: new Date(),
      },
      payload: {
        identityUrl: unknownUrl,
        actualUrl: unknownUrl,
      },
    })
    await flushAsyncDelivery()

    const failed = await wcp4Failed
    expect(failed.type).toBe("WCP5ValidateAppIdentityFailedResponse")
    expect(failed.payload?.message).toContain("App not found in app directory")
  })
})
