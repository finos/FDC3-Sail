/**
 * Prove-It regression tests for defect #2: `eventListenerUnsubscribeRequest` and
 * `intentListenerUnsubscribeRequest` must verify that the calling instance owns the listener it
 * is trying to remove, not just that the `listenerUUID` exists.
 *
 * Before the fix, both handlers looked the listener up by `listenerUUID` and checked only that it
 * existed — so instance B could send instance A's `listenerUUID` and silently kill A's listener
 * with no error to either side. Each listener kind gets three cases: the cross-instance attack
 * (error + listener still present), the unchanged happy path (owner can still unsubscribe its own
 * listener), and a no-leak check that the "someone else's listener" error is indistinguishable
 * from the "listenerUUID does not exist at all" error.
 */
import { describe, expect, it } from "vite-plus/test"

import { MockTransport } from "../../__tests__/utils/mock-transport"
import { DEFAULT_FDC3_USER_CHANNELS } from "../../agent/default-user-channels"
import { createInitialState } from "../../state/initial-state"
import { connectInstance, updateInstanceState } from "../../state/mutators"
import { getEventListener, getIntentListener } from "../../state/selectors"
import { AppInstanceState, type AgentState } from "../../state/types"
import { createDACPTestParams, createDacpRequestMeta, withResponseDispatcher } from "./test-params"
import {
  handleAddEventListenerRequest,
  handleEventListenerUnsubscribeRequest,
} from "../events/handlers"
import {
  handleAddIntentListener,
  handleIntentListenerUnsubscribe,
} from "../intents/intent-listener-handlers"

const OWNER_ID = "instance-a"
const OWNER_APP_ID = "AppA"
const ATTACKER_ID = "instance-b"
const ATTACKER_APP_ID = "AppB"
const FABRICATED_LISTENER_UUID = "fabricated-listener-uuid-does-not-exist"

type WireMessage = {
  type: string
  payload?: { error?: string; listenerUUID?: string }
}

function setupTwoConnectedInstances(): AgentState {
  let state = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
  state = connectInstance(state, {
    instanceId: OWNER_ID,
    appId: OWNER_APP_ID,
    metadata: { name: OWNER_APP_ID },
  })
  state = connectInstance(state, {
    instanceId: ATTACKER_ID,
    appId: ATTACKER_APP_ID,
    metadata: { name: ATTACKER_APP_ID },
  })
  state = updateInstanceState(state, OWNER_ID, AppInstanceState.CONNECTED)
  state = updateInstanceState(state, ATTACKER_ID, AppInstanceState.CONNECTED)
  return state
}

/** Two handler params sharing one state and one transport, differing only by instanceId. */
function contextFor(instanceId: string, state: AgentState, transport: MockTransport) {
  const { params, getState } = createDACPTestParams({ instanceId, initialState: state })
  return { params: withResponseDispatcher(params, transport), getState }
}

function lastMessage(transport: MockTransport): WireMessage {
  const messages = transport.sentMessages as WireMessage[]
  const last = messages[messages.length - 1]
  if (!last) {
    throw new Error("Expected at least one message on the transport")
  }
  return last
}

function setupEventListenerScenario() {
  const state = setupTwoConnectedInstances()
  const transport = new MockTransport()
  const { params: ownerContext, getState } = contextFor(OWNER_ID, state, transport)
  const { params: attackerContext } = contextFor(ATTACKER_ID, state, transport)

  handleAddEventListenerRequest(
    {
      type: "addEventListenerRequest",
      meta: createDacpRequestMeta("add-event-owner", { appId: OWNER_APP_ID, instanceId: OWNER_ID }),
      payload: { type: "USER_CHANNEL_CHANGED" },
    },
    ownerContext,
  )

  const listenerUUID = lastMessage(transport).payload?.listenerUUID
  if (!listenerUUID) {
    throw new Error("Test setup failed: addEventListenerRequest did not return a listenerUUID")
  }

  return { transport, ownerContext, attackerContext, getState, listenerUUID }
}

function setupIntentListenerScenario() {
  const state = setupTwoConnectedInstances()
  const transport = new MockTransport()
  const { params: ownerContext, getState } = contextFor(OWNER_ID, state, transport)
  const { params: attackerContext } = contextFor(ATTACKER_ID, state, transport)

  handleAddIntentListener(
    {
      type: "addIntentListenerRequest",
      meta: createDacpRequestMeta("add-intent-owner", {
        appId: OWNER_APP_ID,
        instanceId: OWNER_ID,
      }),
      payload: { intent: "ViewChart" },
    },
    ownerContext,
  )

  const listenerUUID = lastMessage(transport).payload?.listenerUUID
  if (!listenerUUID) {
    throw new Error("Test setup failed: addIntentListenerRequest did not return a listenerUUID")
  }

  return { transport, ownerContext, attackerContext, getState, listenerUUID }
}

describe("eventListenerUnsubscribeRequest cross-instance ownership", () => {
  it("rejects instance B unsubscribing instance A's listener and leaves it registered", () => {
    const { transport, attackerContext, getState, listenerUUID } = setupEventListenerScenario()

    handleEventListenerUnsubscribeRequest(
      {
        type: "eventListenerUnsubscribeRequest",
        meta: createDacpRequestMeta("attack-event-unsub", {
          appId: ATTACKER_APP_ID,
          instanceId: ATTACKER_ID,
        }),
        payload: { listenerUUID },
      },
      attackerContext,
    )

    const response = lastMessage(transport)
    expect(response.type).toBe("eventListenerUnsubscribeResponse")
    expect(response.payload?.error).toBeDefined()
    expect(getEventListener(getState(), listenerUUID)).toBeDefined()
  })

  it("lets instance A unsubscribe its own listener successfully", () => {
    const { transport, ownerContext, getState, listenerUUID } = setupEventListenerScenario()

    handleEventListenerUnsubscribeRequest(
      {
        type: "eventListenerUnsubscribeRequest",
        meta: createDacpRequestMeta("owner-event-unsub", {
          appId: OWNER_APP_ID,
          instanceId: OWNER_ID,
        }),
        payload: { listenerUUID },
      },
      ownerContext,
    )

    const response = lastMessage(transport)
    expect(response.type).toBe("eventListenerUnsubscribeResponse")
    expect(response.payload?.error).toBeUndefined()
    expect(getEventListener(getState(), listenerUUID)).toBeUndefined()
  })

  it("returns an error indistinguishable from a nonexistent listenerUUID for another instance's listener", () => {
    const { transport, attackerContext, listenerUUID } = setupEventListenerScenario()

    handleEventListenerUnsubscribeRequest(
      {
        type: "eventListenerUnsubscribeRequest",
        meta: createDacpRequestMeta("attack-event-unsub-2", {
          appId: ATTACKER_APP_ID,
          instanceId: ATTACKER_ID,
        }),
        payload: { listenerUUID },
      },
      attackerContext,
    )
    const attackResponse = lastMessage(transport)
    expect(attackResponse.payload?.error).toBeDefined()

    handleEventListenerUnsubscribeRequest(
      {
        type: "eventListenerUnsubscribeRequest",
        meta: createDacpRequestMeta("nonexistent-event-unsub", {
          appId: ATTACKER_APP_ID,
          instanceId: ATTACKER_ID,
        }),
        payload: { listenerUUID: FABRICATED_LISTENER_UUID },
      },
      attackerContext,
    )
    const nonexistentResponse = lastMessage(transport)

    expect(nonexistentResponse.type).toBe(attackResponse.type)
    expect(nonexistentResponse.payload?.error).toBe(attackResponse.payload?.error)
  })
})

describe("intentListenerUnsubscribeRequest cross-instance ownership", () => {
  it("rejects instance B unsubscribing instance A's listener and leaves it registered", () => {
    const { transport, attackerContext, getState, listenerUUID } = setupIntentListenerScenario()

    handleIntentListenerUnsubscribe(
      {
        type: "intentListenerUnsubscribeRequest",
        meta: createDacpRequestMeta("attack-intent-unsub", {
          appId: ATTACKER_APP_ID,
          instanceId: ATTACKER_ID,
        }),
        payload: { listenerUUID },
      },
      attackerContext,
    )

    const response = lastMessage(transport)
    expect(response.type).toBe("intentListenerUnsubscribeResponse")
    expect(response.payload?.error).toBeDefined()
    expect(getIntentListener(getState(), listenerUUID)).toBeDefined()
  })

  it("lets instance A unsubscribe its own listener successfully", () => {
    const { transport, ownerContext, getState, listenerUUID } = setupIntentListenerScenario()

    handleIntentListenerUnsubscribe(
      {
        type: "intentListenerUnsubscribeRequest",
        meta: createDacpRequestMeta("owner-intent-unsub", {
          appId: OWNER_APP_ID,
          instanceId: OWNER_ID,
        }),
        payload: { listenerUUID },
      },
      ownerContext,
    )

    const response = lastMessage(transport)
    expect(response.type).toBe("intentListenerUnsubscribeResponse")
    expect(response.payload?.error).toBeUndefined()
    expect(getIntentListener(getState(), listenerUUID)).toBeUndefined()
  })

  it("returns an error indistinguishable from a nonexistent listenerUUID for another instance's listener", () => {
    const { transport, attackerContext, listenerUUID } = setupIntentListenerScenario()

    handleIntentListenerUnsubscribe(
      {
        type: "intentListenerUnsubscribeRequest",
        meta: createDacpRequestMeta("attack-intent-unsub-2", {
          appId: ATTACKER_APP_ID,
          instanceId: ATTACKER_ID,
        }),
        payload: { listenerUUID },
      },
      attackerContext,
    )
    const attackResponse = lastMessage(transport)
    expect(attackResponse.payload?.error).toBeDefined()

    handleIntentListenerUnsubscribe(
      {
        type: "intentListenerUnsubscribeRequest",
        meta: createDacpRequestMeta("nonexistent-intent-unsub", {
          appId: ATTACKER_APP_ID,
          instanceId: ATTACKER_ID,
        }),
        payload: { listenerUUID: FABRICATED_LISTENER_UUID },
      },
      attackerContext,
    )
    const nonexistentResponse = lastMessage(transport)

    expect(nonexistentResponse.type).toBe(attackResponse.type)
    expect(nonexistentResponse.payload?.error).toBe(attackResponse.payload?.error)
  })
})
