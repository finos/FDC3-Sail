import { describe, expect, it } from "vite-plus/test"
import type { BrowserTypes } from "@finos/fdc3"

import { MockTransport } from "../../__tests__/utils/mock-transport"
import { DEFAULT_FDC3_USER_CHANNELS } from "../../agent/default-user-channels"
import { createInitialState } from "../../state/initial-state"
import {
  addContextListener,
  connectInstance,
  joinUserChannel,
  updateInstanceState,
} from "../../state/mutators"
import { AppInstanceState } from "../../state/types"
import { createDACPTestParams, createDacpRequestMeta, withResponseDispatcher } from "./test-params"
import { handleBroadcastRequest } from "../broadcast/handlers"

type BroadcastRequest = BrowserTypes.BroadcastRequest

const CHANNEL_ID = "fdc3.channel.1"

function contextForVersion(fdc3Version: string) {
  const senderId = "a1"
  const listenerId = "a2"

  let state = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
  state = connectInstance(state, {
    instanceId: senderId,
    appId: "App1",
    metadata: { name: "App1" },
  })
  state = connectInstance(state, {
    instanceId: listenerId,
    appId: "App2",
    metadata: { name: "App2" },
  })
  state = updateInstanceState(state, senderId, AppInstanceState.CONNECTED)
  state = updateInstanceState(state, listenerId, AppInstanceState.CONNECTED)
  state = joinUserChannel(state, senderId, CHANNEL_ID)
  state = joinUserChannel(state, listenerId, CHANNEL_ID)
  state = addContextListener(state, listenerId, "listener-1", "fdc3.instrument", CHANNEL_ID)

  const transport = new MockTransport()
  const { params: baseParams } = createDACPTestParams({ instanceId: senderId, initialState: state })
  const params = {
    ...withResponseDispatcher(baseParams, transport),
    implementationMetadata: {
      ...baseParams.implementationMetadata,
      fdc3Version,
    },
  }

  return { params, transport, senderId }
}

function broadcastEventMetadata(transport: MockTransport): Record<string, unknown> | undefined {
  const event = transport.sentMessages.find(
    (message): message is { type: string; payload?: { metadata?: Record<string, unknown> } } =>
      typeof message === "object" &&
      message !== null &&
      "type" in message &&
      (message as { type: string }).type === "broadcastEvent",
  )
  return event?.payload?.metadata
}

/**
 * Regression coverage for the FDC3 3.0 app-provided ContextMetadata version gate.
 *
 * `payload.metadata` on broadcastRequest is a 3.0-only field. The 2.2 JSON Schema sets
 * `additionalProperties: false`, so it must not be READ at 2.2 at all. The outbound
 * broadcastEvent must still carry the DA-derived base ContextMetadata (source + timestamp)
 * regardless of version -- only the app-supplied additions are gated.
 * See src/handlers/broadcast/handlers.ts.
 */
describe("handleBroadcastRequest payload.metadata version gate", () => {
  it("ignores app-provided payload.metadata at FDC3 2.2 -- base ContextMetadata still forwarded", () => {
    const { params, transport, senderId } = contextForVersion("2.2")

    const message = {
      type: "broadcastRequest",
      meta: createDacpRequestMeta("meta-gate-2.2", { appId: "App1", instanceId: senderId }),
      payload: {
        channelId: CHANNEL_ID,
        context: { type: "fdc3.instrument" },
        metadata: { traceId: "trace-2.2" },
      },
    } as BroadcastRequest

    handleBroadcastRequest(message, params)

    const metadata = broadcastEventMetadata(transport)
    expect(metadata).toBeDefined()
    expect(metadata?.traceId).toBeUndefined()
    expect(metadata?.source).toBeDefined()
  })

  it("honors app-provided payload.metadata at FDC3 3.0", () => {
    const { params, transport, senderId } = contextForVersion("3.0")

    const message = {
      type: "broadcastRequest",
      meta: createDacpRequestMeta("meta-gate-3.0", { appId: "App1", instanceId: senderId }),
      payload: {
        channelId: CHANNEL_ID,
        context: { type: "fdc3.instrument" },
        metadata: { traceId: "trace-3.0" },
      },
    } as BroadcastRequest

    handleBroadcastRequest(message, params)

    const metadata = broadcastEventMetadata(transport)
    expect(metadata?.traceId).toBe("trace-3.0")
  })
})

/**
 * Regression coverage for Decision B: broadcastRequest.payload.channelId is required by the
 * 2.2/3.0 schema. A message missing it must not silently fall back to the sender's current
 * user channel -- it must be treated as a malformed message and rejected with an error
 * response, and no broadcastEvent may be delivered.
 */
describe("handleBroadcastRequest missing channelId", () => {
  it("rejects a broadcastRequest without channelId instead of falling back to the current channel", () => {
    const { params, transport, senderId } = contextForVersion("2.2")

    const message = {
      type: "broadcastRequest",
      meta: createDacpRequestMeta("no-channel-id", { appId: "App1", instanceId: senderId }),
      payload: {
        context: { type: "fdc3.instrument" },
      },
    } as BroadcastRequest

    handleBroadcastRequest(message, params)

    const broadcastEvent = transport.sentMessages.find(
      (m): m is { type: string } =>
        typeof m === "object" &&
        m !== null &&
        "type" in m &&
        (m as { type: string }).type === "broadcastEvent",
    )
    expect(broadcastEvent).toBeUndefined()

    const response = transport.getLastMessage() as { type: string; payload?: { error?: string } }
    expect(response.type).toBe("broadcastResponse")
    expect(response.payload?.error).toBe("NoChannelFound")
  })
})
