import { describe, expect, it } from "vite-plus/test"
import type { BrowserTypes } from "@finos/fdc3"

import { MockTransport } from "../../__tests__/utils/mock-transport"
import { DEFAULT_FDC3_USER_CHANNELS } from "../../agent/default-user-channels"
import { createInitialState } from "../../state/initial-state"
import {
  addContextListener,
  addPendingOpenWithContext,
  connectInstance,
  createAppChannel,
  updateInstanceState,
} from "../../state/mutators"
import { linkHandshakeRoutingId } from "../../state/mutators/wcp-handshake-routing"
import { AppInstanceState } from "../../state/types"
import { createDACPTestParams, createDacpRequestMeta } from "./test-params"
import { withResponseDispatcher } from "./test-params"
import { handleAddContextListener, handleBroadcastRequest } from "../broadcast/handlers"
import { routeDACPMessage } from "../index"

describe("handleBroadcastRequest stale instance routing", () => {
  /**
   * Must go through `routeDACPMessage`, not `handleBroadcastRequest` directly. Instance-id
   * resolution lives at the router (`index.ts` stamps `resolveDacpHandlerInstanceId` onto the
   * context before dispatch); handler bodies no longer resolve. A direct call therefore hands the
   * handler the raw wire id and stops exercising the real path — which is exactly the behaviour
   * this test exists to guard. Do not "simplify" it back to a direct handler call.
   */
  it("resolves handshake routing id to the validated connected instance via wcpHandshakeRouting", async () => {
    const transport = new MockTransport()
    const handshakeRoutingId = "stale-conformance-instance"
    const validatedInstanceId = "live-conformance-instance"
    const listenerInstanceId = "mock-app-instance"
    const appControlChannelId = "app-control"

    let state = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
    state = connectInstance(state, {
      instanceId: validatedInstanceId,
      appId: "Conformance1",
      metadata: { name: "Conformance1" },
    })
    state = connectInstance(state, {
      instanceId: listenerInstanceId,
      appId: "MockAppId",
      metadata: { name: "MockAppId" },
    })
    state = updateInstanceState(state, validatedInstanceId, AppInstanceState.CONNECTED)
    state = updateInstanceState(state, listenerInstanceId, AppInstanceState.CONNECTED)
    state = createAppChannel(state, appControlChannelId)
    state = addContextListener(
      state,
      listenerInstanceId,
      "close-listener",
      "closeWindow",
      appControlChannelId,
    )
    state = linkHandshakeRoutingId(state, handshakeRoutingId, validatedInstanceId)

    const { params } = createDACPTestParams({
      instanceId: handshakeRoutingId,
      initialState: state,
    })

    await routeDACPMessage(
      {
        type: "broadcastRequest",
        meta: createDacpRequestMeta("broadcast-close-window", {
          appId: "Conformance1",
          instanceId: handshakeRoutingId,
        }),
        payload: {
          channelId: appControlChannelId,
          context: { type: "closeWindow", testId: "close-1" },
        },
      },
      withResponseDispatcher(params, transport),
    )

    const response = transport.getLastMessage() as { type: string; payload?: { error?: string } }
    expect(response.type).toBe("broadcastResponse")
    expect(response.payload?.error).toBeUndefined()

    const broadcastEvent = transport.sentMessages.find(
      (message): message is { type: string; meta?: { destination?: { instanceId?: string } } } =>
        typeof message === "object" &&
        message !== null &&
        "type" in message &&
        (message as { type: string }).type === "broadcastEvent",
    )

    expect(broadcastEvent?.meta?.destination?.instanceId).toBe(listenerInstanceId)
  })

  /**
   * The two tests below still call handlers directly, and that is fine — but note what they do and
   * do not cover. Since instance-id resolution moved to `routeDACPMessage`, a direct handler call
   * no longer exercises resolution at all. Both use ids that are already registered, so raw and
   * resolved are identical and the distinction does not arise; they assert response/event routing
   * and ordering, not id resolution. Only the first test in this file guards resolution.
   */
  it("returns broadcastResponse to the connected sender when another instance has pending open", () => {
    const transport = new MockTransport()
    const connectedSenderId = "connected-mock-instance"
    const pendingTargetId = "pending-mock-launch"
    const conformanceInstanceId = "conformance-1"
    const appControlChannelId = "app-control"
    const appId = "MockAppId"

    const openRequest = {
      type: "openRequest",
      meta: {
        requestUuid: "open-req-pending-other",
        timestamp: new Date(),
        source: { appId: "Conformance1", instanceId: conformanceInstanceId },
      },
      payload: {
        app: { appId, instanceId: pendingTargetId },
        context: { type: "fdc3.instrument", id: { ticker: "MSFT" } },
      },
    } as BrowserTypes.OpenRequest

    let state = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
    state = connectInstance(state, {
      instanceId: connectedSenderId,
      appId,
      metadata: { name: appId },
    })
    state = updateInstanceState(state, connectedSenderId, AppInstanceState.CONNECTED)
    state = connectInstance(state, {
      instanceId: pendingTargetId,
      appId,
      metadata: { name: appId },
    })
    state = createAppChannel(state, appControlChannelId)
    state = addPendingOpenWithContext(state, pendingTargetId, {
      message: openRequest,
      appIdentifier: { appId, instanceId: pendingTargetId },
      launchContext: openRequest.payload.context!,
      sourceInstanceId: conformanceInstanceId,
    })

    const { params } = createDACPTestParams({
      instanceId: connectedSenderId,
      initialState: state,
    })

    handleBroadcastRequest(
      {
        type: "broadcastRequest",
        meta: createDacpRequestMeta("window-closed-broadcast", {
          appId,
          instanceId: connectedSenderId,
        }),
        payload: {
          channelId: appControlChannelId,
          context: { type: "windowClosed", testId: "teardown-1" },
        },
      },
      withResponseDispatcher(params, transport),
    )

    const response = transport.getLastMessage() as {
      type: string
      meta?: { destination?: { instanceId?: string } }
      payload?: { error?: string }
    }
    expect(response.type).toBe("broadcastResponse")
    expect(response.payload?.error).toBeUndefined()
    expect(response.meta?.destination?.instanceId).toBe(connectedSenderId)
  })

  it("sends listener response before pending open-with-context delivery", () => {
    const transport = new MockTransport()
    const sourceInstanceId = "source-conformance-instance"
    const targetInstanceId = "target-mock-instance"
    const appId = "MockAppId"
    const launchContext = { type: "fdc3.instrument", id: { ticker: "MSFT" } }

    const openRequest = {
      type: "openRequest",
      meta: {
        requestUuid: "open-with-context-req",
        timestamp: new Date(),
        source: { appId: "Conformance1", instanceId: sourceInstanceId },
      },
      payload: {
        app: { appId, instanceId: targetInstanceId },
        context: launchContext,
      },
    } as BrowserTypes.OpenRequest

    let state = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
    state = connectInstance(state, {
      instanceId: sourceInstanceId,
      appId: "Conformance1",
      metadata: { name: "Conformance1" },
    })
    state = connectInstance(state, {
      instanceId: targetInstanceId,
      appId,
      metadata: { name: appId },
    })
    state = updateInstanceState(state, sourceInstanceId, AppInstanceState.CONNECTED)
    state = updateInstanceState(state, targetInstanceId, AppInstanceState.CONNECTED)
    state = addPendingOpenWithContext(state, targetInstanceId, {
      message: openRequest,
      appIdentifier: { appId, instanceId: targetInstanceId },
      launchContext,
      sourceInstanceId,
    })

    const { params } = createDACPTestParams({
      instanceId: targetInstanceId,
      initialState: state,
    })

    handleAddContextListener(
      {
        type: "addContextListenerRequest",
        meta: createDacpRequestMeta("add-listener-req", {
          appId,
          instanceId: targetInstanceId,
        }),
        payload: {
          channelId: null,
          contextType: "fdc3.instrument",
        },
      },
      withResponseDispatcher(params, transport),
    )

    const messages = transport.sentMessages as Array<{
      type?: string
      meta?: { destination?: { instanceId?: string } }
    }>

    expect(messages.map(message => message.type)).toEqual([
      "addContextListenerResponse",
      "broadcastEvent",
      "openResponse",
    ])
    expect(messages.map(message => message.meta?.destination?.instanceId)).toEqual([
      targetInstanceId,
      targetInstanceId,
      sourceInstanceId,
    ])
  })
})
