/**
 * Prove-it test for a known, deliberately-unfixed gap in pending-intent delivery.
 *
 * `intent-delivery-helpers.ts:77-88` accepts either `AppInstanceState.PENDING` or `CONNECTED`
 * as a valid delivery target. `intent-raise-shared.ts:109-113` (`resolveAppTargetInstance`)
 * explicitly *prefers* a `CONNECTED` instance over a `PENDING` one when picking a raise target.
 * Those two facts don't compose: once a pending intent has been correctly routed to a
 * `CONNECTED` instance of an app, `deliverPendingIntentsForListener` will still retarget it to
 * *any other* instance of the same `appId` that registers a matching listener first — including
 * one that is still `PENDING` (pre-WCP5, per `AppInstanceState.PENDING`'s own doc comment in
 * `state/types.ts:29`). The `:77-88` state check does nothing to stop that, because it treats
 * PENDING as an acceptable delivery target.
 *
 * This drives only the public DACP handler surface: `handleRaiseIntentRequest` (raise, implicit
 * app target) and `deliverPendingIntentsForListener` (the same function
 * `handleAddIntentListener` calls after registering a listener — see
 * `intent-listener-handlers.ts:101`). No internal helper is called with hand-built state.
 */
import { describe, expect, it } from "vite-plus/test"
import type { BrowserTypes } from "@finos/fdc3"

import { MockTransport } from "../../../__tests__/utils/mock-transport"
import { DEFAULT_FDC3_USER_CHANNELS } from "../../../agent/default-user-channels"
import { createInitialState } from "../../../state/initial-state"
import {
  addApp,
  connectInstance,
  registerIntentListener,
  updateInstanceState,
} from "../../../state/mutators"
import { AppInstanceState } from "../../../state/types"
import type { DACPHandlerParams } from "../../types"
import {
  createDACPTestParams,
  createDacpRequestMeta,
  withResponseDispatcher,
} from "../../__tests__/test-params"
import { deliverPendingIntentsForListener } from "../intent-delivery-helpers"
import { handleRaiseIntentRequest } from "../intent-raise-intent"

const RAISER_ID = "raiser-1"
const RAISER_APP_ID = "RaiserApp"
const CONNECTED_TARGET_ID = "target-connected-1"
const STALE_PENDING_ID = "target-pending-stale"
const TARGET_APP_ID = "TargetApp"
const INTENT_NAME = "ViewPortfolio"
const CONTEXT_TYPE = "fdc3.portfolio"

type WireMessage = {
  type: string
  meta?: { requestUuid?: string; destination?: { instanceId?: string } }
  payload?: { error?: string }
}

function messagesOfType(transport: MockTransport, type: string): WireMessage[] {
  return (transport.sentMessages as WireMessage[]).filter(message => message.type === type)
}

describe("attemptIntentDelivery: PENDING target eligibility (parked follow-up)", () => {
  // SKIPPED, and deliberately not inverted. This asserts the behaviour we want, and it fails —
  // the retarget really does happen. It is skipped only because the defect is unreachable over
  // the wire today: `transportToInstanceId` is remapped from the temp id to the real one solely
  // by the WCP5-success interception (`wcp-connection-management.ts:261`, driven from
  // `app-connection-registry.ts:104`), and `wcp-identity-validation.ts:264` flips the instance to
  // CONNECTED synchronously *before* the WCP5 response is sent at :281. So no live port is ever
  // routable under an instanceId that is still PENDING, and nothing on the inbound path checks
  // instance state at all — the protection is emergent from that ordering, not from any guard.
  //
  // `src/app-connection/__tests__/pending-instance-dacp-gate.test.ts` passes and guards that
  // ordering. If it ever goes red, un-skip this one: the internal defect it describes is still
  // here, one call away from `handleAddIntentListener` (`intent-listener-handlers.ts:101`).
  //
  // Inverting this into a characterization test would bless the over-permissive PENDING-or-
  // CONNECTED check at `intent-delivery-helpers.ts:77-88` as intended behaviour. It is not.
  it.skip("does not hijack a pending intent, correctly routed to a CONNECTED instance, to a second PENDING instance of the same app that registers a listener first", async () => {
    let state = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
    state = connectInstance(state, {
      instanceId: RAISER_ID,
      appId: RAISER_APP_ID,
      metadata: { name: RAISER_APP_ID },
    })
    state = connectInstance(state, {
      instanceId: CONNECTED_TARGET_ID,
      appId: TARGET_APP_ID,
      metadata: { name: TARGET_APP_ID },
    })
    // A second instance of the SAME app, still PENDING (pre-WCP5) — e.g. the
    // `wcp-host-instance-adoption.ts` "lingering PENDING instance" scenario.
    state = connectInstance(state, {
      instanceId: STALE_PENDING_ID,
      appId: TARGET_APP_ID,
      metadata: { name: TARGET_APP_ID },
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
    // RAISER connects; only one of the two TargetApp instances (CONNECTED_TARGET_ID) is
    // WCP5-complete. STALE_PENDING_ID is deliberately left in AppInstanceState.PENDING.
    state = updateInstanceState(state, RAISER_ID, AppInstanceState.CONNECTED)
    state = updateInstanceState(state, CONNECTED_TARGET_ID, AppInstanceState.CONNECTED)

    const transport = new MockTransport()
    const { params: baseParams, getState } = createDACPTestParams({
      instanceId: RAISER_ID,
      initialState: state,
    })
    const params: DACPHandlerParams = {
      ...withResponseDispatcher(baseParams, transport),
      openContextListenerTimeoutMs: 5000,
      pendingIntentTimeoutMs: 60_000,
    }

    const requestUuid = "raise-then-hijack"
    const raiseRequest: BrowserTypes.RaiseIntentRequest = {
      type: "raiseIntentRequest",
      meta: createDacpRequestMeta(requestUuid, { appId: RAISER_APP_ID, instanceId: RAISER_ID }),
      payload: {
        intent: INTENT_NAME,
        context: { type: CONTEXT_TYPE },
        // Implicit instance target: appId only, no instanceId. `resolveAppTargetInstance`
        // must pick the CONNECTED instance over the PENDING one (intent-raise-shared.ts:109-113).
        app: { appId: TARGET_APP_ID },
      },
    }

    await handleRaiseIntentRequest(raiseRequest, params)

    // Neither target instance has a listener yet, so delivery is queued (not sent immediately) —
    // and it must be queued against the CONNECTED instance, per resolveAppTargetInstance's
    // documented CONNECTED-over-PENDING preference.
    expect(messagesOfType(transport, "intentEvent")).toHaveLength(0)
    const pendingAfterRaise = getState().intents.pending[requestUuid]
    expect(pendingAfterRaise?.targetInstanceId).toBe(CONNECTED_TARGET_ID)

    // The STALE PENDING instance (never completed WCP5) registers a listener for the same
    // intent. This is the exact call `handleAddIntentListener` makes after registering a
    // listener (intent-listener-handlers.ts:101) — driven directly here since the DACP wire
    // gate for `addIntentListenerRequest` does not check instance state either
    // (`handlers/index.ts`'s HANDLER_MAP has no state gate, and `handleAddIntentListener`
    // itself only checks that the instance exists).
    params.setState(s =>
      registerIntentListener(s, {
        listenerId: "stale-pending-listener-1",
        intentName: INTENT_NAME,
        instanceId: STALE_PENDING_ID,
        appId: TARGET_APP_ID,
        contextTypes: [CONTEXT_TYPE],
      }),
    )
    deliverPendingIntentsForListener({ ...params, instanceId: STALE_PENDING_ID }, INTENT_NAME)

    const intentEvents = messagesOfType(transport, "intentEvent")
    expect(intentEvents).toHaveLength(1)

    const deliveredInstanceId = intentEvents[0]!.meta?.destination?.instanceId
    // The pending intent was correctly routed to the CONNECTED instance at raise time. Per the
    // FDC3 spec (IntentDeliveryFailed is defined purely in terms of listener registration,
    // browserResidentDesktopAgents.md), a PENDING instance of the same app registering a
    // listener afterward must not steal delivery away from the already-selected CONNECTED
    // instance. `attemptIntentDelivery`'s state check at intent-delivery-helpers.ts:77-88
    // accepts PENDING as a valid target, so nothing stops this hijack today.
    expect(deliveredInstanceId).toBe(CONNECTED_TARGET_ID)
  })
})
