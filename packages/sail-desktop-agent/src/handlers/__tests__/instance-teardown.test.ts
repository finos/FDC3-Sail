import { afterEach, describe, expect, it, vi } from "vite-plus/test"
import type { BrowserTypes, Context } from "@finos/fdc3"
import { OpenError } from "@finos/fdc3"
import { cleanupInstanceDacpState } from "../instance-teardown"
import { startHeartbeat } from "../heartbeat/handlers"
import {
  clearAllHeartbeatTimersForTesting,
  getActiveHeartbeatTimerCount,
} from "../heartbeat/runtime"
import {
  linkHandshakeRoutingId,
  clearHandshakeRoutingIdsForInstance,
} from "../../state/mutators/wcp-handshake-routing"
import {
  resolveLinkedInstanceId,
  resolveInstanceId,
} from "../../state/selectors/wcp-handshake-routing"
import { registerOpenWithContext } from "../utils/open-with-context"
import {
  clearAllPendingOpenWithContextTimeoutsForTesting,
  getPendingOpenWithContextTimeoutCount,
} from "../utils/open-with-context"
import { connectInstance, addPendingIntent, updateInstanceState } from "../../state/mutators"
import { AppInstanceState, type AgentState } from "../../state/types"
import { createInitialState } from "../../state/initial-state"
import {
  clearAllPendingIntentTimeoutsForTesting,
  getActivePendingIntentTimeoutCount,
  registerPendingIntentTimeout,
} from "../intents/intent-pending-timeout-registry"
import { DEFAULT_FDC3_USER_CHANNELS } from "../../agent/default-user-channels"
import { createDACPTestParams } from "./test-params"
import { withResponseDispatcher } from "./test-params"
import { createDesktopAgentWithTestConnection } from "../../../test/support/desktop-agent-test-harness"
import { MockTransport } from "../../__tests__/utils/mock-transport"
import { MockTransport as CucumberMockTransport } from "../../../test/support/mock-transport"

const TEST_WCP_DIRECTORY_APP = {
  appId: "test-app",
  title: "Test App",
  type: "web" as const,
  details: { url: "https://example.com/app" },
}

afterEach(() => {
  clearAllPendingOpenWithContextTimeoutsForTesting()
  clearAllHeartbeatTimersForTesting()
  clearAllPendingIntentTimeoutsForTesting()
  vi.useRealTimers()
})

describe("wcp handshake routing state contract", () => {
  it("resolveLinkedInstanceId returns linked instanceId for a handshake routing id", () => {
    let state = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
    state = linkHandshakeRoutingId(state, "temp-resolver-contract", "validated-resolver-contract")

    expect(resolveLinkedInstanceId(state, "temp-resolver-contract")).toBe(
      "validated-resolver-contract",
    )
    expect(resolveLinkedInstanceId(state, "temp-unlinked")).toBeUndefined()
    expect(resolveInstanceId(state, "temp-unlinked")).toBe("temp-unlinked")
  })

  it("clearHandshakeRoutingIdsForInstance removes all routing entries for the instanceId", () => {
    let state = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
    state = linkHandshakeRoutingId(state, "temp-unlink-a", "validated-unlink-target")
    state = linkHandshakeRoutingId(state, "temp-unlink-b", "validated-unlink-target")

    state = clearHandshakeRoutingIdsForInstance(state, "validated-unlink-target")

    expect(resolveLinkedInstanceId(state, "temp-unlink-a")).toBeUndefined()
    expect(resolveLinkedInstanceId(state, "temp-unlink-b")).toBeUndefined()
  })

  it("MockTransport.registerWcp5Mapping mirrors routing links via onHandshakeRoutingLinked", () => {
    const transport = new CucumberMockTransport()
    let state = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
    transport.onHandshakeRoutingLinked = (handshakeRoutingId, instanceId) => {
      state = linkHandshakeRoutingId(state, handshakeRoutingId, instanceId)
    }

    const tempConnectionId = "temp-cucumber-wcp5"
    const validatedInstanceId = "validated-cucumber-wcp5"

    transport.registerWcp5Mapping(tempConnectionId, validatedInstanceId)

    expect(resolveLinkedInstanceId(state, tempConnectionId)).toBe(validatedInstanceId)
    expect(transport.resolveWcp5InstanceId(tempConnectionId)).toBe(validatedInstanceId)
  })
})

function connectTestInstance(instanceId: string): AgentState {
  let state = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
  state = connectInstance(state, {
    instanceId,
    appId: "TestApp",
    metadata: { name: "TestApp" },
  })
  return updateInstanceState(state, instanceId, AppInstanceState.CONNECTED)
}

function createHeartbeatTestContext(options: Parameters<typeof createDACPTestParams>[0]) {
  const { params, getState } = createDACPTestParams(options)
  return {
    params: withResponseDispatcher(params, new MockTransport()),
    getState,
  }
}

function expectHeartbeatFullyCleared(getState: () => AgentState, instanceId: string): void {
  expect(getActiveHeartbeatTimerCount()).toBe(0)
  expect(getState().heartbeats[instanceId]).toBeUndefined()
}

describe("cleanupInstanceDacpState", () => {
  it("clears pending intents and their timeouts when the raising instance disconnects", () => {
    const timeoutHandle = setTimeout(() => {}, 60_000)
    registerPendingIntentTimeout("req-source-disconnect", "raise", timeoutHandle)

    let state = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
    state = connectInstance(state, {
      instanceId: "a1",
      appId: "App1",
      metadata: { name: "App1" },
    })
    state = connectInstance(state, {
      instanceId: "l1",
      appId: "portfolioApp",
      metadata: { name: "portfolioApp" },
    })
    state = updateInstanceState(state, "a1", AppInstanceState.CONNECTED)
    state = updateInstanceState(state, "l1", AppInstanceState.CONNECTED)
    state = addPendingIntent(state, {
      requestId: "req-source-disconnect",
      intentName: "ViewPortfolio",
      context: { type: "fdc3.portfolio" },
      sourceInstanceId: "a1",
      targetInstanceId: "l1",
      targetAppId: "portfolioApp",
      requestType: "raiseIntentRequest",
    })

    const { params, getState } = createDACPTestParams({
      instanceId: "a1",
      initialState: state,
    })

    cleanupInstanceDacpState(params)

    expect(Object.keys(getState().intents.pending)).toHaveLength(0)
    expect(getActivePendingIntentTimeoutCount()).toBe(0)
  })

  it("clears pending intents when the target instance disconnects", () => {
    let state = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
    state = connectInstance(state, {
      instanceId: "a1",
      appId: "App1",
      metadata: { name: "App1" },
    })
    state = connectInstance(state, {
      instanceId: "l1",
      appId: "portfolioApp",
      metadata: { name: "portfolioApp" },
    })
    state = addPendingIntent(state, {
      requestId: "req-target-disconnect",
      intentName: "ViewPortfolio",
      context: { type: "fdc3.portfolio" },
      sourceInstanceId: "a1",
      targetInstanceId: "l1",
      targetAppId: "portfolioApp",
      requestType: "raiseIntentRequest",
    })

    const { params, getState } = createDACPTestParams({
      instanceId: "l1",
      initialState: state,
    })

    cleanupInstanceDacpState(params)

    expect(Object.keys(getState().intents.pending)).toHaveLength(0)
    expect(getActivePendingIntentTimeoutCount()).toBe(0)
  })

  it("sends AppTimeout openResponse to source when the target instance disconnects during pending open", () => {
    let state = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
    state = connectInstance(state, {
      instanceId: "a1",
      appId: "portfolioApp",
      metadata: { name: "portfolioApp" },
    })
    state = connectInstance(state, {
      instanceId: "uuid-0",
      appId: "chartApp",
      metadata: { name: "chartApp" },
    })
    state = updateInstanceState(state, "a1", AppInstanceState.CONNECTED)
    state = updateInstanceState(state, "uuid-0", AppInstanceState.CONNECTED)

    const transport = new MockTransport()
    const { params, getState } = createDACPTestParams({
      instanceId: "a1",
      initialState: state,
    })
    const contextWithTransport = withResponseDispatcher(params, transport)

    const launchContext: Context = {
      type: "fdc3.instrument",
      id: { ticker: "AAPL" },
    }

    const requestUuid = "open-req-target-disconnect"
    const message = {
      type: "openRequest",
      meta: {
        requestUuid,
        timestamp: new Date(),
      },
      payload: {
        app: { appId: "chartApp", instanceId: "uuid-0" },
        context: launchContext,
      },
    } as BrowserTypes.OpenRequest

    registerOpenWithContext(
      message,
      { appId: "chartApp", instanceId: "uuid-0" },
      launchContext,
      contextWithTransport,
    )

    expect(getState().open.pendingWithContext["uuid-0"]?.length).toBe(1)
    expect(getPendingOpenWithContextTimeoutCount()).toBe(1)

    cleanupInstanceDacpState({ ...contextWithTransport, instanceId: "uuid-0" })

    expect(getState().open.pendingWithContext["uuid-0"]).toBeUndefined()
    expect(getPendingOpenWithContextTimeoutCount()).toBe(0)

    const openErrorResponses = transport.sentMessages.filter(message => {
      const typed = message as {
        type?: string
        meta?: { requestUuid?: string }
        payload?: { error?: string }
      }
      return typed.type === "openResponse" && typed.payload?.error !== undefined
    })
    expect(openErrorResponses).toHaveLength(1)
    expect(openErrorResponses[0]).toMatchObject({
      type: "openResponse",
      meta: { requestUuid },
      payload: { error: OpenError.AppTimeout },
    })
  })

  it("sends AppTimeout openResponse to source when source disconnects during pending open", () => {
    let state = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
    state = connectInstance(state, {
      instanceId: "a1",
      appId: "launcherApp",
      metadata: { name: "launcherApp" },
    })
    state = connectInstance(state, {
      instanceId: "uuid-0",
      appId: "chartApp",
      metadata: { name: "chartApp" },
    })
    state = updateInstanceState(state, "a1", AppInstanceState.CONNECTED)
    state = updateInstanceState(state, "uuid-0", AppInstanceState.CONNECTED)

    const transport = new MockTransport()
    const { params, getState } = createDACPTestParams({
      instanceId: "a1",
      initialState: state,
    })
    const contextWithTransport = withResponseDispatcher(params, transport)

    const launchContext: Context = {
      type: "fdc3.instrument",
      id: { ticker: "AAPL" },
    }

    const requestUuid = "open-req-source-disconnect"
    const message = {
      type: "openRequest",
      meta: {
        requestUuid,
        timestamp: new Date(),
      },
      payload: {
        app: { appId: "chartApp", instanceId: "uuid-0" },
        context: launchContext,
      },
    } as BrowserTypes.OpenRequest

    registerOpenWithContext(
      message,
      { appId: "chartApp", instanceId: "uuid-0" },
      launchContext,
      contextWithTransport,
    )

    expect(getState().open.pendingWithContext["uuid-0"]?.length).toBe(1)
    expect(getPendingOpenWithContextTimeoutCount()).toBe(1)

    cleanupInstanceDacpState(contextWithTransport)

    expect(getState().open.pendingWithContext["uuid-0"]).toBeUndefined()
    expect(getPendingOpenWithContextTimeoutCount()).toBe(0)

    const openErrorResponses = transport.sentMessages.filter(message => {
      const typed = message as {
        type?: string
        meta?: { requestUuid?: string }
        payload?: { error?: string }
      }
      return typed.type === "openResponse" && typed.payload?.error !== undefined
    })
    expect(openErrorResponses).toHaveLength(1)
    expect(openErrorResponses[0]).toMatchObject({
      type: "openResponse",
      meta: { requestUuid },
      payload: { error: OpenError.AppTimeout },
    })
  })

  it("does not send openResponse when source disconnects with no pending open-with-context", () => {
    let state = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
    state = connectInstance(state, {
      instanceId: "a1",
      appId: "launcherApp",
      metadata: { name: "launcherApp" },
    })
    state = updateInstanceState(state, "a1", AppInstanceState.CONNECTED)

    const transport = new MockTransport()
    const { params } = createDACPTestParams({
      instanceId: "a1",
      initialState: state,
    })
    const contextWithTransport = withResponseDispatcher(params, transport)

    cleanupInstanceDacpState(contextWithTransport)

    const openResponses = transport.sentMessages.filter(message => {
      const typed = message as { type?: string }
      return typed.type === "openResponse"
    })
    expect(openResponses).toHaveLength(0)
  })

  describe("errorMessage contract: plain open vs open-with-context, target vs source disconnect", () => {
    // A pending plain open() (no launch context) times out with a different human-readable
    // message than a pending open-with-context: "waiting for app to connect" (plain) vs
    // "waiting for context listener" (with-context). Both must report that distinction on
    // *both* disconnect paths (target instance going away, source instance going away), while
    // errorType stays OpenError.AppTimeout on all four paths.
    const withContextLaunch: Context = { type: "fdc3.instrument", id: { ticker: "AAPL" } }

    it.each([
      {
        label: "plain open cleared by TARGET disconnect",
        launchContext: undefined,
        disconnectSide: "target" as const,
        expectedMessage: "Timed out waiting for app to connect",
      },
      {
        label: "open-with-context cleared by TARGET disconnect",
        launchContext: withContextLaunch,
        disconnectSide: "target" as const,
        expectedMessage: "Timed out waiting for context listener",
      },
      {
        label: "plain open cleared by SOURCE disconnect",
        launchContext: undefined,
        disconnectSide: "source" as const,
        expectedMessage: "Timed out waiting for app to connect",
      },
      {
        label: "open-with-context cleared by SOURCE disconnect",
        launchContext: withContextLaunch,
        disconnectSide: "source" as const,
        expectedMessage: "Timed out waiting for context listener",
      },
    ])("$label reports errorType AppTimeout and errorMessage $expectedMessage", data => {
      const { launchContext, disconnectSide, expectedMessage } = data
      let state = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
      state = connectInstance(state, {
        instanceId: "a1",
        appId: "launcherApp",
        metadata: { name: "launcherApp" },
      })
      state = connectInstance(state, {
        instanceId: "uuid-0",
        appId: "chartApp",
        metadata: { name: "chartApp" },
      })
      state = updateInstanceState(state, "a1", AppInstanceState.CONNECTED)
      // Plain open's fast path treats an already-CONNECTED target as immediately usable, so it
      // must stay PENDING here to actually go through the pending/timeout path this test pins.
      // With-context readiness instead hinges on a matching context listener, so CONNECTED is
      // fine (and matches the existing target/source-disconnect tests above).
      if (launchContext) {
        state = updateInstanceState(state, "uuid-0", AppInstanceState.CONNECTED)
      }

      const transport = new MockTransport()
      const { params, getState } = createDACPTestParams({
        instanceId: "a1",
        initialState: state,
      })
      const contextWithTransport = withResponseDispatcher(params, transport)

      const requestUuid = `open-req-${disconnectSide}-${launchContext ? "context" : "plain"}`
      const message = {
        type: "openRequest",
        meta: {
          requestUuid,
          timestamp: new Date(),
        },
        payload: {
          app: { appId: "chartApp", instanceId: "uuid-0" },
          ...(launchContext ? { context: launchContext } : {}),
        },
      } as BrowserTypes.OpenRequest

      registerOpenWithContext(
        message,
        { appId: "chartApp", instanceId: "uuid-0" },
        launchContext,
        contextWithTransport,
      )

      expect(getState().open.pendingWithContext["uuid-0"]?.length).toBe(1)

      const disconnectingInstanceId = disconnectSide === "target" ? "uuid-0" : "a1"
      cleanupInstanceDacpState({ ...contextWithTransport, instanceId: disconnectingInstanceId })

      const openErrorResponse = transport.sentMessages.find(sent => {
        const typed = sent as { type?: string; meta?: { requestUuid?: string } }
        return typed.type === "openResponse" && typed.meta?.requestUuid === requestUuid
      }) as { payload?: { error?: string; message?: string } } | undefined

      expect(openErrorResponse).toBeDefined()
      expect(openErrorResponse?.payload?.error).toBe(OpenError.AppTimeout)
      expect(openErrorResponse?.payload?.message).toBe(expectedMessage)
    })
  })
})

describe("heartbeat cleanup on disconnect", () => {
  it("cleanupInstanceDacpState clears active heartbeat interval and state entry", () => {
    const instanceId = "instance-cleanup-dacp"
    const initialState = connectTestInstance(instanceId)
    const { params, getState } = createHeartbeatTestContext({ instanceId, initialState })

    startHeartbeat(instanceId, params)
    expect(getActiveHeartbeatTimerCount()).toBe(1)
    expect(getState().heartbeats[instanceId]).toBeDefined()

    cleanupInstanceDacpState(params)

    expectHeartbeatFullyCleared(getState, instanceId)
  })

  it("cleanupInstanceDacpState clears active heartbeat interval and state entry (WCP6 teardown path)", () => {
    const instanceId = "instance-wcp6-goodbye"
    const initialState = connectTestInstance(instanceId)
    const { params, getState } = createHeartbeatTestContext({ instanceId, initialState })

    startHeartbeat(instanceId, params)
    expect(getActiveHeartbeatTimerCount()).toBe(1)
    expect(getState().heartbeats[instanceId]).toBeDefined()

    cleanupInstanceDacpState(params)

    expectHeartbeatFullyCleared(getState, instanceId)
  })

  it("heartbeat timeout clears active heartbeat interval and state entry", () => {
    vi.useFakeTimers()
    const instanceId = "instance-heartbeat-timeout"
    const initialState = connectTestInstance(instanceId)
    const { params, getState } = createHeartbeatTestContext({ instanceId, initialState })

    startHeartbeat(instanceId, params)
    expect(getActiveHeartbeatTimerCount()).toBe(1)
    expect(getState().heartbeats[instanceId]).toBeDefined()

    vi.advanceTimersByTime(2500)

    expectHeartbeatFullyCleared(getState, instanceId)
  })

  it("DesktopAgent.disconnectInstance clears active heartbeat interval and state entry", async () => {
    const { agent, connection } = createDesktopAgentWithTestConnection({
      apps: [TEST_WCP_DIRECTORY_APP],
      heartbeatIntervalMs: 500,
      heartbeatTimeoutMs: 2000,
    })

    const wcp4Message = {
      type: "WCP4ValidateAppIdentity",
      payload: {
        identityUrl: "https://example.com/app",
        actualUrl: "https://example.com/app",
      },
      meta: {
        connectionAttemptUuid: "heartbeat-disconnect-uuid",
        timestamp: new Date().toISOString(),
      },
    } as unknown as BrowserTypes.WebConnectionProtocol4ValidateAppIdentity

    await connection.receiveMessage(wcp4Message, { messageOrigin: "https://example.com" })

    const wcp5Response = connection.sentMessages.find(
      message => (message as { type?: string }).type === "WCP5ValidateAppIdentityResponse",
    ) as { payload?: { instanceId?: string } } | undefined
    const validatedInstanceId = wcp5Response?.payload?.instanceId
    expect(validatedInstanceId).toBeDefined()

    expect(getActiveHeartbeatTimerCount()).toBe(1)
    expect(agent.getState().heartbeats[validatedInstanceId!]).toBeDefined()

    agent.disconnectInstance(validatedInstanceId!)

    expectHeartbeatFullyCleared(() => agent.getState(), validatedInstanceId!)
  })

  it("stops heartbeat on validated instanceId when cleanup runs from WCP4 temp context", () => {
    const tempInstanceId = "temp-wcp4-attempt"
    const validatedInstanceId = "validated-wcp5-instance"
    const initialState = connectTestInstance(validatedInstanceId)
    const { params, getState } = createHeartbeatTestContext({
      instanceId: tempInstanceId,
      initialState,
    })

    startHeartbeat(validatedInstanceId, params)
    expect(getActiveHeartbeatTimerCount()).toBe(1)
    expect(getState().heartbeats[validatedInstanceId]).toBeDefined()

    cleanupInstanceDacpState(params)

    expectHeartbeatFullyCleared(getState, validatedInstanceId)
  })

  it("heartbeat timeout stops heartbeat on validated instanceId when WCP4 temp context was used", () => {
    vi.useFakeTimers()
    const tempInstanceId = "temp-wcp4-timeout"
    const validatedInstanceId = "validated-wcp5-timeout"
    const initialState = connectTestInstance(validatedInstanceId)
    const { params, getState } = createHeartbeatTestContext({
      instanceId: tempInstanceId,
      initialState,
    })

    startHeartbeat(validatedInstanceId, params)
    expect(getActiveHeartbeatTimerCount()).toBe(1)
    expect(getState().heartbeats[validatedInstanceId]).toBeDefined()

    vi.advanceTimersByTime(2500)

    expectHeartbeatFullyCleared(getState, validatedInstanceId)
  })

  it("cleanupInstanceDacpState clears heartbeat when invoked with WCP4 temp context id", () => {
    const tempInstanceId = "temp-wcp4-direct-cleanup"
    const validatedInstanceId = "validated-wcp5-direct-cleanup"
    const initialState = connectTestInstance(validatedInstanceId)
    const { params, getState } = createHeartbeatTestContext({
      instanceId: tempInstanceId,
      initialState,
    })

    startHeartbeat(validatedInstanceId, params)
    expect(getActiveHeartbeatTimerCount()).toBe(1)
    expect(getState().heartbeats[validatedInstanceId]).toBeDefined()

    cleanupInstanceDacpState(params)

    expectHeartbeatFullyCleared(getState, validatedInstanceId)
  })

  it("DesktopAgent.disconnectInstance clears heartbeat when called with WCP4 connectionAttemptUuid", async () => {
    const { agent, connection } = createDesktopAgentWithTestConnection({
      apps: [TEST_WCP_DIRECTORY_APP],
      heartbeatIntervalMs: 500,
      heartbeatTimeoutMs: 2000,
    })

    const connectionAttemptUuid = "temp-disconnect-by-attempt-uuid"
    const wcp4Message = {
      type: "WCP4ValidateAppIdentity",
      payload: {
        identityUrl: "https://example.com/app",
        actualUrl: "https://example.com/app",
      },
      meta: {
        connectionAttemptUuid,
        timestamp: new Date().toISOString(),
      },
    } as unknown as BrowserTypes.WebConnectionProtocol4ValidateAppIdentity

    await connection.receiveMessage(wcp4Message, { messageOrigin: "https://example.com" })

    const wcp5Response = connection.sentMessages.find(
      message => (message as { type?: string }).type === "WCP5ValidateAppIdentityResponse",
    ) as { payload?: { instanceId?: string } } | undefined
    const validatedInstanceId = wcp5Response?.payload?.instanceId
    expect(validatedInstanceId).toBeDefined()

    expect(getActiveHeartbeatTimerCount()).toBe(1)
    expect(agent.getState().heartbeats[validatedInstanceId!]).toBeDefined()

    agent.disconnectInstance(`temp-${connectionAttemptUuid}`)

    expectHeartbeatFullyCleared(() => agent.getState(), validatedInstanceId!)
  })

  it("app connection disconnect clears all active heartbeat timers and state entries", async () => {
    const { agent, connection } = createDesktopAgentWithTestConnection({
      apps: [TEST_WCP_DIRECTORY_APP],
      heartbeatIntervalMs: 500,
      heartbeatTimeoutMs: 2000,
    })

    const wcp4Message = {
      type: "WCP4ValidateAppIdentity",
      payload: {
        identityUrl: "https://example.com/app",
        actualUrl: "https://example.com/app",
      },
      meta: {
        connectionAttemptUuid: "transport-disconnect-uuid",
        timestamp: new Date().toISOString(),
      },
    } as unknown as BrowserTypes.WebConnectionProtocol4ValidateAppIdentity

    await connection.receiveMessage(wcp4Message, { messageOrigin: "https://example.com" })

    const wcp5Response = connection.sentMessages.find(
      message => (message as { type?: string }).type === "WCP5ValidateAppIdentityResponse",
    ) as { payload?: { instanceId?: string } } | undefined
    const validatedInstanceId = wcp5Response?.payload?.instanceId
    expect(validatedInstanceId).toBeDefined()
    expect(getActiveHeartbeatTimerCount()).toBe(1)

    connection.disconnect()

    expectHeartbeatFullyCleared(() => agent.getState(), validatedInstanceId!)
  })

  it("duplicate WCP6Goodbye for a closed instance does not clean up another connected app", () => {
    const closedMockInstanceId = "mock-app-closed"
    const conformanceInstanceId = "conformance1-still-open"

    let state = connectTestInstance(closedMockInstanceId)
    state = connectTestInstance(conformanceInstanceId)
    state = updateInstanceState(state, conformanceInstanceId, AppInstanceState.CONNECTED)

    const { params: mockContext, getState } = createHeartbeatTestContext({
      instanceId: closedMockInstanceId,
      initialState: state,
    })
    const { params: conformanceContext } = createHeartbeatTestContext({
      instanceId: conformanceInstanceId,
      initialState: state,
    })

    startHeartbeat(closedMockInstanceId, mockContext)
    startHeartbeat(conformanceInstanceId, conformanceContext)
    expect(getActiveHeartbeatTimerCount()).toBe(2)

    cleanupInstanceDacpState(mockContext)
    expect(getState().instances[closedMockInstanceId]).toBeUndefined()
    expect(getState().instances[conformanceInstanceId]).toBeDefined()
    expect(getActiveHeartbeatTimerCount()).toBe(1)

    cleanupInstanceDacpState(mockContext)

    expect(getState().instances[conformanceInstanceId]).toBeDefined()
    expect(getState().heartbeats[conformanceInstanceId]).toBeDefined()
    expect(getActiveHeartbeatTimerCount()).toBe(1)
  })

  it("cleanupInstanceDacpState removes validated instance state when invoked with WCP4 temp context after WCP5 link without heartbeat", () => {
    const tempInstanceId = "temp-wcp5-no-heartbeat-cleanup"
    const validatedInstanceId = "validated-wcp5-no-heartbeat-cleanup"
    let initialState = connectTestInstance(validatedInstanceId)
    initialState = linkHandshakeRoutingId(initialState, tempInstanceId, validatedInstanceId)

    const { params, getState } = createHeartbeatTestContext({
      instanceId: tempInstanceId,
      initialState,
    })

    expect(getState().instances[validatedInstanceId]).toBeDefined()
    expect(getActiveHeartbeatTimerCount()).toBe(0)

    cleanupInstanceDacpState(params)

    expect(getState().instances[validatedInstanceId]).toBeUndefined()
  })

  it("cleanupInstanceDacpState clears only the targeted heartbeat when multiple instances are connected and WCP4 temp context is used", () => {
    const tempInstanceId = "temp-wcp4-multi"
    const validatedInstanceId = "validated-wcp5-multi"
    const otherInstanceId = "other-connected-instance"

    let state = connectTestInstance(validatedInstanceId)
    state = connectTestInstance(otherInstanceId)
    state = updateInstanceState(state, otherInstanceId, AppInstanceState.CONNECTED)

    const { params: targetContext, getState: getTargetState } = createHeartbeatTestContext({
      instanceId: tempInstanceId,
      initialState: state,
    })
    const { params: otherContext } = createHeartbeatTestContext({
      instanceId: otherInstanceId,
      initialState: state,
    })

    startHeartbeat(validatedInstanceId, targetContext)
    startHeartbeat(otherInstanceId, otherContext)
    expect(getActiveHeartbeatTimerCount()).toBe(2)

    cleanupInstanceDacpState(targetContext)

    expect(getActiveHeartbeatTimerCount()).toBe(1)
    expect(getTargetState().heartbeats[validatedInstanceId]).toBeUndefined()
    expect(getTargetState().heartbeats[otherInstanceId]).toBeDefined()
  })
})
