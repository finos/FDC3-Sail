/**
 * Characterization tests for pending-intent delivery and settlement.
 *
 * Written *before* `DACPHandlerParams.pendingIntentPromises` was collapsed into `AgentState`,
 * then updated with the collapse. `delivered` and `requestType` used to live on a `Map` entry
 * mutated through a **captured reference** while `setState` **replaced** the state tree, so the
 * two stores could disagree; both now live on `state.intents.pending[requestId]` and cannot.
 * Timeout handles are the only per-request state left outside Immer, in
 * `intent-pending-timeout-registry.ts`.
 *
 * Timers: real `setTimeout` with Vitest fake timers (`vi.useFakeTimers`), same choice as
 * `pending-intent-settlement.test.ts`. Fake timers are what make the *ordering* between the
 * delivery timeout (`openContextListenerTimeoutMs`) and the pending-intent timeout
 * (`pendingIntentTimeoutMs`) controllable, which is the whole point of this file.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import type { BrowserTypes } from "@finos/fdc3"
import { ResolveError, ResultError } from "@finos/fdc3"

import { MockTransport } from "../../../__tests__/utils/mock-transport"
import { DEFAULT_FDC3_USER_CHANNELS } from "../../../agent/default-user-channels"
import { createInitialState } from "../../../state/initial-state"
import {
  addApp,
  addPendingIntent,
  connectInstance,
  registerIntentListener,
  updateInstanceState,
} from "../../../state/mutators"
import { AppInstanceState, type AgentState } from "../../../state/types"
import type { DACPHandlerParams } from "../../types"
import {
  createDACPTestParams,
  createDacpRequestMeta,
  withResponseDispatcher,
} from "../../__tests__/test-params"
import { cleanupInstanceDacpState } from "../../instance-teardown"
import {
  attemptIntentDelivery,
  deliverPendingIntentsForListener,
  queueIntentDelivery,
} from "../intent-delivery-helpers"
import {
  clearAllPendingIntentTimeoutsForTesting,
  getActivePendingIntentTimeoutCount,
} from "../intent-pending-timeout-registry"
import { handleRaiseIntentRequest } from "../intent-raise-intent"
import { handleRaiseIntentForContextRequest } from "../intent-raise-intent-for-context"

const RAISER_ID = "raiser-1"
const RAISER_APP_ID = "RaiserApp"
const TARGET_ID = "target-1"
const TARGET_APP_ID = "TargetApp"
const INTENT_NAME = "ViewPortfolio"
const CONTEXT_TYPE = "fdc3.portfolio"

type WireMessage = {
  type: string
  meta?: { requestUuid?: string; destination?: { instanceId?: string } }
  payload?: { error?: string; raiseIntentRequestUuid?: string }
}

beforeEach(() => {
  clearAllPendingIntentTimeoutsForTesting()
})

afterEach(() => {
  clearAllPendingIntentTimeoutsForTesting()
  vi.useRealTimers()
})

/**
 * A raiser and a target that is a legal explicit `app` target for `INTENT_NAME`.
 *
 * Defaults produce the **queued** delivery path: the target is `PENDING` with no intent listener,
 * so `shouldWaitForIntentListenerBeforeDelivery` returns true and `queueIntentDelivery` arms a
 * delivery timeout instead of sending. `withTargetListener` / `targetConnected` switch to the
 * immediate-delivery path.
 */
function setupScenario(
  options: {
    withTargetListener?: boolean
    targetConnected?: boolean
    openContextListenerTimeoutMs?: number
    pendingIntentTimeoutMs?: number
  } = {},
): { params: DACPHandlerParams; transport: MockTransport; getState: () => AgentState } {
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
  if (options.targetConnected) {
    state = updateInstanceState(state, TARGET_ID, AppInstanceState.CONNECTED)
  }
  if (options.withTargetListener) {
    state = registerIntentListener(state, {
      listenerId: "target-listener-1",
      intentName: INTENT_NAME,
      instanceId: TARGET_ID,
      appId: TARGET_APP_ID,
      contextTypes: [CONTEXT_TYPE],
    })
  }
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
  const { params: baseParams, getState } = createDACPTestParams({
    instanceId: RAISER_ID,
    initialState: state,
  })
  const params: DACPHandlerParams = {
    ...withResponseDispatcher(baseParams, transport),
    openContextListenerTimeoutMs: options.openContextListenerTimeoutMs ?? 2000,
    pendingIntentTimeoutMs: options.pendingIntentTimeoutMs ?? 2000,
  }
  return { params, transport, getState }
}

function messagesOfType(transport: MockTransport, type: string): WireMessage[] {
  return (transport.sentMessages as WireMessage[]).filter(message => message.type === type)
}

function buildRaiseIntentRequest(requestUuid: string): BrowserTypes.RaiseIntentRequest {
  return {
    type: "raiseIntentRequest",
    meta: createDacpRequestMeta(requestUuid, { appId: RAISER_APP_ID, instanceId: RAISER_ID }),
    payload: {
      intent: INTENT_NAME,
      context: { type: CONTEXT_TYPE },
      app: { appId: TARGET_APP_ID, instanceId: TARGET_ID },
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
      app: { appId: TARGET_APP_ID, instanceId: TARGET_ID },
    },
  }
}

// ============================================================================
// The delivery timeout vs the pending-intent timeout: which one fires first
// ============================================================================

describe("queueIntentDelivery: delivery timeout ordering against pending-intent settlement", () => {
  it("sends nothing and does not throw when the delivery timeout fires after the pending intent is already gone from state", async () => {
    vi.useFakeTimers()
    const requestUuid = "delivery-timeout-after-settlement"
    const { params, transport, getState } = setupScenario({
      pendingIntentTimeoutMs: 1000,
      openContextListenerTimeoutMs: 5000,
    })

    await handleRaiseIntentRequest(buildRaiseIntentRequest(requestUuid), params)

    // The queued path sends *nothing* to the raiser up front: `attemptIntentDelivery` returns
    // false before reaching any `sendDACPResponse`, so there is no early raiseIntentResponse.
    expect(messagesOfType(transport, "raiseIntentResponse")).toHaveLength(0)
    expect(messagesOfType(transport, "intentEvent")).toHaveLength(0)
    expect(getState().intents.pending[requestUuid]).toBeDefined()

    // t=1000 — pendingIntentTimeoutMs elapses first. `attachPendingIntentTimeout` resolves the
    // pending intent out of state and settles the raiser. It does NOT clear the delivery timeout.
    //
    // The intent was never delivered, so the raiser is still awaiting the *raise* stage: it has
    // no `IntentResolution` yet and a `raiseIntentResultResponse` would settle nothing. This
    // file previously characterized that older, wrong behaviour (`raiseIntentResultResponse` /
    // `ResultError.ApiTimeout`), which left `fdc3.raiseIntent()` hanging.
    await vi.advanceTimersByTimeAsync(1000)

    const settlement = messagesOfType(transport, "raiseIntentResponse")
    expect(settlement).toHaveLength(1)
    expect(settlement[0]!.payload?.error).toBe(ResolveError.IntentDeliveryFailed)
    expect(settlement[0]!.meta?.destination?.instanceId).toBe(RAISER_ID)
    expect(getState().intents.pending[requestUuid]).toBeUndefined()

    // The delivery timeout is still armed: settling the pending intent did not cancel it.
    expect(getActivePendingIntentTimeoutCount()).toBe(1)

    const messageCountAfterSettlement = transport.sentMessages.length

    // t=5000 — the delivery timeout now fires against a state tree with no pending entry.
    // `getPendingIntent` returns undefined so the callback returns before building or sending
    // anything. Net effect: a silent no-op. Not a double-delivery, and not a throw.
    await vi.advanceTimersByTimeAsync(4000)

    // Proof the callback ran rather than being cancelled: `releasePendingIntentTimeout` is
    // the first statement inside it, so a zero count here means the body executed.
    expect(getActivePendingIntentTimeoutCount()).toBe(0)
    expect(transport.sentMessages).toHaveLength(messageCountAfterSettlement)
    expect(messagesOfType(transport, "raiseIntentResponse")).toHaveLength(1)
    expect(messagesOfType(transport, "raiseIntentResultResponse")).toHaveLength(0)
    expect(messagesOfType(transport, "intentEvent")).toHaveLength(0)
    // The settled request must stay settled: the late `delivered` write must not resurrect a
    // pending entry under the same requestId.
    expect(getState().intents.pending[requestUuid]).toBeUndefined()
    expect(Object.keys(getState().intents.pending)).toHaveLength(0)
  })

  it("settles the raiser with IntentDeliveryFailed when the delivery timeout fires while the pending intent is still in state", async () => {
    vi.useFakeTimers()
    const requestUuid = "delivery-timeout-before-settlement"
    const { params, transport, getState } = setupScenario({
      openContextListenerTimeoutMs: 1000,
      pendingIntentTimeoutMs: 5000,
    })

    await handleRaiseIntentRequest(buildRaiseIntentRequest(requestUuid), params)
    expect(getState().intents.pending[requestUuid]).toBeDefined()

    // t=1000 — the delivery timeout wins the race. `requestType` is read off the state entry,
    // so the response type is raiseIntentResponse.
    await vi.advanceTimersByTimeAsync(1000)

    const failures = messagesOfType(transport, "raiseIntentResponse")
    expect(failures).toHaveLength(1)
    expect(failures[0]!.payload?.error).toBe(ResolveError.IntentDeliveryFailed)
    expect(failures[0]!.meta?.requestUuid).toBe(requestUuid)
    expect(failures[0]!.meta?.destination?.instanceId).toBe(RAISER_ID)
    expect(getState().intents.pending[requestUuid]).toBeUndefined()
    expect(messagesOfType(transport, "intentEvent")).toHaveLength(0)

    // Only the pending-intent timeout is left armed; the delivery timeout released itself.
    expect(getActivePendingIntentTimeoutCount()).toBe(1)

    const messageCountAfterDeliveryTimeout = transport.sentMessages.length

    // t=5000 — the pending-intent timeout still fires (the delivery-timeout path does not cancel
    // it), but `getPendingIntent` is now undefined so no second terminal response is sent.
    // Exactly one settlement reaches the raiser, never two.
    await vi.advanceTimersByTimeAsync(4000)

    expect(getActivePendingIntentTimeoutCount()).toBe(0)
    expect(transport.sentMessages).toHaveLength(messageCountAfterDeliveryTimeout)
    expect(messagesOfType(transport, "raiseIntentResultResponse")).toHaveLength(0)
    expect(Object.keys(getState().intents.pending)).toHaveLength(0)
  })

  it("uses raiseIntentForContextResponse on the delivery-timeout path for a raiseIntentForContextRequest", async () => {
    vi.useFakeTimers()
    const requestUuid = "for-context-delivery-timeout"
    const { params, transport, getState } = setupScenario({
      openContextListenerTimeoutMs: 1000,
      pendingIntentTimeoutMs: 5000,
    })

    await handleRaiseIntentForContextRequest(buildRaiseIntentForContextRequest(requestUuid), params)
    expect(getState().intents.pending[requestUuid]).toBeDefined()

    await vi.advanceTimersByTimeAsync(1000)

    // `registerPendingIntentState` stored requestType "raiseIntentForContextRequest", and the
    // delivery-timeout callback maps it through `getResponseTypeForRequest`.
    const failures = messagesOfType(transport, "raiseIntentForContextResponse")
    expect(failures).toHaveLength(1)
    expect(failures[0]!.payload?.error).toBe(ResolveError.IntentDeliveryFailed)
    expect(failures[0]!.meta?.destination?.instanceId).toBe(RAISER_ID)
    expect(messagesOfType(transport, "raiseIntentResponse")).toHaveLength(0)
    expect(getState().intents.pending[requestUuid]).toBeUndefined()
  })
})

// ============================================================================
// `delivered` as the sole double-delivery guard
// ============================================================================

describe("attemptIntentDelivery: the delivered flag", () => {
  it("delivers once and re-sends nothing on a second attempt for the same request", async () => {
    const requestUuid = "deliver-once"
    const { params, transport, getState } = setupScenario({
      withTargetListener: true,
      targetConnected: true,
    })

    await handleRaiseIntentRequest(buildRaiseIntentRequest(requestUuid), params)

    const intentEvents = messagesOfType(transport, "intentEvent")
    expect(intentEvents).toHaveLength(1)
    expect(intentEvents[0]!.meta?.destination?.instanceId).toBe(TARGET_ID)
    expect(messagesOfType(transport, "raiseIntentResponse")).toHaveLength(1)
    // Delivery does not resolve the pending intent — it stays until an intentResultRequest.
    expect(getState().intents.pending[requestUuid]).toBeDefined()

    const messageCountAfterDelivery = transport.sentMessages.length

    // The `pendingIntent.delivered` early return in `attemptIntentDelivery` is what makes this a
    // no-op; it returns true (meaning "nothing left to do"), not false.
    expect(attemptIntentDelivery(params, requestUuid, false)).toBe(true)
    expect(transport.sentMessages).toHaveLength(messageCountAfterDelivery)
  })

  it("reports success without sending when the request has no pending intent in state", () => {
    const { params, transport } = setupScenario({ targetConnected: true })

    expect(attemptIntentDelivery(params, "no-such-request", false)).toBe(true)
    expect(transport.sentMessages).toHaveLength(0)
  })

  // `delivered` now lives on `state.intents.pending[requestId]`, so a pending intent added
  // straight to state is guarded exactly like one raised through `handleRaiseIntentRequest`.
  // Before the collapse this re-sent on every call, because the guard lived on a separate Map
  // entry that this path never created.
  it("delivers once for a pending intent added directly to state", () => {
    const requestUuid = "state-only-pending-intent"
    const { params, transport, getState } = setupScenario({
      withTargetListener: true,
      targetConnected: true,
    })

    params.setState(state =>
      addPendingIntent(state, {
        requestId: requestUuid,
        intentName: INTENT_NAME,
        context: { type: CONTEXT_TYPE },
        sourceInstanceId: RAISER_ID,
        targetInstanceId: TARGET_ID,
        targetAppId: TARGET_APP_ID,
      }),
    )

    expect(attemptIntentDelivery(params, requestUuid, false)).toBe(true)
    expect(getState().intents.pending[requestUuid]?.delivered).toBe(true)

    expect(attemptIntentDelivery(params, requestUuid, false)).toBe(true)

    expect(messagesOfType(transport, "intentEvent")).toHaveLength(1)
    expect(messagesOfType(transport, "raiseIntentResponse")).toHaveLength(1)
  })

  // `queueIntentDelivery` keys off the state entry now, so a pending intent added directly to
  // state gets the same queued treatment as a raised one: no listener on the target means no
  // send, and a delivery timeout is armed to settle the raiser. Before the collapse this bailed
  // out entirely because there was no Map entry, leaving the raiser with no response at all.
  it("arms a delivery timeout for a pending intent added directly to state", () => {
    const requestUuid = "queue-without-entry"
    const { params, transport } = setupScenario()

    params.setState(state =>
      addPendingIntent(state, {
        requestId: requestUuid,
        intentName: INTENT_NAME,
        context: { type: CONTEXT_TYPE },
        sourceInstanceId: RAISER_ID,
        targetInstanceId: TARGET_ID,
        targetAppId: TARGET_APP_ID,
      }),
    )

    queueIntentDelivery(params, requestUuid, true)

    expect(getActivePendingIntentTimeoutCount()).toBe(1)
    expect(transport.sentMessages).toHaveLength(0)
  })
})

describe("deliverPendingIntentsForListener", () => {
  it("skips a pending intent that was already delivered", async () => {
    const requestUuid = "already-delivered"
    const { params, transport } = setupScenario({
      withTargetListener: true,
      targetConnected: true,
    })

    await handleRaiseIntentRequest(buildRaiseIntentRequest(requestUuid), params)
    expect(messagesOfType(transport, "intentEvent")).toHaveLength(1)

    const messageCountAfterDelivery = transport.sentMessages.length

    // A second listener registration for the same intent re-runs the sweep from the target's
    // perspective. The `pending.delivered` check in `deliverPendingIntentsForListener` is the
    // only thing stopping a duplicate intentEvent.
    deliverPendingIntentsForListener({ ...params, instanceId: TARGET_ID }, INTENT_NAME)

    expect(transport.sentMessages).toHaveLength(messageCountAfterDelivery)
    expect(messagesOfType(transport, "intentEvent")).toHaveLength(1)
  })

  it("delivers a queued pending intent once the target registers its listener", async () => {
    vi.useFakeTimers()
    const requestUuid = "queued-then-listener"
    const { params, transport, getState } = setupScenario({
      targetConnected: true,
      openContextListenerTimeoutMs: 5000,
      pendingIntentTimeoutMs: 60_000,
    })

    await handleRaiseIntentRequest(buildRaiseIntentRequest(requestUuid), params)
    expect(messagesOfType(transport, "intentEvent")).toHaveLength(0)

    params.setState(state =>
      registerIntentListener(state, {
        listenerId: "late-listener-1",
        intentName: INTENT_NAME,
        instanceId: TARGET_ID,
        appId: TARGET_APP_ID,
        contextTypes: [CONTEXT_TYPE],
      }),
    )
    deliverPendingIntentsForListener({ ...params, instanceId: TARGET_ID }, INTENT_NAME)

    expect(messagesOfType(transport, "intentEvent")).toHaveLength(1)
    expect(messagesOfType(transport, "raiseIntentResponse")).toHaveLength(1)
    expect(messagesOfType(transport, "raiseIntentResponse")[0]!.payload?.error).toBeUndefined()
    expect(getState().intents.pending[requestUuid]).toBeDefined()

    const messageCountAfterDelivery = transport.sentMessages.length

    // Successful delivery clears the "delivery" timeout, so it never fires and never sends a
    // contradicting IntentDeliveryFailed.
    await vi.advanceTimersByTimeAsync(5000)

    expect(transport.sentMessages).toHaveLength(messageCountAfterDelivery)
    expect(messagesOfType(transport, "raiseIntentResponse")).toHaveLength(1)
  })
})

// ============================================================================
// Settlement on disconnect (the paths added by 8a62fd386 / 20515fdbf)
// ============================================================================

describe("cleanupInstanceDacpState: pending-intent settlement on disconnect", () => {
  it("settles the raiser with a terminal raiseIntentResultResponse when the target disconnects mid-flight", async () => {
    const requestUuid = "target-disconnect-settles-raiser"
    const { params, transport, getState } = setupScenario({
      withTargetListener: true,
      targetConnected: true,
    })

    await handleRaiseIntentRequest(buildRaiseIntentRequest(requestUuid), params)
    expect(getState().intents.pending[requestUuid]).toBeDefined()

    cleanupInstanceDacpState({ ...params, instanceId: TARGET_ID })

    const settlement = messagesOfType(transport, "raiseIntentResultResponse")
    expect(settlement).toHaveLength(1)
    expect(settlement[0]!.payload?.error).toBe(ResultError.ApiTimeout)
    expect(settlement[0]!.meta?.requestUuid).toBe(requestUuid)
    expect(settlement[0]!.meta?.destination?.instanceId).toBe(RAISER_ID)
    expect(getState().intents.pending[requestUuid]).toBeUndefined()
  })

  it("posts no terminal response when the raiser itself is the disconnecting instance", async () => {
    const requestUuid = "raiser-disconnect-posts-nothing"
    const { params, transport, getState } = setupScenario({
      withTargetListener: true,
      targetConnected: true,
    })

    await handleRaiseIntentRequest(buildRaiseIntentRequest(requestUuid), params)
    expect(getState().intents.pending[requestUuid]).toBeDefined()

    // 20515fdbf: the terminal response is addressed to `pending.sourceInstanceId`, so sending it
    // when the source is the one going away posts to a just-closed instance for a promise nobody
    // is awaiting. The guard is `pending.sourceInstanceId !== instanceId`.
    cleanupInstanceDacpState({ ...params, instanceId: RAISER_ID })

    expect(messagesOfType(transport, "raiseIntentResultResponse")).toHaveLength(0)
    expect(getState().intents.pending[requestUuid]).toBeUndefined()
  })

  it("clears the armed delivery timeout when the target disconnects while delivery is still queued", async () => {
    vi.useFakeTimers()
    const requestUuid = "disconnect-while-queued"
    const { params, transport, getState } = setupScenario({
      openContextListenerTimeoutMs: 5000,
      pendingIntentTimeoutMs: 60_000,
    })

    await handleRaiseIntentRequest(buildRaiseIntentRequest(requestUuid), params)
    expect(getActivePendingIntentTimeoutCount()).toBe(2)

    cleanupInstanceDacpState({ ...params, instanceId: TARGET_ID })

    // `cleanupInstanceDacpState` clears both timeouts for the request, so no pending-intent timer
    // survives the teardown.
    expect(getActivePendingIntentTimeoutCount()).toBe(0)
    // Undelivered at teardown, so the terminal response is the raise stage — clearing the
    // delivery timeout above removed the only other thing that could have answered it.
    const teardownSettlement = messagesOfType(transport, "raiseIntentResponse")
    expect(teardownSettlement).toHaveLength(1)
    expect(teardownSettlement[0]!.payload?.error).toBe(ResolveError.IntentDeliveryFailed)
    expect(messagesOfType(transport, "raiseIntentResultResponse")).toHaveLength(0)
    expect(getState().intents.pending[requestUuid]).toBeUndefined()

    const messageCountAfterTeardown = transport.sentMessages.length

    await vi.advanceTimersByTimeAsync(60_000)

    expect(transport.sentMessages).toHaveLength(messageCountAfterTeardown)
    expect(messagesOfType(transport, "raiseIntentResultResponse")).toHaveLength(0)
  })
})
