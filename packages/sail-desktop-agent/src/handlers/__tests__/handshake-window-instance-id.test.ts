/**
 * CHARACTERIZATION tests for the instance id that reaches a DACP handler during the WCP
 * handshake window, driven through the REAL entry point.
 *
 * Production never calls a DACP handler directly. Every inbound app message goes through
 * `routeDACPMessage` (`src/handlers/index.ts`), which validates it, applies a timeout, and
 * dispatches via `HANDLER_MAP`. `routeDACPMessage` is also — since the handler-deps refactor —
 * the single point where the wire id is resolved:
 *
 *     const params = { ...inboundContext, instanceId: resolveDacpHandlerInstanceId(inboundContext) }
 *
 * So a test that calls `handleX(msg, ctx)` directly feeds the handler a RAW wire id regardless of
 * what production does, and cannot observe the behaviour these tests exist to measure. Every test
 * below therefore awaits `routeDACPMessage`. All 14 message types used here are present in
 * `HANDLER_MAP`, so none needed a direct-call fallback.
 *
 * These assert what the code does TODAY. Where today's behaviour is security-relevant or
 * surprising, the assertion carries a `// CHARACTERIZATION:` comment saying so.
 */
import { afterEach, describe, expect, it } from "vite-plus/test"
import { ChannelError } from "@finos/fdc3"

import { MockTransport } from "../../__tests__/utils/mock-transport"
import { DEFAULT_FDC3_USER_CHANNELS } from "../../agent/default-user-channels"
import { createInitialState } from "../../state/initial-state"
import {
  addApp,
  addContextListener,
  addPendingIntent,
  addPrivateChannelAddContextListenerListener,
  connectInstance,
  createAppChannel,
  createPrivateChannel,
  joinUserChannel,
  registerIntentListener,
  updateInstanceState,
} from "../../state/mutators"
import { linkHandshakeRoutingId } from "../../state/mutators/wcp-handshake-routing"
import { getEventListener, getIntentListener, getPrivateChannel } from "../../state/selectors"
import { AppInstanceState, type AgentState } from "../../state/types"
import { routeDACPMessage } from "../index"
import { clearAllHeartbeatTimersForTesting } from "../heartbeat/runtime"
import { clearAllPendingOpenWithContextTimeoutsForTesting } from "../utils/open-with-context"
import { handlePrivateChannelAddContextListenerRequest } from "../private-channels/handlers"
import { createDACPTestParams, createDacpRequestMeta, withResponseDispatcher } from "./test-params"

/** The validated WCP5 instance — registered in `state.instances`, connected. */
const VALIDATED_ID = "validated-wcp5-instance"
const APP_ID = "ChartApp"
/** Pre-WCP5 routing id, linked to VALIDATED_ID by `linkHandshakeRoutingId`. */
const HANDSHAKE_ROUTING_ID = "temp-handshake-window"
/** A MessagePort id that was never registered and was never linked to anything. */
const UNREGISTERED_PORT_ID = "port-never-registered"
const PRIVATE_CHANNEL_ID = "private-channel-1"
const JOINED_CHANNEL_ID = "fdc3.channel.1"
const OTHER_CHANNEL_ID = "fdc3.channel.2"
const INTENT_NAME = "ViewChart"
/** The intent raiser, i.e. the instance the intent RESULT is ultimately delivered back to. */
const SOURCE_INSTANCE_ID = "raiser-instance"
const SOURCE_APP_ID = "RaiserApp"

type WireMessage = {
  type: string
  meta?: { destination?: { instanceId?: string } }
  payload?: {
    error?: string
    listenerUUID?: string
    channel?: unknown
    privateChannel?: { id?: string }
    implementationMetadata?: { appMetadata?: { instanceId?: string } }
  }
}

afterEach(() => {
  clearAllHeartbeatTimersForTesting()
  clearAllPendingOpenWithContextTimeoutsForTesting()
})

/**
 * The handshake window: VALIDATED_ID is the registered, connected instance; HANDSHAKE_ROUTING_ID is
 * linked to it via WCP5 handshake routing but is itself unregistered.
 */
function handshakeWindowState(): AgentState {
  let state = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
  state = connectInstance(state, {
    instanceId: VALIDATED_ID,
    appId: APP_ID,
    metadata: { name: APP_ID },
  })
  state = updateInstanceState(state, VALIDATED_ID, AppInstanceState.CONNECTED)
  state = linkHandshakeRoutingId(state, HANDSHAKE_ROUTING_ID, VALIDATED_ID)
  return state
}

/** A handler params stamped with the raw wire `instanceId`, exactly as the router receives it. */
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

/** A private channel owned by VALIDATED_ID, which is therefore its only connected instance. */
function stateWithPrivateChannel(): AgentState {
  return createPrivateChannel(handshakeWindowState(), PRIVATE_CHANNEL_ID, APP_ID, VALIDATED_ID)
}

describe("private-channels access control through routeDACPMessage", () => {
  it("GRANTS a linked temp- id the addEventListener gate on the linked instance's channel", async () => {
    const transport = new MockTransport()
    const { params, getState } = contextFor(
      HANDSHAKE_ROUTING_ID,
      stateWithPrivateChannel(),
      transport,
    )

    await routeDACPMessage(
      {
        type: "privateChannelAddEventListenerRequest",
        meta: createDacpRequestMeta("private-add-listener-routed", {
          appId: APP_ID,
          instanceId: HANDSHAKE_ROUTING_ID,
        }),
        payload: { privateChannelId: PRIVATE_CHANNEL_ID, listenerType: "addContextListener" },
      },
      params,
    )

    const response = lastMessage(transport)
    expect(response.type).toBe("privateChannelAddEventListenerResponse")
    // CHARACTERIZATION — THE SECURITY ANSWER. `connectedInstances.includes(instanceId)` at
    // private-channels/handlers.ts:171 is an ACCESS-CONTROL gate. Through the router the wire id
    // has already been resolved to VALIDATED_ID, which IS a member, so access is GRANTED and the
    // listener is registered under VALIDATED_ID — not under the temp- wire id.
    expect(response.payload?.error).toBeUndefined()
    const listeners = getPrivateChannel(getState(), PRIVATE_CHANNEL_ID)!.addContextListenerListeners
    expect(Object.values(listeners).map(listener => listener.instanceId)).toEqual([VALIDATED_ID])
  })

  it("GRANTS a linked temp- id the disconnect gate, tearing down the linked instance's channel", async () => {
    const transport = new MockTransport()
    const { params, getState } = contextFor(
      HANDSHAKE_ROUTING_ID,
      stateWithPrivateChannel(),
      transport,
    )

    await routeDACPMessage(
      {
        type: "privateChannelDisconnectRequest",
        meta: createDacpRequestMeta("private-disconnect-routed", {
          appId: APP_ID,
          instanceId: HANDSHAKE_ROUTING_ID,
        }),
        payload: { channelId: PRIVATE_CHANNEL_ID },
      },
      params,
    )

    const response = lastMessage(transport)
    expect(response.type).toBe("privateChannelDisconnectResponse")
    // CHARACTERIZATION: the membership gate at private-channels/handlers.ts:103 is likewise
    // satisfied by the resolved id. Because VALIDATED_ID is the channel's creator and sole member,
    // `disconnectInstanceFromPrivateChannel` deletes the channel outright (private-channel.ts:120).
    // So a single message arriving under the handshake routing id destroys the private channel.
    expect(response.payload?.error).toBeUndefined()
    expect(getPrivateChannel(getState(), PRIVATE_CHANNEL_ID)).toBeUndefined()
  })

  it("GRANTS a linked temp- id ownership of the linked instance's private channel listener on unsubscribe", async () => {
    const transport = new MockTransport()
    const listenerUUID = "private-listener-owned-by-validated"
    const state = addPrivateChannelAddContextListenerListener(
      stateWithPrivateChannel(),
      PRIVATE_CHANNEL_ID,
      listenerUUID,
      VALIDATED_ID,
    )
    const { params, getState } = contextFor(HANDSHAKE_ROUTING_ID, state, transport)

    await routeDACPMessage(
      {
        type: "privateChannelUnsubscribeEventListenerRequest",
        meta: createDacpRequestMeta("private-unsub-routed", {
          appId: APP_ID,
          instanceId: HANDSHAKE_ROUTING_ID,
        }),
        payload: { listenerUUID },
      },
      params,
    )

    const response = lastMessage(transport)
    expect(response.type).toBe("privateChannelUnsubscribeEventListenerResponse")
    // CHARACTERIZATION: the ownership check at private-channels/handlers.ts:261 compares the
    // listener's instanceId against the RESOLVED id, so the handshake routing id may remove a
    // listener registered under VALIDATED_ID.
    expect(response.payload?.error).toBeUndefined()
    expect(
      getPrivateChannel(getState(), PRIVATE_CHANNEL_ID)?.addContextListenerListeners[listenerUUID],
    ).toBeUndefined()
  })

  it("DENIES an unregistered, unlinked MessagePort id at the addEventListener gate", async () => {
    const transport = new MockTransport()
    const { params, getState } = contextFor(
      UNREGISTERED_PORT_ID,
      stateWithPrivateChannel(),
      transport,
    )

    await routeDACPMessage(
      {
        type: "privateChannelAddEventListenerRequest",
        meta: createDacpRequestMeta("private-add-listener-unlinked", {
          appId: APP_ID,
          instanceId: UNREGISTERED_PORT_ID,
        }),
        payload: { privateChannelId: PRIVATE_CHANNEL_ID, listenerType: "addContextListener" },
      },
      params,
    )

    // With no registration and no handshake link the resolver returns its input unchanged, so the
    // gate still sees a non-member. This is the boundary of the grant above.
    expect(lastMessage(transport).payload?.error).toBe(ChannelError.AccessDenied)
    expect(
      Object.keys(getPrivateChannel(getState(), PRIVATE_CHANNEL_ID)!.addContextListenerListeners),
    ).toHaveLength(0)
  })

  /**
   * No app-authored-`meta.source` spoofing test lives here, deliberately. `routeDACPMessage` never
   * reads `meta.source` — it resolves from `inboundContext.instanceId` alone — so a spoofing test
   * written at this layer would assert a tautology: it passes whatever `meta.source` says, and
   * would still pass with the resolver deleted.
   *
   * That boundary is one layer up. `SailDesktopAgent.extractInstanceId` DOES read
   * `meta.source.instanceId` to build the params, and the defence is
   * `BrowserAppConnection.enrichMessageWithSource` discarding the app's `source` / `messageOrigin`
   * / `hostInstanceId` and overwriting `source` with the port-derived identity. That is covered by
   * `src/app-connection/__tests__/wcp-trusted-metadata.test.ts` — see "attributes a broadcast to
   * the sending port, not an app-claimed meta.hostInstanceId", which drives the real browser edge.
   */

  it("creates a private channel owned by the linked instance when routed under a temp- id", async () => {
    const transport = new MockTransport()
    const { params, getState } = contextFor(HANDSHAKE_ROUTING_ID, handshakeWindowState(), transport)

    await routeDACPMessage(
      {
        type: "createPrivateChannelRequest",
        meta: createDacpRequestMeta("create-private-routed", {
          appId: APP_ID,
          instanceId: HANDSHAKE_ROUTING_ID,
        }),
        payload: {},
      },
      params,
    )

    const response = lastMessage(transport)
    expect(response.type).toBe("createPrivateChannelResponse")
    expect(response.payload?.error).toBeUndefined()
    const channelId = response.payload?.privateChannel?.id
    expect(channelId).toBeDefined()
    // The new channel belongs to VALIDATED_ID, so the app keeps access after the handshake closes.
    expect(getPrivateChannel(getState(), channelId!)?.creatorInstanceId).toBe(VALIDATED_ID)
    expect(getPrivateChannel(getState(), channelId!)?.connectedInstances).toEqual([VALIDATED_ID])
  })

  /**
   * Seam guard, deliberately NOT routed. Resolution now lives solely in `routeDACPMessage`; the
   * handler body must not resolve on its own. Called directly, the handler sees the raw wire id and
   * denies. If someone reintroduces `resolveDacpHandlerInstanceId` into this handler (or moves
   * resolution into `createHandlerContext`), this test flips to GRANTED and fails — which is the
   * point. It is the only direct handler call in this file.
   */
  it("denies a linked temp- id when the handler is called directly, proving the handler body does not resolve", () => {
    const transport = new MockTransport()
    const { params, getState } = contextFor(
      HANDSHAKE_ROUTING_ID,
      stateWithPrivateChannel(),
      transport,
    )

    handlePrivateChannelAddContextListenerRequest(
      {
        type: "privateChannelAddEventListenerRequest",
        meta: createDacpRequestMeta("private-add-listener-direct", {
          appId: APP_ID,
          instanceId: HANDSHAKE_ROUTING_ID,
        }),
        payload: { privateChannelId: PRIVATE_CHANNEL_ID, listenerType: "addContextListener" },
      },
      params,
    )

    expect(lastMessage(transport).payload?.error).toBe(ChannelError.AccessDenied)
    expect(
      Object.keys(getPrivateChannel(getState(), PRIVATE_CHANNEL_ID)!.addContextListenerListeners),
    ).toHaveLength(0)
  })
})

describe("channels handlers through routeDACPMessage", () => {
  it("reports the linked instance's current channel for a linked temp- id", async () => {
    const transport = new MockTransport()
    const state = joinUserChannel(handshakeWindowState(), VALIDATED_ID, JOINED_CHANNEL_ID)
    const { params } = contextFor(HANDSHAKE_ROUTING_ID, state, transport)

    await routeDACPMessage(
      {
        type: "getCurrentChannelRequest",
        meta: createDacpRequestMeta("get-current-channel-routed", {
          appId: APP_ID,
          instanceId: HANDSHAKE_ROUTING_ID,
        }),
        payload: {},
      },
      params,
    )

    const response = lastMessage(transport)
    expect(response.type).toBe("getCurrentChannelResponse")
    // The resolved id finds the registered instance, so the real channel is reported.
    expect(response.payload?.channel).toMatchObject({ id: JOINED_CHANNEL_ID })
  })

  it("moves the linked instance when joinUserChannelRequest arrives under a linked temp- id", async () => {
    const transport = new MockTransport()
    const state = joinUserChannel(handshakeWindowState(), VALIDATED_ID, JOINED_CHANNEL_ID)
    const { params, getState } = contextFor(HANDSHAKE_ROUTING_ID, state, transport)

    await routeDACPMessage(
      {
        type: "joinUserChannelRequest",
        meta: createDacpRequestMeta("join-channel-routed", {
          appId: APP_ID,
          instanceId: HANDSHAKE_ROUTING_ID,
        }),
        payload: { channelId: OTHER_CHANNEL_ID },
      },
      params,
    )

    const response = lastMessage(transport)
    expect(response.type).toBe("joinUserChannelResponse")
    expect(response.payload?.error).toBeUndefined()
    // The join takes effect on VALIDATED_ID. Called directly the same message is a silent no-op,
    // because `joinUserChannel` ignores an unregistered instance id.
    expect(getState().instances[VALIDATED_ID]?.currentUserChannel).toBe(OTHER_CHANNEL_ID)
  })
})

describe("open handlers through routeDACPMessage", () => {
  it("returns appMetadata for the linked instance on getInfoRequest under a temp- id", async () => {
    const transport = new MockTransport()
    const { params } = contextFor(HANDSHAKE_ROUTING_ID, handshakeWindowState(), transport)

    await routeDACPMessage(
      {
        type: "getInfoRequest",
        meta: createDacpRequestMeta("get-info-routed", {
          appId: APP_ID,
          instanceId: HANDSHAKE_ROUTING_ID,
        }),
        payload: {},
      },
      params,
    )

    const response = lastMessage(transport)
    expect(response.type).toBe("getInfoResponse")
    // `fdc3.getInfo().appMetadata.instanceId` is what an app uses to identify itself. It reports
    // the resolved id, so the app learns its validated identity rather than the routing id.
    expect(response.payload?.implementationMetadata?.appMetadata?.instanceId).toBe(VALIDATED_ID)
  })
})

describe("intent-discovery handlers through routeDACPMessage", () => {
  it("routes findIntentResponse to the linked instance, not the temp- wire id", async () => {
    const transport = new MockTransport()
    const state = addApp(handshakeWindowState(), {
      appId: APP_ID,
      title: APP_ID,
      type: "web",
      details: { url: "https://example.com/chart" },
      interop: {
        intents: {
          listensFor: {
            [INTENT_NAME]: { displayName: INTENT_NAME, contexts: ["fdc3.instrument"] },
          },
        },
      },
    })
    const { params } = contextFor(HANDSHAKE_ROUTING_ID, state, transport)

    await routeDACPMessage(
      {
        type: "findIntentRequest",
        meta: createDacpRequestMeta("find-intent-routed", {
          appId: APP_ID,
          instanceId: HANDSHAKE_ROUTING_ID,
        }),
        payload: { intent: INTENT_NAME },
      },
      params,
    )

    const response = lastMessage(transport)
    expect(response.type).toBe("findIntentResponse")
    expect(response.payload?.error).toBeUndefined()
    // CHARACTERIZATION: intent-discovery uses the id only for response routing. Every routed
    // response is now addressed to the resolved id — worth noting because the app edge that sent
    // the request is keyed by the wire id.
    expect(response.meta?.destination?.instanceId).toBe(VALIDATED_ID)
  })
})

describe("intent-listener handlers through routeDACPMessage: add and unsubscribe agree", () => {
  it("registers an intent listener against the linked instance when routed under a temp- id", async () => {
    const transport = new MockTransport()
    const { params, getState } = contextFor(HANDSHAKE_ROUTING_ID, handshakeWindowState(), transport)

    await routeDACPMessage(
      {
        type: "addIntentListenerRequest",
        meta: createDacpRequestMeta("add-intent-listener-routed", {
          appId: APP_ID,
          instanceId: HANDSHAKE_ROUTING_ID,
        }),
        payload: { intent: INTENT_NAME },
      },
      params,
    )

    const response = lastMessage(transport)
    expect(response.type).toBe("addIntentListenerResponse")
    expect(response.payload?.error).toBeUndefined()
    const listenerUUID = response.payload?.listenerUUID
    expect(listenerUUID).toBeDefined()
    // Add now agrees with unsubscribe: both land on VALIDATED_ID.
    expect(getIntentListener(getState(), listenerUUID!)?.instanceId).toBe(VALIDATED_ID)
  })

  it("lets a linked temp- id unsubscribe the linked instance's intent listener", async () => {
    const transport = new MockTransport()
    const listenerUUID = "intent-listener-owned-by-validated"
    const state = registerIntentListener(handshakeWindowState(), {
      listenerId: listenerUUID,
      intentName: INTENT_NAME,
      instanceId: VALIDATED_ID,
      appId: APP_ID,
      contextTypes: [],
    })
    const { params, getState } = contextFor(HANDSHAKE_ROUTING_ID, state, transport)

    await routeDACPMessage(
      {
        type: "intentListenerUnsubscribeRequest",
        meta: createDacpRequestMeta("intent-unsub-routed", {
          appId: APP_ID,
          instanceId: HANDSHAKE_ROUTING_ID,
        }),
        payload: { listenerUUID },
      },
      params,
    )

    const response = lastMessage(transport)
    expect(response.type).toBe("intentListenerUnsubscribeResponse")
    expect(response.payload?.error).toBeUndefined()
    expect(getIntentListener(getState(), listenerUUID)).toBeUndefined()
  })
})

describe("intent-result handlers through routeDACPMessage", () => {
  /**
   * Guards the raw -> resolved response-routing flip at `intent-result-handlers.ts:126`. That
   * handler used to hold two different ids at once: the RAW wire id for routing this response, and
   * the RESOLVED id for its `pendingIntent.targetInstanceId` ownership gate. Slice 1 settled it on
   * the resolved id, so the response is now delivered rather than dropped — the connection registry
   * re-keys the port map to the validated id (`wcp-connection-management.ts:252-261`). Nothing else
   * pins this, so do not "simplify" the destination back to the wire id.
   */
  it("addresses intentResultResponse to the resolved instance, not the temp- wire id", async () => {
    const transport = new MockTransport()
    const raiseIntentRequestUuid = "raise-intent-for-result"
    let state = connectInstance(handshakeWindowState(), {
      instanceId: SOURCE_INSTANCE_ID,
      appId: SOURCE_APP_ID,
      metadata: { name: SOURCE_APP_ID },
    })
    state = updateInstanceState(state, SOURCE_INSTANCE_ID, AppInstanceState.CONNECTED)
    // The pending intent is owned by VALIDATED_ID, so the handler's ownership gate only passes if
    // the router resolved the temp- id before dispatch.
    state = addPendingIntent(state, {
      requestId: raiseIntentRequestUuid,
      intentName: INTENT_NAME,
      context: { type: "fdc3.instrument" },
      sourceInstanceId: SOURCE_INSTANCE_ID,
      targetInstanceId: VALIDATED_ID,
      targetAppId: APP_ID,
    })

    const { params } = contextFor(HANDSHAKE_ROUTING_ID, state, transport)

    await routeDACPMessage(
      {
        type: "intentResultRequest",
        meta: createDacpRequestMeta("intent-result-routed", {
          appId: APP_ID,
          instanceId: HANDSHAKE_ROUTING_ID,
        }),
        payload: {
          raiseIntentRequestUuid,
          intentEventUuid: "intent-event-1",
          intentResult: { context: { type: "fdc3.instrument" } },
        },
      },
      params,
    )

    const intentResultResponse = (transport.sentMessages as WireMessage[]).find(
      message => message.type === "intentResultResponse",
    )
    expect(intentResultResponse?.meta?.destination?.instanceId).toBe(VALIDATED_ID)
  })
})

describe("events handlers through routeDACPMessage: add and unsubscribe agree", () => {
  it("registers an event listener against the linked instance when routed under a temp- id", async () => {
    const transport = new MockTransport()
    const { params, getState } = contextFor(HANDSHAKE_ROUTING_ID, handshakeWindowState(), transport)

    await routeDACPMessage(
      {
        type: "addEventListenerRequest",
        meta: createDacpRequestMeta("add-event-listener-routed", {
          appId: APP_ID,
          instanceId: HANDSHAKE_ROUTING_ID,
        }),
        payload: { type: "USER_CHANNEL_CHANGED" },
      },
      params,
    )

    const response = lastMessage(transport)
    expect(response.type).toBe("addEventListenerResponse")
    expect(response.payload?.error).toBeUndefined()
    const listenerUUID = response.payload?.listenerUUID
    expect(listenerUUID).toBeDefined()
    expect(getEventListener(getState(), listenerUUID!)?.instanceId).toBe(VALIDATED_ID)
  })

  it("lets a linked temp- id unsubscribe the linked instance's event listener", async () => {
    const transport = new MockTransport()
    const { params, getState } = contextFor(HANDSHAKE_ROUTING_ID, handshakeWindowState(), transport)

    await routeDACPMessage(
      {
        type: "addEventListenerRequest",
        meta: createDacpRequestMeta("add-event-listener-for-unsub", {
          appId: APP_ID,
          instanceId: HANDSHAKE_ROUTING_ID,
        }),
        payload: { type: "USER_CHANNEL_CHANGED" },
      },
      params,
    )
    const listenerUUID = lastMessage(transport).payload?.listenerUUID
    expect(listenerUUID).toBeDefined()

    await routeDACPMessage(
      {
        type: "eventListenerUnsubscribeRequest",
        meta: createDacpRequestMeta("event-unsub-routed", {
          appId: APP_ID,
          instanceId: HANDSHAKE_ROUTING_ID,
        }),
        payload: { listenerUUID: listenerUUID! },
      },
      params,
    )

    const response = lastMessage(transport)
    expect(response.type).toBe("eventListenerUnsubscribeResponse")
    expect(response.payload?.error).toBeUndefined()
    expect(getEventListener(getState(), listenerUUID!)).toBeUndefined()
  })
})

describe("broadcast handlers through routeDACPMessage", () => {
  it("registers a context listener from a linked temp- id against the linked instance", async () => {
    const transport = new MockTransport()
    const requestUuid = "add-context-listener-routed"
    const { params, getState } = contextFor(HANDSHAKE_ROUTING_ID, handshakeWindowState(), transport)

    await routeDACPMessage(
      {
        type: "addContextListenerRequest",
        meta: createDacpRequestMeta(requestUuid, {
          appId: APP_ID,
          instanceId: HANDSHAKE_ROUTING_ID,
        }),
        payload: { channelId: null, contextType: "fdc3.instrument" },
      },
      params,
    )

    const response = lastMessage(transport)
    expect(response.type).toBe("addContextListenerResponse")
    expect(response.payload?.error).toBeUndefined()
    expect(getState().instances[VALIDATED_ID]?.contextListeners[requestUuid]).toBeDefined()
    expect(getState().instances[HANDSHAKE_ROUTING_ID]).toBeUndefined()
  })

  /**
   * Routed equivalent of `broadcast-stale-instance.test.ts`'s first case, which calls
   * `handleBroadcastRequest` directly and fails after the refactor. The production behaviour it
   * guards — a broadcast arriving under a handshake routing id reaching the right listeners — is
   * intact through the real entry point, and this test is the proof.
   */
  it("delivers a broadcast arriving under a handshake routing id to the listener on the channel", async () => {
    const transport = new MockTransport()
    const listenerInstanceId = "listener-instance"
    const appControlChannelId = "app-control"

    let state = handshakeWindowState()
    state = connectInstance(state, {
      instanceId: listenerInstanceId,
      appId: "ListenerApp",
      metadata: { name: "ListenerApp" },
    })
    state = updateInstanceState(state, listenerInstanceId, AppInstanceState.CONNECTED)
    state = createAppChannel(state, appControlChannelId)
    state = addContextListener(
      state,
      listenerInstanceId,
      "close-listener",
      "closeWindow",
      appControlChannelId,
    )

    const { params } = contextFor(HANDSHAKE_ROUTING_ID, state, transport)

    await routeDACPMessage(
      {
        type: "broadcastRequest",
        meta: createDacpRequestMeta("broadcast-routed", {
          appId: APP_ID,
          instanceId: HANDSHAKE_ROUTING_ID,
        }),
        payload: {
          channelId: appControlChannelId,
          context: { type: "closeWindow", testId: "close-1" },
        },
      },
      params,
    )

    const broadcastEvent = (transport.sentMessages as WireMessage[]).find(
      message => message.type === "broadcastEvent",
    )
    expect(broadcastEvent?.meta?.destination?.instanceId).toBe(listenerInstanceId)

    const response = lastMessage(transport)
    expect(response.type).toBe("broadcastResponse")
    expect(response.payload?.error).toBeUndefined()
  })
})
