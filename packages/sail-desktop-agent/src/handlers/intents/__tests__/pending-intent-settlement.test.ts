/**
 * Prove-It regression tests for defect #1: an intent raiser must always receive a terminal
 * response on the wire when the target instance abandons a pending intent — either by never
 * calling back before `pendingIntentTimeoutMs` elapses, or by disconnecting mid-flight.
 *
 * Before the fix, the pending entry was silently dropped from `state.intents.pending` with zero
 * traffic back to the raiser, so `IntentResolution.getResult()` never settled. These tests assert
 * on the response actually reaching the raiser's transport, not on internal state alone, and cover
 * both `raiseIntent` and `raiseIntentForContext` since they are separate handlers sharing the same
 * abandonment path in `intent-raise-shared.ts`.
 */
import { afterEach, describe, expect, it, vi } from "vite-plus/test"
import type { BrowserTypes } from "@finos/fdc3"
import { BridgingError, ChannelError, OpenError, ResolveError, ResultError } from "@finos/fdc3"

import { MockTransport } from "../../../__tests__/utils/mock-transport"
import { DEFAULT_FDC3_USER_CHANNELS } from "../../../agent/default-user-channels"
import { createInitialState } from "../../../state/initial-state"
import {
  addApp,
  addPendingIntent,
  connectInstance,
  markPendingIntentDelivered,
  registerIntentListener,
  updateInstanceState,
} from "../../../state/mutators"
import { AppInstanceState, type AgentState } from "../../../state/types"
import {
  createDACPTestParams,
  createDacpRequestMeta,
  withResponseDispatcher,
} from "../../__tests__/test-params"
import { cleanupInstanceDacpState } from "../../instance-teardown"
import { clearAllPendingIntentTimeoutsForTesting } from "../intent-pending-timeout-registry"
import { handleRaiseIntentRequest } from "../intent-raise-intent"
import { handleRaiseIntentForContextRequest } from "../intent-raise-intent-for-context"
import { attachPendingIntentTimeout } from "../intent-raise-shared"

const RAISER_ID = "raiser-1"
const RAISER_APP_ID = "RaiserApp"
const TARGET_ID = "target-1"
const TARGET_APP_ID = "TargetApp"
const INTENT_NAME = "ViewPortfolio"
const CONTEXT_TYPE = "fdc3.portfolio"

/**
 * Every member of the closed DACP wire-error union — the union of every runtime enum whose values
 * are legal on the wire (`ResponsePayloadError` in `@finos/fdc3-schema`). Same set used by
 * `src/handlers/__tests__/fdc3-error-enums.test.ts`; kept local here to avoid a test-to-test import.
 */
const DACP_WIRE_ERROR_VALUES: ReadonlySet<string> = new Set<string>([
  ...Object.values(OpenError),
  ...Object.values(ResolveError),
  ...Object.values(ResultError),
  ...Object.values(ChannelError),
  ...Object.values(BridgingError),
])

type WireMessage = {
  type: string
  meta?: { requestUuid?: string; destination?: { instanceId?: string } }
  payload?: { error?: string }
}

afterEach(() => {
  clearAllPendingIntentTimeoutsForTesting()
  vi.useRealTimers()
})

/**
 * A raiser instance and a target instance that already has an active intent listener, so raising
 * an intent resolves a target and starts waiting on a result instead of erroring immediately.
 * The app directory entry lets `raiseIntentForContext` discover the intent by context type alone.
 */
function setupPendingIntentScenario() {
  let state = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
  state = connectInstance(state, {
    instanceId: RAISER_ID,
    appId: RAISER_APP_ID,
    metadata: { name: RAISER_APP_ID },
  })
  state = connectInstance(state, {
    instanceId: TARGET_ID,
    appId: TARGET_APP_ID,
    metadata: { name: TARGET_APP_ID },
  })
  state = updateInstanceState(state, RAISER_ID, AppInstanceState.CONNECTED)
  state = updateInstanceState(state, TARGET_ID, AppInstanceState.CONNECTED)
  state = registerIntentListener(state, {
    listenerId: "target-listener-1",
    intentName: INTENT_NAME,
    instanceId: TARGET_ID,
    appId: TARGET_APP_ID,
    contextTypes: [CONTEXT_TYPE],
  })
  state = addApp(state, {
    appId: TARGET_APP_ID,
    title: TARGET_APP_ID,
    type: "web",
    details: { url: "https://example.com/target" },
    interop: {
      intents: {
        listensFor: {
          [INTENT_NAME]: { displayName: INTENT_NAME, contexts: [CONTEXT_TYPE] },
        },
      },
    },
  })

  const transport = new MockTransport()
  const { params, getState } = createDACPTestParams({
    instanceId: RAISER_ID,
    initialState: state,
  })
  return { params: withResponseDispatcher(params, transport), transport, getState }
}

function findMessagesOfType(transport: MockTransport, type: string): WireMessage[] {
  return (transport.sentMessages as WireMessage[]).filter(message => message.type === type)
}

function buildRaiseIntentRequest(requestUuid: string): BrowserTypes.RaiseIntentRequest {
  return {
    type: "raiseIntentRequest",
    meta: createDacpRequestMeta(requestUuid, { appId: RAISER_APP_ID, instanceId: RAISER_ID }),
    payload: {
      intent: INTENT_NAME,
      context: { type: CONTEXT_TYPE },
    },
  }
}

function buildRaiseIntentForContextRequest(
  requestUuid: string,
): BrowserTypes.RaiseIntentForContextRequest {
  return {
    type: "raiseIntentForContextRequest",
    meta: createDacpRequestMeta(requestUuid, { appId: RAISER_APP_ID, instanceId: RAISER_ID }),
    payload: {
      context: { type: CONTEXT_TYPE },
    },
  }
}

/**
 * Asserts the acceptance criteria shared by both abandonment paths: exactly one terminal
 * `raiseIntentResultResponse` reached the raiser's transport, correlated to the original
 * request's `requestUuid`, carrying a real `@finos/fdc3` error enum member — and the pending
 * entry is gone from state afterward.
 */
function expectTerminalRaiseIntentResultResponse(
  transport: MockTransport,
  getState: () => AgentState,
  requestUuid: string,
): void {
  const resultResponses = findMessagesOfType(transport, "raiseIntentResultResponse")
  expect(resultResponses).toHaveLength(1)

  const terminalResponse = resultResponses[0]!
  expect(terminalResponse.meta?.requestUuid).toBe(requestUuid)
  expect(terminalResponse.meta?.destination?.instanceId).toBe(RAISER_ID)
  expect(terminalResponse.payload?.error).toBeDefined()
  expect(DACP_WIRE_ERROR_VALUES.has(terminalResponse.payload!.error!)).toBe(true)

  expect(getState().intents.pending[requestUuid]).toBeUndefined()
}

describe("handleRaiseIntentRequest: abandoned pending intent settlement", () => {
  it("delivers a terminal raiseIntentResultResponse to the raiser when pendingIntentTimeoutMs elapses with no result", async () => {
    vi.useFakeTimers()
    const requestUuid = "raise-intent-timeout"
    const { params, transport, getState } = setupPendingIntentScenario()

    await handleRaiseIntentRequest(buildRaiseIntentRequest(requestUuid), params)

    // Sanity: the intent genuinely resolved to a target and is pending a result — otherwise the
    // assertions below would not be exercising the abandonment path at all.
    const initialResponse = findMessagesOfType(transport, "raiseIntentResponse")[0]
    expect(initialResponse?.payload?.error).toBeUndefined()
    expect(getState().intents.pending[requestUuid]).toBeDefined()

    await vi.advanceTimersByTimeAsync(params.pendingIntentTimeoutMs)

    expectTerminalRaiseIntentResultResponse(transport, getState, requestUuid)
  })

  it("delivers a terminal raiseIntentResultResponse to the raiser when the target instance disconnects mid-flight", async () => {
    const requestUuid = "raise-intent-disconnect"
    const { params, transport, getState } = setupPendingIntentScenario()

    await handleRaiseIntentRequest(buildRaiseIntentRequest(requestUuid), params)

    const initialResponse = findMessagesOfType(transport, "raiseIntentResponse")[0]
    expect(initialResponse?.payload?.error).toBeUndefined()
    expect(getState().intents.pending[requestUuid]).toBeDefined()

    // Simulate the target instance disconnecting mid-flight: reuse the already-wired
    // context/transport (same pattern as the pending open-with-context disconnect cases in
    // src/handlers/__tests__/cleanup.test.ts), only swapping instanceId to the disconnecting side.
    cleanupInstanceDacpState({ ...params, instanceId: TARGET_ID })

    expectTerminalRaiseIntentResultResponse(transport, getState, requestUuid)
  })
})

/**
 * Same abandonment paths, but for an intent that was never *delivered*.
 *
 * Which response settles the raiser depends on how far the intent got. Once the `intentEvent`
 * reaches the target, `raiseIntent()` has already been answered with `raiseIntentResponse` and
 * only `getResult()` is outstanding — so `raiseIntentResultResponse` is the terminal response.
 * Before delivery there is no `IntentResolution` yet: the raiser is still awaiting the
 * raise-stage response, and a `raiseIntentResultResponse` settles nothing.
 *
 * `PendingIntent.delivered` is the discriminator, and these cases pin that both abandonment
 * paths read it. Without a listener on the target the intent stays undelivered, so the target
 * disconnecting must produce a raise-stage `IntentDeliveryFailed`, not a result-stage one.
 */
function setupUndeliveredPendingIntentScenario(
  requestUuid: string,
  requestType: "raiseIntentRequest" | "raiseIntentForContextRequest" = "raiseIntentRequest",
) {
  const scenario = setupPendingIntentScenario()
  // Register the pending intent directly, with `delivered` unset. This is the state a freshly
  // launched target sits in between resolution and registering its handler — the window
  // `openContextListenerTimeoutMs` exists to bound. Building it directly rather than driving
  // the resolver keeps these cases on the settlement behaviour under test; the same approach
  // the sibling `intent-delivery-pending-target.test.ts` takes.
  scenario.params.setState(state =>
    addPendingIntent(state, {
      requestId: requestUuid,
      intentName: INTENT_NAME,
      context: { type: CONTEXT_TYPE },
      sourceInstanceId: RAISER_ID,
      targetInstanceId: TARGET_ID,
      targetAppId: TARGET_APP_ID,
      requestType,
    }),
  )
  return scenario
}

function expectRaiseStageDeliveryFailure(
  transport: MockTransport,
  getState: () => AgentState,
  requestUuid: string,
  responseType: "raiseIntentResponse" | "raiseIntentForContextResponse",
): void {
  // Nothing may answer the result stage — the raiser never reached it.
  expect(findMessagesOfType(transport, "raiseIntentResultResponse")).toHaveLength(0)

  const raiseResponses = findMessagesOfType(transport, responseType)
  expect(raiseResponses).toHaveLength(1)

  const terminal = raiseResponses[0]!
  expect(terminal.meta?.requestUuid).toBe(requestUuid)
  expect(terminal.meta?.destination?.instanceId).toBe(RAISER_ID)
  expect(terminal.payload?.error).toBe(ResolveError.IntentDeliveryFailed)
  expect(DACP_WIRE_ERROR_VALUES.has(terminal.payload!.error!)).toBe(true)

  expect(getState().intents.pending[requestUuid]).toBeUndefined()
}

describe("undelivered pending intent settles the raise stage, not the result stage", () => {
  it("answers raiseIntentResponse when the target disconnects before taking delivery", () => {
    const requestUuid = "raise-intent-undelivered-disconnect"
    const { params, transport, getState } = setupUndeliveredPendingIntentScenario(requestUuid)

    expect(getState().intents.pending[requestUuid]?.delivered).toBeFalsy()

    cleanupInstanceDacpState({ ...params, instanceId: TARGET_ID })

    expectRaiseStageDeliveryFailure(transport, getState, requestUuid, "raiseIntentResponse")
  })

  it("answers raiseIntentForContextResponse when the target disconnects before taking delivery", () => {
    const requestUuid = "raise-for-context-undelivered-disconnect"
    const { params, transport, getState } = setupUndeliveredPendingIntentScenario(
      requestUuid,
      "raiseIntentForContextRequest",
    )

    cleanupInstanceDacpState({ ...params, instanceId: TARGET_ID })

    expectRaiseStageDeliveryFailure(
      transport,
      getState,
      requestUuid,
      "raiseIntentForContextResponse",
    )
  })

  it("answers raiseIntentResponse when the raise timeout fires on an undelivered intent", async () => {
    vi.useFakeTimers()
    const requestUuid = "raise-intent-undelivered-raise-timeout"
    // A deployment can configure `pendingIntentTimeoutMs` below `openContextListenerTimeoutMs`
    // — both are public options — in which case the raise timer, not the delivery timer, is what
    // abandons an undelivered intent. It must still settle the stage the raiser is waiting on.
    const { params, transport, getState } = setupUndeliveredPendingIntentScenario(requestUuid)

    attachPendingIntentTimeout(params, requestUuid)
    await vi.advanceTimersByTimeAsync(params.pendingIntentTimeoutMs)

    expectRaiseStageDeliveryFailure(transport, getState, requestUuid, "raiseIntentResponse")
  })

  it("still answers the result stage once the intent has been delivered", () => {
    const requestUuid = "raise-intent-delivered-disconnect"
    const { params, transport, getState } = setupUndeliveredPendingIntentScenario(requestUuid)
    params.setState(state => markPendingIntentDelivered(state, requestUuid))

    cleanupInstanceDacpState({ ...params, instanceId: TARGET_ID })

    // `raiseIntentResponse` was already answered at delivery time, so the only thing left
    // outstanding is `getResult()`.
    expect(findMessagesOfType(transport, "raiseIntentResponse")).toHaveLength(0)
    expectTerminalRaiseIntentResultResponse(transport, getState, requestUuid)
  })
})

describe("handleRaiseIntentForContextRequest: abandoned pending intent settlement", () => {
  it("delivers a terminal raiseIntentResultResponse to the raiser when pendingIntentTimeoutMs elapses with no result", async () => {
    vi.useFakeTimers()
    const requestUuid = "raise-intent-for-context-timeout"
    const { params, transport, getState } = setupPendingIntentScenario()

    await handleRaiseIntentForContextRequest(buildRaiseIntentForContextRequest(requestUuid), params)

    const initialResponse = findMessagesOfType(transport, "raiseIntentForContextResponse")[0]
    expect(initialResponse?.payload?.error).toBeUndefined()
    expect(getState().intents.pending[requestUuid]).toBeDefined()

    await vi.advanceTimersByTimeAsync(params.pendingIntentTimeoutMs)

    expectTerminalRaiseIntentResultResponse(transport, getState, requestUuid)
  })

  it("delivers a terminal raiseIntentResultResponse to the raiser when the target instance disconnects mid-flight", async () => {
    const requestUuid = "raise-intent-for-context-disconnect"
    const { params, transport, getState } = setupPendingIntentScenario()

    await handleRaiseIntentForContextRequest(buildRaiseIntentForContextRequest(requestUuid), params)

    const initialResponse = findMessagesOfType(transport, "raiseIntentForContextResponse")[0]
    expect(initialResponse?.payload?.error).toBeUndefined()
    expect(getState().intents.pending[requestUuid]).toBeDefined()

    cleanupInstanceDacpState({ ...params, instanceId: TARGET_ID })

    expectTerminalRaiseIntentResultResponse(transport, getState, requestUuid)
  })
})
