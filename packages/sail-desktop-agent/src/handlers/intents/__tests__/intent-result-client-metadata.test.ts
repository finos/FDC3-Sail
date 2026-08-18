import { describe, expect, it, vi } from "vite-plus/test"
import type { BrowserTypes } from "@finos/fdc3"

import { MockTransport } from "../../../__tests__/utils/mock-transport"
import { createInMemoryTransportPair } from "../../../../test/support/in-memory-transport"
import { DEFAULT_FDC3_USER_CHANNELS } from "../../../agent/default-user-channels"
import { createInitialState } from "../../../state/initial-state"
import { addPendingIntent, connectInstance, updateInstanceState } from "../../../state/mutators"
import { AppInstanceState } from "../../../state/types"
import {
  createDACPTestParams,
  createDacpRequestMeta,
  withResponseDispatcher,
} from "../../__tests__/test-params"
import { handleIntentResultRequest } from "../intent-result-handlers"
import type { IntentResultContextMetadata } from "../intent-result-metadata"

type RaiseIntentResultResponse = BrowserTypes.AgentResponseMessage & {
  type: "raiseIntentResultResponse"
  payload: {
    intentResult?: BrowserTypes.IntentResult & {
      metadata?: IntentResultContextMetadata
    }
    resultMetadata?: IntentResultContextMetadata
    error?: string
  }
  meta: BrowserTypes.AgentResponseMessageMeta & {
    destination?: { instanceId: string }
  }
}

const BASE = {
  requestId: "ABC123",
  targetInstanceId: "l1",
  targetAppId: "PortfolioApp",
  sourceInstanceId: "a1",
  sourceAppId: "App1",
  handlerInstanceId: "l1",
} as const

function setupPendingIntentContext() {
  let state = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
  state = connectInstance(state, {
    instanceId: BASE.sourceInstanceId,
    appId: BASE.sourceAppId,
    metadata: { name: BASE.sourceAppId },
  })
  state = connectInstance(state, {
    instanceId: BASE.targetInstanceId,
    appId: BASE.targetAppId,
    metadata: { name: BASE.targetAppId },
  })
  state = updateInstanceState(state, BASE.sourceInstanceId, AppInstanceState.CONNECTED)
  state = updateInstanceState(state, BASE.targetInstanceId, AppInstanceState.CONNECTED)
  state = addPendingIntent(state, {
    requestId: BASE.requestId,
    intentName: "ViewPortfolio",
    context: { type: "fdc3.portfolio" },
    sourceInstanceId: BASE.sourceInstanceId,
    targetInstanceId: BASE.targetInstanceId,
    targetAppId: BASE.targetAppId,
    requestType: "raiseIntentRequest",
  })

  const { params, getState } = createDACPTestParams({
    instanceId: BASE.handlerInstanceId,
    initialState: state,
  })

  const transport = new MockTransport()
  return {
    params: withResponseDispatcher(params, transport),
    transport,
    getState,
  }
}

function findRaiseIntentResultResponse(
  transport: MockTransport,
): RaiseIntentResultResponse | undefined {
  return transport.sentMessages.find(
    (message): message is RaiseIntentResultResponse =>
      typeof message === "object" &&
      message !== null &&
      "type" in message &&
      (message as { type: string }).type === "raiseIntentResultResponse",
  )
}

/**
 * FDC3 client IntentResolution.getResultMetadata() reads result metadata from the
 * intentResult object on raiseIntentResultResponse (not only the sibling payload field).
 */
function readClientGetResultMetadata(
  response: RaiseIntentResultResponse,
): IntentResultContextMetadata | undefined {
  return response.payload.intentResult?.metadata
}

describe("IntentResolution.getResultMetadata() client metadata path", () => {
  it.each([
    {
      toolboxScenario: "RaiseIntentVoidResultMetadata",
      intentResult: {},
    },
    {
      toolboxScenario: "RaiseIntentContextResultMetadata",
      intentResult: { context: { type: "testContextY", id: { value: "1" } } },
    },
    {
      toolboxScenario: "RaiseIntentChannelResultMetadata",
      intentResult: { channel: { id: "app-channel-1", type: "app" as const } },
    },
  ])(
    "$toolboxScenario exposes non-empty intentResult.metadata for client getResultMetadata()",
    ({ intentResult }) => {
      const { params, transport, getState } = setupPendingIntentContext()

      handleIntentResultRequest(
        {
          type: "intentResultRequest",
          meta: createDacpRequestMeta("intent-result-client-metadata", {
            appId: BASE.targetAppId,
            instanceId: BASE.targetInstanceId,
          }),
          payload: {
            raiseIntentRequestUuid: BASE.requestId,
            intentEventUuid: "event-1",
            intentResult,
          },
        },
        params,
      )

      const response = findRaiseIntentResultResponse(transport)
      expect(response).toBeDefined()

      const clientMetadata = readClientGetResultMetadata(response!)
      expect(clientMetadata).toBeDefined()
      expect(clientMetadata?.source).toEqual({
        appId: BASE.targetAppId,
        instanceId: BASE.targetInstanceId,
      })
      expect(typeof clientMetadata?.timestamp).toBe("string")
      expect(Number.isNaN(Date.parse(clientMetadata!.timestamp))).toBe(false)
      expect(clientMetadata?.traceId).toEqual(expect.any(String))
      const traceId = clientMetadata?.traceId
      expect(typeof traceId).toBe("string")
      if (typeof traceId !== "string") {
        throw new Error("expected traceId string")
      }
      expect(traceId.length).toBeGreaterThan(0)

      // The result settles the request: the pending intent leaves state.
      expect(getState().intents.pending[BASE.requestId]).toBeUndefined()
    },
  )

  it("RaiseIntentContextWithMetadataResult returns plain context on getResult() and merged metadata on getResultMetadata()", () => {
    const contextPayload = { type: "testContextY", id: { value: "1" } }
    const appSignature = "conformance-signature"
    const appCustom = { conformanceKey: "value" }
    const { params, transport, getState } = setupPendingIntentContext()

    handleIntentResultRequest(
      {
        type: "intentResultRequest",
        meta: createDacpRequestMeta("intent-result-context-with-metadata", {
          appId: BASE.targetAppId,
          instanceId: BASE.targetInstanceId,
        }),
        payload: {
          raiseIntentRequestUuid: BASE.requestId,
          intentEventUuid: "event-1",
          intentResult: {
            context: contextPayload,
            metadata: {
              traceId: "app-trace-should-not-win",
              signature: appSignature,
              custom: appCustom,
            },
          } as unknown as BrowserTypes.IntentResult,
        },
      },
      params,
    )

    const response = findRaiseIntentResultResponse(transport)
    expect(response).toBeDefined()
    expect(response?.payload.intentResult).toEqual({ context: contextPayload })
    expect(getState().intents.pending[BASE.requestId]).toBeUndefined()

    const clientMetadata = readClientGetResultMetadata(response!)
    expect(clientMetadata?.signature).toBe(appSignature)
    expect(clientMetadata?.custom).toEqual(appCustom)
    expect(clientMetadata?.traceId).toEqual(expect.any(String))
    expect(clientMetadata?.traceId).not.toBe("app-trace-should-not-win")
    const traceId = clientMetadata?.traceId
    expect(typeof traceId).toBe("string")
    if (typeof traceId !== "string") {
      throw new Error("expected traceId string")
    }
    expect(traceId.length).toBeGreaterThan(0)
  })

  it("raiseIntentResultResponse clones through InMemoryTransport without circular metadata refs", async () => {
    const { params, getState } = setupPendingIntentContext()
    const [daTransport, peerTransport] = createInMemoryTransportPair()
    const received: unknown[] = []
    peerTransport.onMessage(message => {
      received.push(message)
    })

    handleIntentResultRequest(
      {
        type: "intentResultRequest",
        meta: createDacpRequestMeta("intent-result-inmemory-clone", {
          appId: BASE.targetAppId,
          instanceId: BASE.targetInstanceId,
        }),
        payload: {
          raiseIntentRequestUuid: BASE.requestId,
          intentEventUuid: "event-1",
          intentResult: { context: { type: "testContextY", id: { value: "1" } } },
        },
      },
      withResponseDispatcher(params, daTransport),
    )

    await vi.waitFor(() => {
      expect(received.length).toBeGreaterThanOrEqual(1)
    })

    const response = received.find(
      (message): message is RaiseIntentResultResponse =>
        typeof message === "object" &&
        message !== null &&
        "type" in message &&
        (message as { type: string }).type === "raiseIntentResultResponse",
    )
    expect(response).toBeDefined()
    expect(response!.payload.resultMetadata).toBeDefined()
    expect(response!.payload.intentResult?.metadata).toBeDefined()
    expect(response!.payload.resultMetadata).not.toBe(response!.payload.intentResult?.metadata)
    expect(readClientGetResultMetadata(response!)?.traceId).toEqual(expect.any(String))
    expect(getState().intents.pending[BASE.requestId]).toBeUndefined()
  })
})
