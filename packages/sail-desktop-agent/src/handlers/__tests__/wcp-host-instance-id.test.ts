import { afterEach, describe, expect, it, vi } from "vite-plus/test"
import type { AppLauncher } from "../../host-contracts/app-launcher"
import type { BrowserTypes, Context } from "@finos/fdc3"
import { OpenError } from "@finos/fdc3"
import { createDesktopAgentWithTestConnection } from "../../../test/support/desktop-agent-test-harness"
import type {
  DacpTestAppConnection,
  Wcp4TestInputs,
} from "../../../test/support/dacp-test-app-connection"
import { DEFAULT_FDC3_USER_CHANNELS } from "../../agent/default-user-channels"
import { connectInstance, updateInstanceState } from "../../state/mutators"
import { AppInstanceState } from "../../state/types"
import { createInitialState } from "../../state/initial-state"
import { getInstance } from "../../state/selectors"
import { clearAllPendingOpenWithContextTimeoutsForTesting } from "../utils/open-with-context"
import { clearAllHeartbeatTimersForTesting } from "../heartbeat/runtime"

const HOST_INSTANCE_ID = "uuid-0"
const SOURCE_INSTANCE_ID = "a1"
const APP_URL = "https://example.com/chart"

const CHART_APP = {
  appId: "chartApp",
  title: "Chart App",
  type: "web" as const,
  details: { url: APP_URL },
}

const PORTFOLIO_APP = {
  appId: "portfolioApp",
  title: "Portfolio App",
  type: "web" as const,
  details: { url: "https://example.com/portfolio" },
}

const LAUNCH_CONTEXT: Context = {
  type: "fdc3.instrument",
  id: { ticker: "AAPL" },
}

function createHostInstanceAppLauncher(): AppLauncher {
  let launchCount = 0
  return {
    launch(request) {
      const instanceId = request.app.instanceId ?? `uuid-${launchCount++}`
      return Promise.resolve({ appId: request.app.appId, instanceId })
    },
  }
}

function createAgentWithSourceInstance(options?: { openContextListenerTimeoutMs?: number }) {
  const initialState = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
  const stateWithSource = updateInstanceState(
    connectInstance(initialState, {
      instanceId: SOURCE_INSTANCE_ID,
      appId: PORTFOLIO_APP.appId,
      metadata: { name: PORTFOLIO_APP.appId },
    }),
    SOURCE_INSTANCE_ID,
    AppInstanceState.CONNECTED,
  )

  return createDesktopAgentWithTestConnection({
    apps: [CHART_APP, PORTFOLIO_APP],
    appLauncher: createHostInstanceAppLauncher(),
    initialState: stateWithSource,
    openContextListenerTimeoutMs: options?.openContextListenerTimeoutMs ?? 5000,
    heartbeatIntervalMs: 5000,
    heartbeatTimeoutMs: 15000,
  })
}

function createWcp4FirstConnectMessage(
  connectionAttemptUuid: string,
  hostInstanceId?: string,
  hostInstanceUuid?: string,
): [BrowserTypes.WebConnectionProtocol4ValidateAppIdentity, Wcp4TestInputs] {
  const message = {
    type: "WCP4ValidateAppIdentity",
    payload: {
      identityUrl: APP_URL,
      actualUrl: APP_URL,
      ...(hostInstanceId ? { instanceId: hostInstanceId } : {}),
      ...(hostInstanceUuid !== undefined ? { instanceUuid: hostInstanceUuid } : {}),
    },
    meta: {
      connectionAttemptUuid,
      timestamp: new Date().toISOString(),
    },
  } as unknown as BrowserTypes.WebConnectionProtocol4ValidateAppIdentity
  const sourceWindow = hostInstanceId ? { hostPanel: hostInstanceId } : { hostPanel: "anonymous" }
  return [message, { sourceWindow, messageOrigin: new URL(APP_URL).origin }]
}

function createOpenRequestMessage(context?: Context): BrowserTypes.OpenRequest {
  return {
    type: "openRequest",
    meta: {
      requestUuid: "open-req-host-instance",
      timestamp: new Date(),
      source: {
        appId: PORTFOLIO_APP.appId,
        instanceId: SOURCE_INSTANCE_ID,
      },
    },
    payload: {
      app: { appId: CHART_APP.appId },
      context,
    },
  }
}

function createFindInstancesMessage(): BrowserTypes.FindInstancesRequest {
  return {
    type: "findInstancesRequest",
    meta: {
      requestUuid: "find-instances-req",
      timestamp: new Date(),
      source: {
        appId: PORTFOLIO_APP.appId,
        instanceId: SOURCE_INSTANCE_ID,
      },
    },
    payload: {
      app: { appId: CHART_APP.appId },
    },
  }
}

function createAddContextListenerMessage(
  targetInstanceId: string,
  contextType: string,
): BrowserTypes.AddContextListenerRequest {
  return {
    type: "addContextListenerRequest",
    meta: {
      requestUuid: "listener-req-1",
      timestamp: new Date(),
      source: {
        appId: CHART_APP.appId,
        instanceId: targetInstanceId,
      },
    },
    payload: {
      channelId: null,
      contextType,
    },
  }
}

function getWcp5InstanceId(connection: DacpTestAppConnection): string {
  const response = connection.sentMessages.find(
    message => (message as { type?: string }).type === "WCP5ValidateAppIdentityResponse",
  ) as { payload?: { instanceId?: string } } | undefined
  expect(response?.payload?.instanceId).toBeDefined()
  return response!.payload!.instanceId!
}

afterEach(() => {
  clearAllHeartbeatTimersForTesting()
  clearAllPendingOpenWithContextTimeoutsForTesting()
  vi.useRealTimers()
})

describe("host-assigned instanceId at WCP4", () => {
  it("registers launcher instanceId as pending instance when openRequest launches an app", async () => {
    const { agent, connection } = createAgentWithSourceInstance()

    await connection.receiveMessage(createOpenRequestMessage())

    const hostInstance = getInstance(agent.getState(), HOST_INSTANCE_ID)
    expect(hostInstance).toBeDefined()
    expect(hostInstance?.appId).toBe(CHART_APP.appId)
    expect(hostInstance?.state).toBe(AppInstanceState.PENDING)
  })

  it("includes launcher pre-registered instanceId in findInstances before WCP validation completes", async () => {
    const { connection } = createAgentWithSourceInstance()

    await connection.receiveMessage(createOpenRequestMessage())
    connection.outbound.clear()

    await connection.receiveMessage(createFindInstancesMessage())

    const response = connection.getLastMessage()?.msg as {
      type: string
      payload?: { appIdentifiers?: Array<{ appId: string; instanceId?: string }> }
    }
    expect(response.type).toBe("findInstancesResponse")
    expect(response.payload?.appIdentifiers).toEqual(
      expect.arrayContaining([{ appId: CHART_APP.appId, instanceId: HOST_INSTANCE_ID }]),
    )
  })

  it("adopts host-assigned instanceId as validated WCP5 id on first WCP4 validation", async () => {
    const initialState = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
    const stateWithInstances = updateInstanceState(
      connectInstance(
        connectInstance(initialState, {
          instanceId: SOURCE_INSTANCE_ID,
          appId: PORTFOLIO_APP.appId,
          metadata: { name: PORTFOLIO_APP.appId },
        }),
        {
          instanceId: HOST_INSTANCE_ID,
          appId: CHART_APP.appId,
          metadata: { name: CHART_APP.appId },
        },
      ),
      SOURCE_INSTANCE_ID,
      AppInstanceState.CONNECTED,
    )

    const { agent, connection } = createDesktopAgentWithTestConnection({
      apps: [CHART_APP, PORTFOLIO_APP],
      appLauncher: createHostInstanceAppLauncher(),
      initialState: stateWithInstances,
      heartbeatIntervalMs: 5000,
      heartbeatTimeoutMs: 15000,
    })

    await connection.receiveMessage(
      ...createWcp4FirstConnectMessage("wcp4-host-bind", HOST_INSTANCE_ID, "host-instance-uuid"),
    )

    expect(getWcp5InstanceId(connection)).toBe(HOST_INSTANCE_ID)
    expect(getInstance(agent.getState(), HOST_INSTANCE_ID)).toBeDefined()
    expect(
      Object.values(agent.getState().instances).filter(
        instance => instance.appId === CHART_APP.appId,
      ),
    ).toHaveLength(1)
  })

  it("adopts host-assigned instanceId when WCP4 omits instanceUuid on first connect", async () => {
    const initialState = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
    const stateWithInstances = connectInstance(initialState, {
      instanceId: HOST_INSTANCE_ID,
      appId: CHART_APP.appId,
      metadata: { name: CHART_APP.appId },
    })

    const { agent, connection } = createDesktopAgentWithTestConnection({
      apps: [CHART_APP],
      initialState: stateWithInstances,
      heartbeatIntervalMs: 5000,
      heartbeatTimeoutMs: 15000,
    })

    await connection.receiveMessage(
      ...createWcp4FirstConnectMessage("wcp4-host-first-connect", HOST_INSTANCE_ID),
    )

    const wcp5 = connection.sentMessages.find(
      message => (message as { type?: string }).type === "WCP5ValidateAppIdentityResponse",
    ) as { payload?: { instanceId?: string; instanceUuid?: string } } | undefined

    expect(wcp5?.payload?.instanceId).toBe(HOST_INSTANCE_ID)
    expect(wcp5?.payload?.instanceUuid).toBeTruthy()
    expect(getInstance(agent.getState(), HOST_INSTANCE_ID)?.state).toBe(AppInstanceState.CONNECTED)
  })

  it("delivers open-with-context when target adopts host instanceId at WCP4", async () => {
    // Scoped to timers only: faking `Date` breaks the vendor FDC3 schema validator's
    // `typ === Date` reference-identity check (it captures the real `Date` ctor at module
    // load, so a faked global Date can never match), spuriously WARNing on every WCP4/DACP
    // message validated while fake timers are active. This test only needs setTimeout control
    // for vi.advanceTimersByTime below, not a frozen Date.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"] })
    const { agent, connection } = createAgentWithSourceInstance({
      openContextListenerTimeoutMs: 2000,
    })

    await connection.receiveMessage(createOpenRequestMessage(LAUNCH_CONTEXT))

    expect(getInstance(agent.getState(), HOST_INSTANCE_ID)).toBeDefined()
    expect(agent.getState().open.pendingWithContext[HOST_INSTANCE_ID]?.length).toBe(1)

    await connection.receiveMessage(
      ...createWcp4FirstConnectMessage("wcp4-open-with-context", HOST_INSTANCE_ID),
    )
    expect(getWcp5InstanceId(connection)).toBe(HOST_INSTANCE_ID)

    connection.outbound.clear()
    await connection.receiveMessage(
      createAddContextListenerMessage(HOST_INSTANCE_ID, LAUNCH_CONTEXT.type),
    )

    const openResponses = connection.sentMessages.filter(
      message => (message as { type?: string }).type === "openResponse",
    ) as Array<{ payload?: { error?: string; appIdentifier?: { instanceId?: string } } }>
    const appTimeoutResponses = openResponses.filter(
      response => response.payload?.error === OpenError.AppTimeout,
    )
    const broadcastEvents = connection.sentMessages.filter(
      message => (message as { type?: string }).type === "broadcastEvent",
    ) as Array<{ meta?: { destination?: { instanceId?: string } } }>

    expect(appTimeoutResponses).toHaveLength(0)
    expect(broadcastEvents.length).toBeGreaterThanOrEqual(1)
    expect(broadcastEvents[0]?.meta?.destination?.instanceId).toBe(HOST_INSTANCE_ID)
    expect(openResponses.some(response => response.payload?.error === undefined)).toBe(true)

    vi.advanceTimersByTime(2500)
    const timeoutAfterDelivery = connection.sentMessages.filter(message => {
      const typed = message as { type?: string; payload?: { error?: string } }
      return typed.type === "openResponse" && typed.payload?.error === OpenError.AppTimeout
    })
    expect(timeoutAfterDelivery).toHaveLength(0)
  })

  it("adopts sole host-pre-registered pending when WCP4 omits instanceId", async () => {
    const { agent, connection } = createAgentWithSourceInstance()

    await connection.receiveMessage(createOpenRequestMessage())

    await connection.receiveMessage(...createWcp4FirstConnectMessage("wcp4-cross-origin-no-name"))

    expect(getWcp5InstanceId(connection)).toBe(HOST_INSTANCE_ID)
    expect(
      Object.values(agent.getState().instances).filter(
        instance => instance.appId === CHART_APP.appId,
      ),
    ).toHaveLength(1)
  })

  it("delivers open-with-context for a specific context type when WCP4 omits instanceId", async () => {
    // See the sibling "delivers open-with-context when target adopts host instanceId at WCP4"
    // test above: scoped to timers only, not Date — a faked Date breaks the vendor FDC3 schema
    // validator's `typ === Date` reference check and spuriously WARNs on every WCP4/DACP message.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"] })
    const { agent, connection } = createAgentWithSourceInstance({
      openContextListenerTimeoutMs: 2000,
    })

    await connection.receiveMessage(createOpenRequestMessage(LAUNCH_CONTEXT))
    expect(agent.getState().open.pendingWithContext[HOST_INSTANCE_ID]?.length).toBe(1)

    await connection.receiveMessage(
      ...createWcp4FirstConnectMessage("wcp4-specific-context-no-name"),
    )
    expect(getWcp5InstanceId(connection)).toBe(HOST_INSTANCE_ID)

    connection.outbound.clear()
    await connection.receiveMessage(
      createAddContextListenerMessage(HOST_INSTANCE_ID, LAUNCH_CONTEXT.type),
    )

    const appTimeoutResponses = connection.sentMessages.filter(message => {
      const typed = message as { type?: string; payload?: { error?: string } }
      return typed.type === "openResponse" && typed.payload?.error === OpenError.AppTimeout
    })
    expect(appTimeoutResponses).toHaveLength(0)
  })
})
