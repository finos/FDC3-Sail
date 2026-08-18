/**
 * WCP edge-contract integration tests.
 *
 * Proves the browser edge (BrowserAppConnection + MessagePort) wired to DesktopAgent —
 * not headless ingest-only DACP oracle tests.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, afterEach, beforeEach, vi } from "vite-plus/test"
import { OpenError, type BrowserTypes, type Context } from "@finos/fdc3"
import { isValidWebConnectionProtocol6Goodbye } from "@finos/fdc3-schema/dist/generated/api/BrowserTypes"
import type { AppLauncher } from "../../host-contracts/app-launcher"
import type { SailDesktopAgent } from "../../agent/sail-desktop-agent"
import type {
  AppChannelChangeEvent,
  HandshakeFailureEvent,
  SailDesktopAgentApps,
  SailDesktopAgentChannels,
} from "../../agent/sail-desktop-agent-controllers"
import type { AppConnectionMetadata } from "../../app-connection/browser-app-connection"
import { AppInstanceState } from "../../state/types"
import { clearAllHeartbeatTimersForTesting } from "../../handlers/heartbeat/runtime"
import { clearAllPendingOpenWithContextTimeoutsForTesting } from "../../handlers/utils/open-with-context"
import {
  COUNTRY_CONTEXT,
  INSTRUMENT_CONTEXT,
  collectPortMessages,
  connectWcpApp,
  connectWcpAppFirstConnect,
  beginWcpAppFirstConnect,
  createAddContextListenerMessage,
  createAddEventListenerMessage,
  createBroadcastMessage,
  createGetOrCreateChannelMessage,
  createJoinUserChannelMessage,
  createGenericContextListenerMessage,
  createMessageEvent,
  createOpenRequestMessage,
  createWCP1Hello,
  flushAsyncDelivery,
  postDacpOnPort,
  waitForPortMessage,
} from "./wcp-edge-test-helpers"
import {
  CHANNEL_ID,
  CHART_APP,
  createHostInstanceAppLauncher,
  createTestAgent,
  HOST_LAUNCHER_INSTANCE_ID,
  PORTFOLIO_APP,
} from "./wcp-desktop-agent.integration.fixtures"

/** Clears module-level open-with-context timers that outlive a single agent instance. */
function cleanupWcpIntegrationTestHarness(activeAgents: SailDesktopAgent[]): void {
  clearAllPendingOpenWithContextTimeoutsForTesting()
  clearAllHeartbeatTimersForTesting()
  for (const agent of activeAgents.splice(0)) {
    agent.stop()
  }
  vi.restoreAllMocks()
}

beforeEach(() => {
  vi.restoreAllMocks()
})

const OPEN_WITH_CONTEXT_LAUNCH: Context = {
  type: "testContextY",
  id: { value: "conformance-open-context" },
}

const CHANNEL_ID_2 = "fdc3.channel.2"

function requireChannelsController(agent: SailDesktopAgent): SailDesktopAgentChannels {
  const { channels } = agent
  expect(channels).toBeDefined()
  expect(typeof channels.getAppChannelId).toBe("function")
  expect(typeof channels.getAppChannel).toBe("function")
  expect(typeof channels.changeAppChannel).toBe("function")
  expect(typeof channels.onAppChannelChange).toBe("function")
  return channels
}

function requireAppsController(agent: SailDesktopAgent): SailDesktopAgentApps {
  const { apps } = agent
  expect(apps).toBeDefined()
  expect(typeof apps.onConnect).toBe("function")
  expect(typeof apps.onDisconnect).toBe("function")
  expect(typeof apps.disconnect).toBe("function")
  expect(typeof apps.getConnections).toBe("function")
  expect(typeof apps.getConnection).toBe("function")
  expect(typeof apps.getInstances).toBe("function")
  expect(typeof apps.getInstance).toBe("function")
  return apps
}

function waitForChannelChangedEvent(
  appPort: MessagePort,
  expectedChannelId: string | null,
): Promise<BrowserTypes.ChannelChangedEvent> {
  return waitForPortMessage<BrowserTypes.ChannelChangedEvent>(appPort, data => {
    const message = data as {
      type?: string
      payload?: { currentChannelId?: string | null }
    }
    if (message.type !== "channelChangedEvent") {
      return false
    }
    return (message.payload?.currentChannelId ?? null) === expectedChannelId
  })
}

describe("session carry-over", () => {
  const activeAgents: SailDesktopAgent[] = []
  const STALE_LAUNCHER_INSTANCE_ID = "L-stale"
  const SECOND_LAUNCHER_INSTANCE_ID = "L2"

  afterEach(() => {
    cleanupWcpIntegrationTestHarness(activeAgents)
  })

  function createSessionSoakAppLauncher(): AppLauncher {
    let launchCount = 0
    return {
      launch(request) {
        const launcherIds = [STALE_LAUNCHER_INSTANCE_ID, SECOND_LAUNCHER_INSTANCE_ID]
        const instanceId = request.app.instanceId ?? launcherIds[launchCount++]
        return Promise.resolve({ appId: request.app.appId, instanceId })
      },
    }
  }

  function createFindInstancesMessage(
    sourceInstanceId: string,
    sourceAppId: string,
    targetAppId: string,
  ): BrowserTypes.FindInstancesRequest {
    return {
      type: "findInstancesRequest",
      meta: {
        requestUuid: crypto.randomUUID(),
        timestamp: new Date(),
        source: { appId: sourceAppId, instanceId: sourceInstanceId },
      },
      payload: {
        app: { appId: targetAppId },
      },
    }
  }

  it("delivers second open-with-context to L2 when L-stale remains CONNECTED from earlier session", async () => {
    const agent = createTestAgent({
      appLauncher: createSessionSoakAppLauncher(),
      openContextListenerTimeoutMs: 5000,
    })
    activeAgents.push(agent)

    const appA = await connectWcpApp(agent, {
      connectionAttemptUuid: "session-soak-open-source-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    const firstOpenResponsePromise = waitForPortMessage<BrowserTypes.OpenResponse>(
      appA.appPort,
      data => (data as { type?: string }).type === "openResponse",
    )

    await postDacpOnPort(
      appA.appPort,
      createOpenRequestMessage(
        appA.validatedInstanceId,
        appA.appId,
        CHART_APP.appId,
        OPEN_WITH_CONTEXT_LAUNCH,
      ),
    )

    await vi.waitFor(() => {
      expect(agent.getState().open.pendingWithContext[STALE_LAUNCHER_INSTANCE_ID]?.length).toBe(1)
      expect(agent.getState().instances[STALE_LAUNCHER_INSTANCE_ID]?.appId).toBe(CHART_APP.appId)
    })

    const staleChart = await connectWcpAppFirstConnect(agent, {
      connectionAttemptUuid: "session-soak-stale-chart-uuid",
      appId: "chartApp",
      identityUrl: CHART_APP.details.url,
      hostInstanceId: STALE_LAUNCHER_INSTANCE_ID,
    })

    const firstBroadcastPromise = waitForPortMessage<BrowserTypes.BroadcastEvent>(
      staleChart.appPort,
      data => (data as { type?: string }).type === "broadcastEvent",
    )

    await postDacpOnPort(
      staleChart.appPort,
      createGenericContextListenerMessage(staleChart.validatedInstanceId, staleChart.appId),
    )

    const [firstBroadcast, firstOpenResponse] = await Promise.all([
      firstBroadcastPromise,
      firstOpenResponsePromise,
    ])

    expect(staleChart.validatedInstanceId).toBe(STALE_LAUNCHER_INSTANCE_ID)
    expect(firstBroadcast.payload.context?.type).toBe(OPEN_WITH_CONTEXT_LAUNCH.type)
    expect(firstOpenResponse.payload.error).toBeUndefined()
    expect(firstOpenResponse.payload.appIdentifier?.instanceId).toBe(STALE_LAUNCHER_INSTANCE_ID)
    expect(agent.getState().instances[STALE_LAUNCHER_INSTANCE_ID]?.state).toBe(
      AppInstanceState.CONNECTED,
    )

    const secondOpenResponsePromise = waitForPortMessage<BrowserTypes.OpenResponse>(
      appA.appPort,
      data => (data as { type?: string }).type === "openResponse",
    )

    const staleBroadcastPromise = waitForPortMessage<BrowserTypes.BroadcastEvent>(
      staleChart.appPort,
      data => (data as { type?: string }).type === "broadcastEvent",
      500,
    ).catch(() => null)

    await postDacpOnPort(
      appA.appPort,
      createOpenRequestMessage(
        appA.validatedInstanceId,
        appA.appId,
        CHART_APP.appId,
        OPEN_WITH_CONTEXT_LAUNCH,
      ),
    )

    await vi.waitFor(() => {
      expect(agent.getState().open.pendingWithContext[SECOND_LAUNCHER_INSTANCE_ID]?.length).toBe(1)
      expect(agent.getState().instances[SECOND_LAUNCHER_INSTANCE_ID]?.appId).toBe(CHART_APP.appId)
    })

    const findInstancesResponsePromise = waitForPortMessage<BrowserTypes.FindInstancesResponse>(
      appA.appPort,
      data => (data as { type?: string }).type === "findInstancesResponse",
    )

    await postDacpOnPort(
      appA.appPort,
      createFindInstancesMessage(appA.validatedInstanceId, appA.appId, CHART_APP.appId),
    )

    const findInstancesResponse = await findInstancesResponsePromise
    const findInstancesIds =
      findInstancesResponse.payload.appIdentifiers?.map(identifier => identifier.instanceId) ?? []

    expect(findInstancesIds).toContain(SECOND_LAUNCHER_INSTANCE_ID)
    expect(findInstancesIds).not.toEqual([STALE_LAUNCHER_INSTANCE_ID])

    const appB = await connectWcpAppFirstConnect(agent, {
      connectionAttemptUuid: "session-soak-first-connect-target-uuid",
      appId: "chartApp",
      identityUrl: CHART_APP.details.url,
      hostInstanceId: SECOND_LAUNCHER_INSTANCE_ID,
    })

    expect(appB.validatedInstanceId).toBe(SECOND_LAUNCHER_INSTANCE_ID)

    const newBroadcastPromise = waitForPortMessage<BrowserTypes.BroadcastEvent>(
      appB.appPort,
      data => (data as { type?: string }).type === "broadcastEvent",
    )

    await postDacpOnPort(
      appB.appPort,
      createGenericContextListenerMessage(appB.validatedInstanceId, appB.appId),
    )

    const [staleBroadcast, newBroadcast, openResponse] = await Promise.all([
      staleBroadcastPromise,
      newBroadcastPromise,
      secondOpenResponsePromise,
    ])

    expect(staleBroadcast).toBeNull()
    expect(newBroadcast.payload.context?.type).toBe(OPEN_WITH_CONTEXT_LAUNCH.type)
    expect(openResponse.type).toBe("openResponse")
    expect(openResponse.payload.error).toBeUndefined()
    expect(openResponse.payload.appIdentifier?.instanceId).toBe(SECOND_LAUNCHER_INSTANCE_ID)
    expect(agent.getState().open.pendingWithContext[SECOND_LAUNCHER_INSTANCE_ID]?.length ?? 0).toBe(
      0,
    )

    const connectedChartInstances = Object.values(agent.getState().instances).filter(
      instance =>
        instance.appId === CHART_APP.appId && instance.state === AppInstanceState.CONNECTED,
    )
    // Session soak: stale L-stale may remain CONNECTED alongside L2 — see findIntent oracle / RT-06.
    expect(connectedChartInstances.length).toBeGreaterThanOrEqual(2)
    expect(connectedChartInstances.map(instance => instance.instanceId)).toEqual(
      expect.arrayContaining([STALE_LAUNCHER_INSTANCE_ID, SECOND_LAUNCHER_INSTANCE_ID]),
    )
  })
})

describe("WCP open-with-context (AOpensBWithContext3 path)", () => {
  const activeAgents: SailDesktopAgent[] = []

  afterEach(() => {
    cleanupWcpIntegrationTestHarness(activeAgents)
  })

  it("delivers launch context via broadcastEvent when B adds a generic * listener after host-pre-registered open", async () => {
    const agent = createTestAgent({
      appLauncher: createHostInstanceAppLauncher(),
      openContextListenerTimeoutMs: 5000,
    })
    activeAgents.push(agent)

    const appA = await connectWcpApp(agent, {
      connectionAttemptUuid: "open-with-context-source-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    const openResponsePromise = waitForPortMessage<BrowserTypes.OpenResponse>(
      appA.appPort,
      data => (data as { type?: string }).type === "openResponse",
    )

    await postDacpOnPort(
      appA.appPort,
      createOpenRequestMessage(
        appA.validatedInstanceId,
        appA.appId,
        CHART_APP.appId,
        OPEN_WITH_CONTEXT_LAUNCH,
      ),
    )

    await vi.waitFor(() => {
      expect(agent.getState().open.pendingWithContext[HOST_LAUNCHER_INSTANCE_ID]?.length).toBe(1)
      expect(agent.getState().instances[HOST_LAUNCHER_INSTANCE_ID]?.appId).toBe(CHART_APP.appId)
    })

    const appB = await connectWcpApp(agent, {
      connectionAttemptUuid: "open-with-context-target-uuid",
      appId: "chartApp",
      identityUrl: CHART_APP.details.url,
      hostInstanceId: HOST_LAUNCHER_INSTANCE_ID,
      instanceUuid: crypto.randomUUID(),
    })

    expect(appB.validatedInstanceId).toBe(HOST_LAUNCHER_INSTANCE_ID)

    const broadcastPromise = waitForPortMessage<BrowserTypes.BroadcastEvent>(
      appB.appPort,
      data => (data as { type?: string }).type === "broadcastEvent",
    )

    await postDacpOnPort(
      appB.appPort,
      createGenericContextListenerMessage(appB.validatedInstanceId, appB.appId),
    )

    const [broadcastEvent, openResponse] = await Promise.all([
      broadcastPromise,
      openResponsePromise,
    ])

    expect(broadcastEvent.type).toBe("broadcastEvent")
    const destination = (
      broadcastEvent.meta as BrowserTypes.BroadcastEventMeta & {
        destination?: { instanceId?: string }
      }
    ).destination
    expect(destination?.instanceId).toBe(HOST_LAUNCHER_INSTANCE_ID)
    expect(broadcastEvent.payload.context?.type).toBe(OPEN_WITH_CONTEXT_LAUNCH.type)
    expect(broadcastEvent.payload.channelId).toBeNull()

    expect(openResponse.type).toBe("openResponse")
    expect(openResponse.payload.error).toBeUndefined()
    expect(openResponse.payload.appIdentifier?.instanceId).toBe(HOST_LAUNCHER_INSTANCE_ID)
    expect(agent.getState().open.pendingWithContext[HOST_LAUNCHER_INSTANCE_ID]?.length ?? 0).toBe(0)
  })

  it("does not deliver open-with-context to a stale chart instance when a new host-pre-registered open is pending", async () => {
    const staleHostInstanceId = "uuid-host-stale"

    const agent = createTestAgent({
      appLauncher: createHostInstanceAppLauncher(),
      openContextListenerTimeoutMs: 5000,
    })
    activeAgents.push(agent)

    const staleChart = await connectWcpApp(agent, {
      connectionAttemptUuid: "open-with-context-stale-chart-uuid",
      appId: "chartApp",
      identityUrl: CHART_APP.details.url,
      hostInstanceId: staleHostInstanceId,
      instanceUuid: crypto.randomUUID(),
    })

    await postDacpOnPort(
      staleChart.appPort,
      createGenericContextListenerMessage(staleChart.validatedInstanceId, staleChart.appId),
    )

    const appA = await connectWcpApp(agent, {
      connectionAttemptUuid: "open-with-context-stale-source-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    const staleBroadcastPromise = waitForPortMessage<BrowserTypes.BroadcastEvent>(
      staleChart.appPort,
      data => (data as { type?: string }).type === "broadcastEvent",
      500,
    ).catch(() => null)

    const openResponsePromise = waitForPortMessage<BrowserTypes.OpenResponse>(
      appA.appPort,
      data => (data as { type?: string }).type === "openResponse",
      6000,
    )

    await postDacpOnPort(
      appA.appPort,
      createOpenRequestMessage(
        appA.validatedInstanceId,
        appA.appId,
        CHART_APP.appId,
        OPEN_WITH_CONTEXT_LAUNCH,
      ),
    )

    await vi.waitFor(() => {
      expect(agent.getState().open.pendingWithContext[HOST_LAUNCHER_INSTANCE_ID]?.length).toBe(1)
    })

    const newChart = await connectWcpApp(agent, {
      connectionAttemptUuid: "open-with-context-stale-new-chart-uuid",
      appId: "chartApp",
      identityUrl: CHART_APP.details.url,
      hostInstanceId: HOST_LAUNCHER_INSTANCE_ID,
      instanceUuid: crypto.randomUUID(),
    })

    const newBroadcastPromise = waitForPortMessage<BrowserTypes.BroadcastEvent>(
      newChart.appPort,
      data => (data as { type?: string }).type === "broadcastEvent",
    )

    await postDacpOnPort(
      newChart.appPort,
      createGenericContextListenerMessage(newChart.validatedInstanceId, newChart.appId),
    )

    const staleBroadcast = await staleBroadcastPromise
    const newBroadcast = await newBroadcastPromise
    const openResponse = await openResponsePromise

    expect(staleBroadcast).toBeNull()
    expect(newBroadcast.payload.context?.type).toBe(OPEN_WITH_CONTEXT_LAUNCH.type)
    expect(openResponse.payload.error).toBeUndefined()
  })
})

describe("open-with-context (first-connect WCP4)", () => {
  const activeAgents: SailDesktopAgent[] = []

  afterEach(() => {
    cleanupWcpIntegrationTestHarness(activeAgents)
  })

  it("delivers launch context when B first-connects without instanceUuid and adopts sole pending launcher id", async () => {
    const agent = createTestAgent({
      appLauncher: createHostInstanceAppLauncher(),
      openContextListenerTimeoutMs: 5000,
    })
    activeAgents.push(agent)

    const appA = await connectWcpApp(agent, {
      connectionAttemptUuid: "first-connect-open-source-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    const openResponsePromise = waitForPortMessage<BrowserTypes.OpenResponse>(
      appA.appPort,
      data => (data as { type?: string }).type === "openResponse",
    )

    await postDacpOnPort(
      appA.appPort,
      createOpenRequestMessage(
        appA.validatedInstanceId,
        appA.appId,
        CHART_APP.appId,
        OPEN_WITH_CONTEXT_LAUNCH,
      ),
    )

    await vi.waitFor(() => {
      expect(agent.getState().open.pendingWithContext[HOST_LAUNCHER_INSTANCE_ID]?.length).toBe(1)
      expect(agent.getState().instances[HOST_LAUNCHER_INSTANCE_ID]?.appId).toBe(CHART_APP.appId)
    })

    const appB = await connectWcpAppFirstConnect(agent, {
      connectionAttemptUuid: "first-connect-open-target-uuid",
      appId: "chartApp",
      identityUrl: CHART_APP.details.url,
    })

    expect(appB.validatedInstanceId).toBe(HOST_LAUNCHER_INSTANCE_ID)

    const broadcastPromise = waitForPortMessage<BrowserTypes.BroadcastEvent>(
      appB.appPort,
      data => (data as { type?: string }).type === "broadcastEvent",
    )

    await postDacpOnPort(
      appB.appPort,
      createGenericContextListenerMessage(appB.validatedInstanceId, appB.appId),
    )

    const [broadcastEvent, openResponse] = await Promise.all([
      broadcastPromise,
      openResponsePromise,
    ])

    expect(broadcastEvent.type).toBe("broadcastEvent")
    expect(broadcastEvent.payload.context?.type).toBe(OPEN_WITH_CONTEXT_LAUNCH.type)
    expect(openResponse.type).toBe("openResponse")
    expect(openResponse.payload.error).toBeUndefined()
    expect(openResponse.payload.appIdentifier?.instanceId).toBe(HOST_LAUNCHER_INSTANCE_ID)
    expect(agent.getState().open.pendingWithContext[HOST_LAUNCHER_INSTANCE_ID]?.length ?? 0).toBe(0)
  })

  it("delivers open-with-context when B listens only for fdc3.instrument", async () => {
    const agent = createTestAgent({
      appLauncher: createHostInstanceAppLauncher(),
      openContextListenerTimeoutMs: 5000,
    })
    activeAgents.push(agent)

    const appA = await connectWcpApp(agent, {
      connectionAttemptUuid: "first-connect-specific-source-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    const openResponsePromise = waitForPortMessage<BrowserTypes.OpenResponse>(
      appA.appPort,
      data => (data as { type?: string }).type === "openResponse",
    )

    await postDacpOnPort(
      appA.appPort,
      createOpenRequestMessage(
        appA.validatedInstanceId,
        appA.appId,
        CHART_APP.appId,
        INSTRUMENT_CONTEXT,
      ),
    )

    await vi.waitFor(() => {
      expect(agent.getState().open.pendingWithContext[HOST_LAUNCHER_INSTANCE_ID]?.length).toBe(1)
    })

    const appB = await connectWcpAppFirstConnect(agent, {
      connectionAttemptUuid: "first-connect-specific-target-uuid",
      appId: "chartApp",
      identityUrl: CHART_APP.details.url,
    })

    expect(appB.validatedInstanceId).toBe(HOST_LAUNCHER_INSTANCE_ID)

    const broadcastPromise = waitForPortMessage<BrowserTypes.BroadcastEvent>(
      appB.appPort,
      data => (data as { type?: string }).type === "broadcastEvent",
    )

    await postDacpOnPort(
      appB.appPort,
      createAddContextListenerMessage(
        appB.validatedInstanceId,
        appB.appId,
        null,
        INSTRUMENT_CONTEXT.type,
      ),
    )

    const [broadcastEvent, openResponse] = await Promise.all([
      broadcastPromise,
      openResponsePromise,
    ])

    expect(broadcastEvent.payload.context?.type).toBe(INSTRUMENT_CONTEXT.type)
    expect(openResponse.payload.error).toBeUndefined()
  })

  it("does not deliver to an instrument-only listener when open context is fdc3.country", async () => {
    const agent = createTestAgent({
      appLauncher: createHostInstanceAppLauncher(),
      openContextListenerTimeoutMs: 2000,
    })
    activeAgents.push(agent)

    const appA = await connectWcpApp(agent, {
      connectionAttemptUuid: "first-connect-wrong-type-source-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    const openResponsePromise = waitForPortMessage<BrowserTypes.OpenResponse>(
      appA.appPort,
      data => (data as { type?: string }).type === "openResponse",
      4000,
    )

    await postDacpOnPort(
      appA.appPort,
      createOpenRequestMessage(
        appA.validatedInstanceId,
        appA.appId,
        CHART_APP.appId,
        COUNTRY_CONTEXT,
      ),
    )

    await vi.waitFor(() => {
      expect(agent.getState().open.pendingWithContext[HOST_LAUNCHER_INSTANCE_ID]?.length).toBe(1)
    })

    const appB = await connectWcpAppFirstConnect(agent, {
      connectionAttemptUuid: "first-connect-wrong-type-target-uuid",
      appId: "chartApp",
      identityUrl: CHART_APP.details.url,
    })

    const broadcastCollector = collectPortMessages<BrowserTypes.BroadcastEvent>(
      appB.appPort,
      data => (data as { type?: string }).type === "broadcastEvent",
    )

    await postDacpOnPort(
      appB.appPort,
      createAddContextListenerMessage(
        appB.validatedInstanceId,
        appB.appId,
        null,
        INSTRUMENT_CONTEXT.type,
      ),
    )

    const openResponse = await openResponsePromise

    broadcastCollector.stop()
    expect(broadcastCollector.messages).toHaveLength(0)
    expect(openResponse.payload.error).toBe(OpenError.AppTimeout)
  })

  it("delivers only to the matching listener when multiple context listeners are registered", async () => {
    const agent = createTestAgent({
      appLauncher: createHostInstanceAppLauncher(),
      openContextListenerTimeoutMs: 5000,
    })
    activeAgents.push(agent)

    const appA = await connectWcpApp(agent, {
      connectionAttemptUuid: "first-connect-multi-listen-source-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    const openResponses: BrowserTypes.OpenResponse[] = []
    const openResponseCollector = collectPortMessages<BrowserTypes.OpenResponse>(
      appA.appPort,
      data => (data as { type?: string }).type === "openResponse",
    )

    await postDacpOnPort(
      appA.appPort,
      createOpenRequestMessage(
        appA.validatedInstanceId,
        appA.appId,
        CHART_APP.appId,
        INSTRUMENT_CONTEXT,
      ),
    )

    await vi.waitFor(() => {
      expect(agent.getState().open.pendingWithContext[HOST_LAUNCHER_INSTANCE_ID]?.length).toBe(1)
    })

    const appB = await connectWcpAppFirstConnect(agent, {
      connectionAttemptUuid: "first-connect-multi-listen-target-uuid",
      appId: "chartApp",
      identityUrl: CHART_APP.details.url,
    })

    const broadcastCollector = collectPortMessages<BrowserTypes.BroadcastEvent>(
      appB.appPort,
      data => (data as { type?: string }).type === "broadcastEvent",
    )

    await postDacpOnPort(
      appB.appPort,
      createAddContextListenerMessage(
        appB.validatedInstanceId,
        appB.appId,
        null,
        COUNTRY_CONTEXT.type,
      ),
    )
    await postDacpOnPort(
      appB.appPort,
      createAddContextListenerMessage(
        appB.validatedInstanceId,
        appB.appId,
        null,
        INSTRUMENT_CONTEXT.type,
      ),
    )

    await vi.waitFor(() => {
      expect(openResponseCollector.messages.length).toBeGreaterThanOrEqual(1)
      expect(broadcastCollector.messages.length).toBeGreaterThanOrEqual(1)
    })

    openResponseCollector.stop()
    broadcastCollector.stop()

    openResponses.push(...openResponseCollector.messages)

    expect(broadcastCollector.messages).toHaveLength(1)
    expect(broadcastCollector.messages[0]?.payload.context?.type).toBe(INSTRUMENT_CONTEXT.type)
    expect(openResponses.filter(response => response.payload.error === undefined)).toHaveLength(1)
    expect(openResponses.filter(response => response.payload.error !== undefined)).toHaveLength(0)
  })

  it("delivers when context listener is registered on temp routing id before WCP5 adoption completes", async () => {
    const agent = createTestAgent({
      appLauncher: createHostInstanceAppLauncher(),
      openContextListenerTimeoutMs: 5000,
    })
    activeAgents.push(agent)

    const appA = await connectWcpApp(agent, {
      connectionAttemptUuid: "first-connect-early-listener-source-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    const openResponsePromise = waitForPortMessage<BrowserTypes.OpenResponse>(
      appA.appPort,
      data => (data as { type?: string }).type === "openResponse",
    )

    await postDacpOnPort(
      appA.appPort,
      createOpenRequestMessage(
        appA.validatedInstanceId,
        appA.appId,
        CHART_APP.appId,
        OPEN_WITH_CONTEXT_LAUNCH,
      ),
    )

    await vi.waitFor(() => {
      expect(agent.getState().open.pendingWithContext[HOST_LAUNCHER_INSTANCE_ID]?.length).toBe(1)
    })

    const session = beginWcpAppFirstConnect(agent, {
      connectionAttemptUuid: "first-connect-early-listener-target-uuid",
      appId: "chartApp",
      identityUrl: CHART_APP.details.url,
    })

    const broadcastCollector = collectPortMessages<BrowserTypes.BroadcastEvent>(
      session.appPort,
      data => (data as { type?: string }).type === "broadcastEvent",
    )

    await session.postFirstConnectWcp4()

    await postDacpOnPort(
      session.appPort,
      createGenericContextListenerMessage(session.tempInstanceId, "chartApp"),
    )

    const appB = await session.completeFirstConnect()

    expect(appB.validatedInstanceId).toBe(HOST_LAUNCHER_INSTANCE_ID)

    const openResponse = await openResponsePromise

    // Stop only after the assertion. `openResponsePromise` settles on a different port, so it
    // says nothing about whether the broadcast has landed on this one; stopping first removed
    // the listener while the event was still in flight, leaving `vi.waitFor` polling an array
    // that could never change.
    await vi.waitFor(() => {
      expect(broadcastCollector.messages.length).toBeGreaterThanOrEqual(1)
    })

    broadcastCollector.stop()

    const broadcastEvent = broadcastCollector.messages[0]!

    expect(broadcastEvent.payload.context?.type).toBe(OPEN_WITH_CONTEXT_LAUNCH.type)
    expect(openResponse.payload.error).toBeUndefined()
    expect(agent.getState().open.pendingWithContext[HOST_LAUNCHER_INSTANCE_ID]?.length ?? 0).toBe(0)
  })

  it("returns openResponse error when listener instance does not match pending launcher id", async () => {
    const agent = createTestAgent({
      appLauncher: createHostInstanceAppLauncher(),
      openContextListenerTimeoutMs: 2000,
    })
    activeAgents.push(agent)

    const appB = await connectWcpAppFirstConnect(agent, {
      connectionAttemptUuid: "first-connect-mismatch-target-uuid",
      appId: "chartApp",
      identityUrl: CHART_APP.details.url,
    })

    expect(appB.validatedInstanceId).not.toBe(HOST_LAUNCHER_INSTANCE_ID)

    await postDacpOnPort(
      appB.appPort,
      createAddContextListenerMessage(
        appB.validatedInstanceId,
        appB.appId,
        null,
        INSTRUMENT_CONTEXT.type,
      ),
    )

    const appA = await connectWcpApp(agent, {
      connectionAttemptUuid: "first-connect-mismatch-source-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    const openResponsePromise = waitForPortMessage<BrowserTypes.OpenResponse>(
      appA.appPort,
      data => (data as { type?: string }).type === "openResponse",
      4000,
    )

    const broadcastCollector = collectPortMessages<BrowserTypes.BroadcastEvent>(
      appB.appPort,
      data => (data as { type?: string }).type === "broadcastEvent",
    )

    await postDacpOnPort(
      appA.appPort,
      createOpenRequestMessage(
        appA.validatedInstanceId,
        appA.appId,
        CHART_APP.appId,
        INSTRUMENT_CONTEXT,
      ),
    )

    const openResponse = await openResponsePromise

    broadcastCollector.stop()
    expect(broadcastCollector.messages).toHaveLength(0)
    expect(openResponse.payload.error).toBe(OpenError.AppTimeout)
    expect(agent.getState().open.pendingWithContext[HOST_LAUNCHER_INSTANCE_ID]?.length ?? 0).toBe(0)
  })
})

describe("plain open() waits for the launched app to connect (S3-F2)", () => {
  const activeAgents: SailDesktopAgent[] = []

  afterEach(() => {
    cleanupWcpIntegrationTestHarness(activeAgents)
  })

  it("does not emit openResponse until the launched instance's WCP5 success is already on the wire", async () => {
    const agent = createTestAgent({
      appLauncher: createHostInstanceAppLauncher(),
      openContextListenerTimeoutMs: 5000,
    })
    activeAgents.push(agent)

    const appA = await connectWcpApp(agent, {
      connectionAttemptUuid: "plain-open-source-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    // Real wire ordering, not mock call counts: record the order in which these two message
    // *types* are actually written to the wire (the call order of `MessagePort#postMessage`
    // across every port in the test, production and test-side alike). Receipt order on two
    // independent `MessageChannel`s is not guaranteed to mirror send order under jsdom's task
    // scheduling — confirmed empirically: an earlier version of this test used a pair of
    // `addEventListener` observers (one per port) to record arrival order instead, and it
    // intermittently observed openResponse arrive before WCP5ValidateAppIdentityResponse even
    // though the production call order (below) is correct. The send-order spy is the reliable
    // signal for "X was on the wire before Y".
    const postMessageSpy = vi.spyOn(MessagePort.prototype, "postMessage")
    const sentOrder = (): string[] =>
      postMessageSpy.mock.calls
        .map(call => (call[0] as { type?: string } | undefined)?.type)
        .filter(
          (type): type is string =>
            type === "WCP5ValidateAppIdentityResponse" || type === "openResponse",
        )

    const openResponsePromise = waitForPortMessage<BrowserTypes.OpenResponse>(
      appA.appPort,
      data => (data as { type?: string }).type === "openResponse",
    )

    // Plain open: no launch context, so the pending open can only resolve on WCP5 —
    // there is no context listener for it to instead race against.
    await postDacpOnPort(
      appA.appPort,
      createOpenRequestMessage(appA.validatedInstanceId, appA.appId, CHART_APP.appId),
    )

    await vi.waitFor(() => {
      expect(agent.getState().open.pendingWithContext[HOST_LAUNCHER_INSTANCE_ID]?.length).toBe(1)
      expect(agent.getState().instances[HOST_LAUNCHER_INSTANCE_ID]?.appId).toBe(CHART_APP.appId)
      expect(agent.getState().instances[HOST_LAUNCHER_INSTANCE_ID]?.state).toBe(
        AppInstanceState.PENDING,
      )
    })

    // openResponse must still be unsent: the launched instance hasn't connected yet.
    expect(sentOrder()).toEqual([])

    const appB = await connectWcpAppFirstConnect(agent, {
      connectionAttemptUuid: "plain-open-target-uuid",
      appId: "chartApp",
      identityUrl: CHART_APP.details.url,
    })

    const openResponse = await openResponsePromise

    expect(appB.validatedInstanceId).toBe(HOST_LAUNCHER_INSTANCE_ID)
    expect(openResponse.type).toBe("openResponse")
    expect(openResponse.payload.error).toBeUndefined()
    expect(openResponse.payload.appIdentifier?.instanceId).toBe(HOST_LAUNCHER_INSTANCE_ID)

    // The contract: WCP5 success for the launched app was written to the wire strictly before
    // openResponse for the app that launched it.
    //
    // The historical bug — answering a plain open as soon as the instance is pre-registered rather
    // than connected — is caught earlier, by the waitFor above: the open never becomes pending, so
    // that precondition is what fails. This assertion covers the other shape, where the open still
    // waits but the two sends are reordered relative to each other.
    expect(sentOrder()).toEqual(["WCP5ValidateAppIdentityResponse", "openResponse"])

    expect(agent.getState().open.pendingWithContext[HOST_LAUNCHER_INSTANCE_ID]?.length ?? 0).toBe(0)
  })
})

describe("WCP edge contract", () => {
  const activeAgents: SailDesktopAgent[] = []

  afterEach(() => {
    cleanupWcpIntegrationTestHarness(activeAgents)
  })

  it("routes WCP4 through the connector to DesktopAgent and correlates temp→validated instance ids", async () => {
    const agent = createTestAgent()
    activeAgents.push(agent)

    const appConnected = vi.fn()
    agent.appConnection.on("appConnected", appConnected)

    const connected = await connectWcpApp(agent, {
      connectionAttemptUuid: "integration-wcp-path-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    expect(appConnected).toHaveBeenCalledWith(
      expect.objectContaining({
        instanceId: connected.validatedInstanceId,
        appId: "portfolioApp",
        connectionAttemptUuid: "integration-wcp-path-uuid",
      }),
    )

    expect(agent.getState().instances[connected.validatedInstanceId]?.appId).toBe("portfolioApp")
  })

  it("delivers user-channel broadcast from app B to app A listener over MessagePort routing", async () => {
    const agent = createTestAgent()
    activeAgents.push(agent)

    const appA = await connectWcpApp(agent, {
      connectionAttemptUuid: "edge-listener-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    const appB = await connectWcpApp(agent, {
      connectionAttemptUuid: "edge-broadcaster-uuid",
      appId: "chartApp",
      identityUrl: CHART_APP.details.url,
    })

    const broadcastPromise = waitForPortMessage<BrowserTypes.BroadcastEvent>(
      appA.appPort,
      data => (data as { type?: string }).type === "broadcastEvent",
    )

    await postDacpOnPort(
      appA.appPort,
      createJoinUserChannelMessage(appA.validatedInstanceId, appA.appId, CHANNEL_ID),
    )
    await postDacpOnPort(
      appA.appPort,
      createAddContextListenerMessage(
        appA.validatedInstanceId,
        appA.appId,
        CHANNEL_ID,
        INSTRUMENT_CONTEXT.type,
      ),
    )

    await postDacpOnPort(
      appB.appPort,
      createJoinUserChannelMessage(appB.validatedInstanceId, appB.appId, CHANNEL_ID),
    )
    await postDacpOnPort(
      appB.appPort,
      createBroadcastMessage(appB.validatedInstanceId, appB.appId, CHANNEL_ID, INSTRUMENT_CONTEXT),
    )

    const broadcastEvent = await broadcastPromise

    expect(broadcastEvent.type).toBe("broadcastEvent")
    const destination = (
      broadcastEvent.meta as BrowserTypes.BroadcastEventMeta & {
        destination?: { instanceId?: string }
      }
    ).destination
    expect(destination?.instanceId).toBe(appA.validatedInstanceId)
    expect(broadcastEvent.payload.context?.type).toBe(INSTRUMENT_CONTEXT.type)
  })

  it("does not deliver user-channel broadcast when A and B are on different channels (UCFilteredUsage6)", async () => {
    const agent = createTestAgent()
    activeAgents.push(agent)

    const appA = await connectWcpApp(agent, {
      connectionAttemptUuid: "edge-isolated-listener-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    const appB = await connectWcpApp(agent, {
      connectionAttemptUuid: "edge-isolated-broadcaster-uuid",
      appId: "chartApp",
      identityUrl: CHART_APP.details.url,
    })

    const collected = collectPortMessages<BrowserTypes.BroadcastEvent>(
      appA.appPort,
      data => (data as { type?: string }).type === "broadcastEvent",
    )

    await postDacpOnPort(
      appA.appPort,
      createJoinUserChannelMessage(appA.validatedInstanceId, appA.appId, CHANNEL_ID),
    )
    await postDacpOnPort(
      appA.appPort,
      createAddContextListenerMessage(
        appA.validatedInstanceId,
        appA.appId,
        CHANNEL_ID,
        INSTRUMENT_CONTEXT.type,
      ),
    )

    await postDacpOnPort(
      appB.appPort,
      createJoinUserChannelMessage(appB.validatedInstanceId, appB.appId, CHANNEL_ID_2),
    )
    await postDacpOnPort(
      appB.appPort,
      createBroadcastMessage(
        appB.validatedInstanceId,
        appB.appId,
        CHANNEL_ID_2,
        INSTRUMENT_CONTEXT,
      ),
    )

    await flushAsyncDelivery()
    await flushAsyncDelivery()

    collected.stop()
    expect(collected.messages).toEqual([])
  })

  it("delivers app-channel broadcast from app B to app A listener over MessagePort routing", async () => {
    const agent = createTestAgent()
    activeAgents.push(agent)

    const appChannelId = "shared-wcp-app-channel"

    const appA = await connectWcpApp(agent, {
      connectionAttemptUuid: "edge-app-channel-listener-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    const appB = await connectWcpApp(agent, {
      connectionAttemptUuid: "edge-app-channel-broadcaster-uuid",
      appId: "chartApp",
      identityUrl: CHART_APP.details.url,
    })

    await postDacpOnPort(
      appA.appPort,
      createGetOrCreateChannelMessage(appA.validatedInstanceId, appA.appId, appChannelId),
    )
    await postDacpOnPort(
      appB.appPort,
      createGetOrCreateChannelMessage(appB.validatedInstanceId, appB.appId, appChannelId),
    )

    const broadcastPromise = waitForPortMessage<BrowserTypes.BroadcastEvent>(
      appA.appPort,
      data => (data as { type?: string }).type === "broadcastEvent",
    )

    await postDacpOnPort(
      appA.appPort,
      createAddContextListenerMessage(
        appA.validatedInstanceId,
        appA.appId,
        appChannelId,
        INSTRUMENT_CONTEXT.type,
      ),
    )
    await postDacpOnPort(
      appB.appPort,
      createBroadcastMessage(
        appB.validatedInstanceId,
        appB.appId,
        appChannelId,
        INSTRUMENT_CONTEXT,
      ),
    )

    const broadcastEvent = await broadcastPromise

    expect(broadcastEvent.type).toBe("broadcastEvent")
    const destination = (
      broadcastEvent.meta as BrowserTypes.BroadcastEventMeta & {
        destination?: { instanceId?: string }
      }
    ).destination
    expect(destination?.instanceId).toBe(appA.validatedInstanceId)
    expect(broadcastEvent.payload.context?.type).toBe(INSTRUMENT_CONTEXT.type)
  })

  it("adopts host launcher instanceId as validated id when open pre-registers a PENDING instance", async () => {
    const agent = createTestAgent({ appLauncher: createHostInstanceAppLauncher() })
    activeAgents.push(agent)

    const source = await connectWcpApp(agent, {
      connectionAttemptUuid: "edge-open-source-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    await postDacpOnPort(
      source.appPort,
      createOpenRequestMessage(source.validatedInstanceId, source.appId, CHART_APP.appId),
    )
    await flushAsyncDelivery()

    await vi.waitFor(() => {
      const pending = agent.getState().instances[HOST_LAUNCHER_INSTANCE_ID]
      expect(pending?.appId).toBe(CHART_APP.appId)
      expect(pending?.state).toBe("pending")
    })

    const chart = await connectWcpApp(agent, {
      connectionAttemptUuid: "edge-open-target-uuid",
      appId: "chartApp",
      identityUrl: CHART_APP.details.url,
      hostInstanceId: HOST_LAUNCHER_INSTANCE_ID,
      instanceUuid: crypto.randomUUID(),
    })

    expect(chart.validatedInstanceId).toBe(HOST_LAUNCHER_INSTANCE_ID)
    expect(agent.appConnection.getConnection(HOST_LAUNCHER_INSTANCE_ID)).toBeDefined()
  })

  it("adopts sole pending launcher id when WCP4 omits host instanceId", async () => {
    const agent = createTestAgent({ appLauncher: createHostInstanceAppLauncher() })
    activeAgents.push(agent)

    const source = await connectWcpApp(agent, {
      connectionAttemptUuid: "edge-open-source-no-id-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    await postDacpOnPort(
      source.appPort,
      createOpenRequestMessage(source.validatedInstanceId, source.appId, CHART_APP.appId),
    )
    await flushAsyncDelivery()

    await vi.waitFor(() => {
      expect(agent.getState().instances[HOST_LAUNCHER_INSTANCE_ID]?.state).toBe("pending")
    })

    const chart = await connectWcpApp(agent, {
      connectionAttemptUuid: "edge-open-target-no-id-uuid",
      appId: "chartApp",
      identityUrl: CHART_APP.details.url,
      instanceUuid: crypto.randomUUID(),
    })

    expect(chart.validatedInstanceId).toBe(HOST_LAUNCHER_INSTANCE_ID)
  })
})

describe("browser channels controller (WCP integration)", () => {
  const activeAgents: SailDesktopAgent[] = []

  afterEach(() => {
    cleanupWcpIntegrationTestHarness(activeAgents)
  })

  it("reads null app channel before any join", async () => {
    const agent = createTestAgent()
    activeAgents.push(agent)
    const channels = requireChannelsController(agent)

    const app = await connectWcpApp(agent, {
      connectionAttemptUuid: "channels-read-null-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    expect(channels.getAppChannelId(app.validatedInstanceId)).toBeNull()
    expect(channels.getAppChannel(app.validatedInstanceId)).toBeNull()
  })

  it("host changeAppChannel delivers channelChangedEvent to the app over MessagePort", async () => {
    const agent = createTestAgent()
    activeAgents.push(agent)
    const channels = requireChannelsController(agent)

    const app = await connectWcpApp(agent, {
      connectionAttemptUuid: "channels-host-change-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    await postDacpOnPort(
      app.appPort,
      createAddEventListenerMessage(app.validatedInstanceId, app.appId, "USER_CHANNEL_CHANGED"),
    )

    const channelChangedPromise = waitForChannelChangedEvent(app.appPort, CHANNEL_ID)

    await channels.changeAppChannel(app.validatedInstanceId, CHANNEL_ID)

    const channelChangedEvent = await channelChangedPromise

    expect(channelChangedEvent.type).toBe("channelChangedEvent")
    expect(channelChangedEvent.payload.currentChannelId).toBe(CHANNEL_ID)
    // `ChannelChangedEventPayload` is an `anyOf` of two mutually exclusive branches, each with
    // `additionalProperties: false`. `newChannelId` alongside `currentChannelId` fails both;
    // `channelId` and `identity` are not defined at all.
    expect(channelChangedEvent.payload).not.toHaveProperty("newChannelId")
    expect(channelChangedEvent.payload).not.toHaveProperty("channelId")
    expect(channelChangedEvent.payload).not.toHaveProperty("identity")
    expect(channels.getAppChannelId(app.validatedInstanceId)).toBe(CHANNEL_ID)
    expect(channels.getAppChannel(app.validatedInstanceId)).toMatchObject({
      id: CHANNEL_ID,
      type: "user",
    })
    expect(agent.getState().instances[app.validatedInstanceId]?.currentUserChannel).toBe(CHANNEL_ID)
  })

  it("host changeAppChannel to null leaves the channel and notifies the app", async () => {
    const agent = createTestAgent()
    activeAgents.push(agent)
    const channels = requireChannelsController(agent)

    const app = await connectWcpApp(agent, {
      connectionAttemptUuid: "channels-host-leave-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    await postDacpOnPort(
      app.appPort,
      createAddEventListenerMessage(app.validatedInstanceId, app.appId, "USER_CHANNEL_CHANGED"),
    )
    await postDacpOnPort(
      app.appPort,
      createJoinUserChannelMessage(app.validatedInstanceId, app.appId, CHANNEL_ID),
    )

    await vi.waitFor(() => {
      expect(channels.getAppChannelId(app.validatedInstanceId)).toBe(CHANNEL_ID)
    })

    const leavePromise = waitForChannelChangedEvent(app.appPort, null)

    await channels.changeAppChannel(app.validatedInstanceId, null)

    const leaveEvent = await leavePromise

    expect(leaveEvent.type).toBe("channelChangedEvent")
    expect(leaveEvent.payload.currentChannelId).toBeNull()
    expect(leaveEvent.payload).not.toHaveProperty("newChannelId")
    expect(channels.getAppChannelId(app.validatedInstanceId)).toBeNull()
    expect(channels.getAppChannel(app.validatedInstanceId)).toBeNull()
    expect(agent.getState().instances[app.validatedInstanceId]?.currentUserChannel).toBeNull()
  })

  it("getAppChannel reflects app-driven join through the same agent state path", async () => {
    const agent = createTestAgent()
    activeAgents.push(agent)
    const channels = requireChannelsController(agent)

    const app = await connectWcpApp(agent, {
      connectionAttemptUuid: "channels-app-join-read-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    await postDacpOnPort(
      app.appPort,
      createJoinUserChannelMessage(app.validatedInstanceId, app.appId, CHANNEL_ID_2),
    )

    await vi.waitFor(() => {
      expect(channels.getAppChannelId(app.validatedInstanceId)).toBe(CHANNEL_ID_2)
    })

    expect(channels.getAppChannel(app.validatedInstanceId)).toMatchObject({
      id: CHANNEL_ID_2,
      type: "user",
    })
    expect(agent.getState().instances[app.validatedInstanceId]?.currentUserChannel).toBe(
      CHANNEL_ID_2,
    )
  })

  it("onAppChannelChange notifies when the app joins a channel through its FDC3 API", async () => {
    const agent = createTestAgent()
    activeAgents.push(agent)
    const channels = requireChannelsController(agent)

    const app = await connectWcpApp(agent, {
      connectionAttemptUuid: "channels-app-driven-notify-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    const hostEvents: AppChannelChangeEvent[] = []
    channels.onAppChannelChange(event => {
      hostEvents.push(event)
    })

    await postDacpOnPort(
      app.appPort,
      createJoinUserChannelMessage(app.validatedInstanceId, app.appId, CHANNEL_ID),
    )

    await vi.waitFor(() => {
      expect(hostEvents).toHaveLength(1)
      expect(hostEvents[0]).toMatchObject({
        instanceId: app.validatedInstanceId,
        channelId: CHANNEL_ID,
        channel: { id: CHANNEL_ID, type: "user" },
      })
    })
  })

  it("onAppChannelChange notifies when the host changes the app channel", async () => {
    const agent = createTestAgent()
    activeAgents.push(agent)
    const channels = requireChannelsController(agent)

    const app = await connectWcpApp(agent, {
      connectionAttemptUuid: "channels-host-driven-notify-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    const hostEvents: AppChannelChangeEvent[] = []
    channels.onAppChannelChange(event => {
      hostEvents.push(event)
    })

    await channels.changeAppChannel(app.validatedInstanceId, CHANNEL_ID_2)

    await vi.waitFor(() => {
      expect(hostEvents).toHaveLength(1)
      expect(hostEvents[0]).toMatchObject({
        instanceId: app.validatedInstanceId,
        channelId: CHANNEL_ID_2,
        channel: { id: CHANNEL_ID_2, type: "user" },
      })
    })
  })

  it("stops delivering onAppChannelChange after unsubscribe", async () => {
    const agent = createTestAgent()
    activeAgents.push(agent)
    const channels = requireChannelsController(agent)

    const app = await connectWcpApp(agent, {
      connectionAttemptUuid: "channels-unsub-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    let notificationCount = 0
    const unsubscribe = channels.onAppChannelChange(() => {
      notificationCount += 1
    })

    await channels.changeAppChannel(app.validatedInstanceId, CHANNEL_ID)

    await vi.waitFor(() => {
      expect(notificationCount).toBe(1)
    })

    unsubscribe()

    await channels.changeAppChannel(app.validatedInstanceId, CHANNEL_ID_2)

    await flushAsyncDelivery()

    expect(notificationCount).toBe(1)
  })
})

describe("browser apps controller (WCP integration)", () => {
  const activeAgents: SailDesktopAgent[] = []

  afterEach(() => {
    cleanupWcpIntegrationTestHarness(activeAgents)
  })

  it("notifies onConnect when WCP identity validation completes", async () => {
    const agent = createTestAgent()
    activeAgents.push(agent)
    const apps = requireAppsController(agent)

    const connectEvents: AppConnectionMetadata[] = []
    apps.onConnect(metadata => {
      connectEvents.push(metadata)
    })

    const connected = await connectWcpApp(agent, {
      connectionAttemptUuid: "apps-on-connect-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    expect(connectEvents).toEqual([
      expect.objectContaining({
        instanceId: connected.validatedInstanceId,
        appId: "portfolioApp",
        connectionAttemptUuid: "apps-on-connect-uuid",
      }),
    ])
  })

  it("exposes connected instances and WCP connections after handshake", async () => {
    const agent = createTestAgent()
    activeAgents.push(agent)
    const apps = requireAppsController(agent)

    const connected = await connectWcpApp(agent, {
      connectionAttemptUuid: "apps-connected-reads-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    expect(apps.getConnection(connected.validatedInstanceId)).toMatchObject({
      instanceId: connected.validatedInstanceId,
      appId: "portfolioApp",
    })
    expect(apps.getConnections()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ instanceId: connected.validatedInstanceId }),
      ]),
    )
    expect(apps.getInstance(connected.validatedInstanceId)).toMatchObject({
      appId: "portfolioApp",
      instanceId: connected.validatedInstanceId,
      status: "connected",
    })
    expect(apps.getInstances()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          appId: "portfolioApp",
          instanceId: connected.validatedInstanceId,
          status: "connected",
        }),
      ]),
    )
    expect(agent.getState().instances[connected.validatedInstanceId]?.state).toBe(
      AppInstanceState.CONNECTED,
    )
  })

  it("notifies onDisconnect and removes instance when disconnect is called", async () => {
    const agent = createTestAgent({
      heartbeatEnabled: false,
      disconnectGracePeriod: 0,
    })
    activeAgents.push(agent)
    const apps = requireAppsController(agent)

    const disconnectedIds: string[] = []
    apps.onDisconnect(instanceId => {
      disconnectedIds.push(instanceId)
    })

    const connected = await connectWcpApp(agent, {
      connectionAttemptUuid: "apps-disconnect-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    apps.disconnect(connected.validatedInstanceId)

    expect(agent.getState().instances[connected.validatedInstanceId]).toBeUndefined()
    expect(disconnectedIds).toContain(connected.validatedInstanceId)
    expect(apps.getConnection(connected.validatedInstanceId)).toBeUndefined()
  })

  it("sends a schema-valid WCP6Goodbye (no own payload key) when disconnect is called", async () => {
    const agent = createTestAgent({
      heartbeatEnabled: false,
      disconnectGracePeriod: 0,
    })
    activeAgents.push(agent)
    const apps = requireAppsController(agent)

    const connected = await connectWcpApp(agent, {
      connectionAttemptUuid: "apps-disconnect-goodbye-shape-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    const goodbyePromise = waitForPortMessage<BrowserTypes.WebConnectionProtocol6Goodbye>(
      connected.appPort,
      data => (data as { type?: string }).type === "WCP6Goodbye",
    )

    apps.disconnect(connected.validatedInstanceId)

    const goodbye = await goodbyePromise
    expect(isValidWebConnectionProtocol6Goodbye(goodbye)).toBe(true)
    expect("payload" in goodbye).toBe(false)
  })

  it("notifies onHandshakeFailure when WCP handshake fails", () => {
    const agent = createTestAgent()
    activeAgents.push(agent)
    const apps = requireAppsController(agent)

    const failures: HandshakeFailureEvent[] = []
    apps.onHandshakeFailure(event => {
      failures.push(event)
    })

    const originalMessageChannel = global.MessageChannel
    class FailingMessageChannel {
      constructor() {
        throw new Error("MessageChannel creation failed")
      }
    }
    global.MessageChannel = FailingMessageChannel as unknown as typeof MessageChannel

    window.dispatchEvent(
      createMessageEvent(createWCP1Hello("apps-handshake-fail-uuid", PORTFOLIO_APP.details.url)),
    )

    expect(failures).toHaveLength(1)
    expect(failures[0]?.error).toBeInstanceOf(Error)
    expect(failures[0]?.connectionAttemptUuid).toBe("apps-handshake-fail-uuid")

    global.MessageChannel = originalMessageChannel
  })

  it("stops delivering onConnect after unsubscribe", async () => {
    const agent = createTestAgent()
    activeAgents.push(agent)
    const apps = requireAppsController(agent)

    let notificationCount = 0
    const unsubscribe = apps.onConnect(() => {
      notificationCount += 1
    })

    await connectWcpApp(agent, {
      connectionAttemptUuid: "apps-unsub-first-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    await vi.waitFor(() => {
      expect(notificationCount).toBe(1)
    })

    unsubscribe()

    await connectWcpApp(agent, {
      connectionAttemptUuid: "apps-unsub-second-uuid",
      appId: "chartApp",
      identityUrl: CHART_APP.details.url,
    })

    await flushAsyncDelivery()

    expect(notificationCount).toBe(1)
  })
})
