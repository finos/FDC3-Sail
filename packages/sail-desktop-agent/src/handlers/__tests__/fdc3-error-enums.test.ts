import { describe, expect, it } from "vite-plus/test"
import type { BrowserTypes, Context } from "@finos/fdc3"
import { BridgingError, ChannelError, OpenError, ResolveError, ResultError } from "@finos/fdc3"
import { MockTransport } from "../../__tests__/utils/mock-transport"
import { connectInstance, updateInstanceState } from "../../state/mutators"
import { AppInstanceState } from "../../state/types"
import { createInitialState } from "../../state/initial-state"
import { DEFAULT_FDC3_USER_CHANNELS } from "../../agent/default-user-channels"
import { createDACPTestParams, createDacpRequestMeta, withResponseDispatcher } from "./test-params"
import { handleBroadcastRequest } from "../broadcast/handlers"
import { handleContextListenerUnsubscribe } from "../broadcast/handlers"
import { handleJoinUserChannelRequest } from "../channels/handlers"
import { handleCreatePrivateChannelRequest } from "../private-channels/handlers"
import { handleOpenRequest } from "../open/handlers"
import { handleAddIntentListener } from "../intents/intent-listener-handlers"
import { handleRaiseIntentRequest } from "../intents/intent-raise-intent"
import { handleAddEventListenerRequest } from "../events/handlers"

/** Cast a non-schema string into the closed `'USER_CHANNEL_CHANGED' | null` union to exercise the runtime guard. */
function asEventListenerType(value: string): BrowserTypes.AddEventListenerRequestPayload["type"] {
  return value as BrowserTypes.AddEventListenerRequestPayload["type"]
}

type ErrorResponseMessage = {
  type: string
  payload: { error: string }
}

function createConnectedHandlerContext(instanceId: string) {
  let state = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
  state = connectInstance(state, {
    instanceId,
    appId: "TestApp",
    metadata: { name: "TestApp" },
  })
  state = updateInstanceState(state, instanceId, AppInstanceState.CONNECTED)

  const transport = new MockTransport()
  const { params } = createDACPTestParams({ instanceId, initialState: state })
  return { params: withResponseDispatcher(params, transport), transport }
}

function getLastErrorPayload(transport: MockTransport): ErrorResponseMessage["payload"] {
  const last = transport.getLastMessage() as ErrorResponseMessage
  return last.payload
}

/**
 * Every member of `ResponsePayloadError` — the closed 24-string-literal DACP wire union in
 * `@finos/fdc3-schema` — is a value of one of these five runtime enums. `AgentError` is
 * deliberately excluded: its `AgentNotFound` / `ErrorOnConnect` / `InvalidFailover` values
 * describe `getAgent()` connection failures and are not part of the DACP wire union.
 */
const DACP_WIRE_ERROR_VALUES: ReadonlySet<string> = new Set<string>([
  ...Object.values(OpenError),
  ...Object.values(ResolveError),
  ...Object.values(ResultError),
  ...Object.values(ChannelError),
  ...Object.values(BridgingError),
])

describe("DACP handler error responses use @finos/fdc3 enum values", () => {
  const cases: Array<{
    name: string
    expectedError: string
    invoke: () => void | Promise<void>
  }> = [
    {
      name: "broadcastRequest with invalid context",
      expectedError: ChannelError.MalformedContext,
      invoke: () => {
        const { params, transport } = createConnectedHandlerContext("a1")
        handleBroadcastRequest(
          {
            type: "broadcastRequest",
            meta: createDacpRequestMeta("broadcast-malformed"),
            payload: {
              channelId: "missing-channel",
              context: { bogus: true } as unknown as Context,
            },
          },
          params,
        )
        expect(getLastErrorPayload(transport).error).toBe(ChannelError.MalformedContext)
      },
    },
    {
      name: "joinUserChannelRequest for missing channel",
      expectedError: ChannelError.NoChannelFound,
      invoke: () => {
        const { params, transport } = createConnectedHandlerContext("a1")
        handleJoinUserChannelRequest(
          {
            type: "joinUserChannelRequest",
            meta: createDacpRequestMeta("join-missing-channel"),
            payload: { channelId: "nonexistent-user-channel" },
          },
          params,
        )
        expect(getLastErrorPayload(transport).error).toBe(ChannelError.NoChannelFound)
      },
    },
    {
      name: "broadcastRequest to missing channel",
      expectedError: ChannelError.NoChannelFound,
      invoke: () => {
        const { params, transport } = createConnectedHandlerContext("a1")
        handleBroadcastRequest(
          {
            type: "broadcastRequest",
            meta: createDacpRequestMeta("broadcast-missing-channel"),
            payload: {
              channelId: "nonexistent-app-channel",
              context: { type: "fdc3.instrument", id: { ticker: "AAPL" } },
            },
          },
          params,
        )
        expect(getLastErrorPayload(transport).error).toBe(ChannelError.NoChannelFound)
      },
    },
    {
      name: "contextListenerUnsubscribe for unknown listener",
      expectedError: ChannelError.InvalidArguments,
      invoke: () => {
        const { params, transport } = createConnectedHandlerContext("a1")
        handleContextListenerUnsubscribe(
          {
            type: "contextListenerUnsubscribeRequest",
            meta: createDacpRequestMeta("unsub-unknown-listener"),
            payload: { listenerUUID: "unknown-listener-uuid" },
          },
          params,
        )
        expect(getLastErrorPayload(transport).error).toBe(ChannelError.InvalidArguments)
      },
    },
    {
      name: "createPrivateChannelRequest without connected instance",
      expectedError: ChannelError.CreationFailed,
      invoke: () => {
        const transport = new MockTransport()
        const { params } = createDACPTestParams({ instanceId: "disconnected-instance" })
        handleCreatePrivateChannelRequest(
          {
            type: "createPrivateChannelRequest",
            meta: createDacpRequestMeta("create-private-no-instance"),
            payload: {},
          },
          withResponseDispatcher(params, transport),
        )
        expect(getLastErrorPayload(transport).error).toBe(ChannelError.CreationFailed)
      },
    },
    {
      name: "openRequest without app launcher",
      expectedError: OpenError.ErrorOnLaunch,
      invoke: async () => {
        const { params, transport } = createConnectedHandlerContext("a1")
        await handleOpenRequest(
          {
            type: "openRequest",
            meta: createDacpRequestMeta("open-no-launcher"),
            payload: { app: { appId: "SomeApp" } },
          },
          params,
        )
        expect(getLastErrorPayload(transport).error).toBe(OpenError.ErrorOnLaunch)
      },
    },
    {
      name: "addIntentListener for missing instance",
      expectedError: ResolveError.TargetInstanceUnavailable,
      invoke: () => {
        const transport = new MockTransport()
        const { params } = createDACPTestParams({ instanceId: "missing-instance" })
        handleAddIntentListener(
          {
            type: "addIntentListenerRequest",
            meta: createDacpRequestMeta("intent-listener-missing-instance"),
            payload: { intent: "ViewChart" },
          },
          withResponseDispatcher(params, transport),
        )
        expect(getLastErrorPayload(transport).error).toBe(ResolveError.TargetInstanceUnavailable)
      },
    },
    {
      // `RaiseIntentRequestPayload.context` is required by the schema, so a missing context is
      // malformed. It must not skip validation and reach the `Context` cast downstream.
      name: "raiseIntentRequest with missing context",
      expectedError: ResolveError.MalformedContext,
      invoke: async () => {
        const { params, transport } = createConnectedHandlerContext("a1")
        await handleRaiseIntentRequest(
          {
            type: "raiseIntentRequest",
            meta: createDacpRequestMeta("raise-intent-missing-context"),
            payload: {
              intent: "ViewChart",
              context: undefined as unknown as Context,
            },
          },
          params,
        )
        expect(getLastErrorPayload(transport).error).toBe(ResolveError.MalformedContext)
      },
    },
    {
      name: "raiseIntentRequest with invalid context",
      expectedError: ResolveError.MalformedContext,
      invoke: async () => {
        const { params, transport } = createConnectedHandlerContext("a1")
        await handleRaiseIntentRequest(
          {
            type: "raiseIntentRequest",
            meta: createDacpRequestMeta("raise-intent-malformed-context"),
            payload: {
              intent: "ViewChart",
              context: { bogus: true } as unknown as Context,
            },
          },
          params,
        )
        expect(getLastErrorPayload(transport).error).toBe(ResolveError.MalformedContext)
      },
    },
    {
      // `AddEventListenerRequestPayload.type` is the closed union `'USER_CHANNEL_CHANGED' | null`.
      // "userChannelChanged" was a non-schema alias the agent used to accept; it must now be rejected.
      name: "addEventListenerRequest with the non-schema alias userChannelChanged",
      expectedError: ChannelError.InvalidArguments,
      invoke: () => {
        const { params, transport } = createConnectedHandlerContext("a1")
        handleAddEventListenerRequest(
          {
            type: "addEventListenerRequest",
            meta: createDacpRequestMeta("add-event-listener-camel-alias"),
            payload: { type: asEventListenerType("userChannelChanged") },
          },
          params,
        )
        expect(getLastErrorPayload(transport).error).toBe(ChannelError.InvalidArguments)
      },
    },
    {
      // "channelChanged" is the agent's internal listener-map key, never a wire value.
      name: "addEventListenerRequest with the non-schema alias channelChanged",
      expectedError: ChannelError.InvalidArguments,
      invoke: () => {
        const { params, transport } = createConnectedHandlerContext("a1")
        handleAddEventListenerRequest(
          {
            type: "addEventListenerRequest",
            meta: createDacpRequestMeta("add-event-listener-internal-key-alias"),
            payload: { type: asEventListenerType("channelChanged") },
          },
          params,
        )
        expect(getLastErrorPayload(transport).error).toBe(ChannelError.InvalidArguments)
      },
    },
  ]

  it.each(cases)("$name returns $expectedError", async ({ invoke }) => {
    await invoke()
  })

  it("expects only error values that exist in the @finos/fdc3 error enums", () => {
    const inventedValues = cases
      .filter(({ expectedError }) => !DACP_WIRE_ERROR_VALUES.has(expectedError))
      .map(({ name, expectedError }) => `${name} -> "${expectedError}"`)

    expect(inventedValues).toEqual([])
  })
})
