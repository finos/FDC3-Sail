import { describe, expect, it, vi } from "vite-plus/test"
import type { BrowserTypes } from "@finos/fdc3"
import { MockTransport } from "../../__tests__/utils/mock-transport"
import { connectInstance, updateInstanceState } from "../../state/mutators/instance"
import { addApp } from "../../state/mutators/app-directory"
import { registerIntentListener } from "../../state/mutators/intent"
import { createInitialState } from "../../state/initial-state"
import { DEFAULT_FDC3_USER_CHANNELS } from "../../agent/default-user-channels"
import { AppInstanceState } from "../../state/types"
import type {
  IntentResolutionRequest,
  IntentResolutionResponse,
} from "../intent-resolution-callback"
import type { DirectoryApp } from "../../app-directory/types"
import { createDACPTestParams, createDacpRequestMeta } from "./test-params"
import { withResponseDispatcher } from "./test-params"
import { handleRaiseIntentRequest } from "../intents/intent-raise-intent"
import { handleRaiseIntentForContextRequest } from "../intents/intent-raise-intent-for-context"

type SentMessage = {
  type: string
  payload?: Record<string, unknown>
  meta?: Record<string, unknown>
}

function connectAppInstance(
  state: ReturnType<typeof createInitialState>,
  appId: string,
  instanceId: string,
  title: string,
) {
  let nextState = connectInstance(state, {
    appId,
    instanceId,
    metadata: { title },
  })
  nextState = updateInstanceState(nextState, instanceId, AppInstanceState.CONNECTED)
  return nextState
}

function createRaiseIntentRequest(
  requestUuid: string,
  app?: BrowserTypes.AppIdentifier,
): BrowserTypes.RaiseIntentRequest {
  return {
    type: "raiseIntentRequest",
    meta: createDacpRequestMeta(requestUuid, { appId: "source-app", instanceId: "source-1" }),
    payload: {
      intent: "ViewChart",
      context: { type: "fdc3.instrument", id: { ticker: "AAPL" } },
      ...(app ? { app } : {}),
    },
  }
}

function seedCatalogApp(
  params: ReturnType<typeof createDACPTestParams>["params"],
  app: DirectoryApp,
): void {
  params.setState(state => addApp(state, app))
}

describe("intent resolver selection delivery", () => {
  it("delivers raiseIntent to the selected running instance with rich resolver metadata", async () => {
    let state = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
    state = connectAppInstance(state, "source-app", "source-1", "Source App")
    state = connectAppInstance(state, "chart-app", "chart-1", "Running Chart")
    state = registerIntentListener(state, {
      listenerId: "chart-listener",
      intentName: "ViewChart",
      instanceId: "chart-1",
      appId: "chart-app",
      contextTypes: ["fdc3.instrument"],
    })

    const transport = new MockTransport()
    const { params } = createDACPTestParams({ instanceId: "source-1", initialState: state })
    Object.assign(params, withResponseDispatcher(params, transport))
    seedCatalogApp(params, {
      appId: "chart-app",
      title: "Chart App",
      type: "web",
      details: { url: "https://example.com/chart" },
      icons: [{ src: "https://example.com/chart.svg" }],
      interop: {
        intents: {
          listensFor: {
            ViewChart: { displayName: "View Chart", contexts: ["fdc3.instrument"] },
          },
        },
      },
    })
    seedCatalogApp(params, {
      appId: "portfolio-app",
      title: "Portfolio App",
      type: "web",
      details: { url: "https://example.com/portfolio" },
      icons: [{ src: "https://example.com/portfolio.svg" }],
      interop: {
        intents: {
          listensFor: {
            ViewChart: { displayName: "View Chart", contexts: ["fdc3.instrument"] },
          },
        },
      },
    })

    let resolverRequest: IntentResolutionRequest | undefined
    params.requestIntentResolution = vi.fn(
      (request: IntentResolutionRequest): Promise<IntentResolutionResponse> => {
        resolverRequest = request
        return Promise.resolve({
          requestId: request.requestId,
          selectedHandler: { appId: "chart-app", instanceId: "chart-1" },
          intent: "ViewChart",
        })
      },
    )

    await handleRaiseIntentRequest(createRaiseIntentRequest("raise-selected"), params)

    expect(resolverRequest?.choices).toBeDefined()
    const choices = resolverRequest!.choices!
    expect(
      choices.find(choice => choice.handler.appId === "chart-app" && choice.handler.isRunning),
    ).toMatchObject({
      intent: { name: "ViewChart", displayName: "View Chart" },
      handler: {
        appId: "chart-app",
        title: "Chart App",
        icons: [{ src: "https://example.com/chart.svg" }],
        instanceId: "chart-1",
        isRunning: true,
      },
    })
    expect(choices.find(choice => choice.handler.appId === "portfolio-app")).toMatchObject({
      handler: {
        appId: "portfolio-app",
        title: "Portfolio App",
        icons: [{ src: "https://example.com/portfolio.svg" }],
        isRunning: false,
      },
    })

    const sentMessages = transport.sentMessages as SentMessage[]
    const intentEvent = sentMessages.find(message => message.type === "intentEvent")
    const raiseIntentResponse = sentMessages.find(message => message.type === "raiseIntentResponse")
    expect(intentEvent).toMatchObject({
      type: "intentEvent",
      payload: { intent: "ViewChart" },
      meta: { destination: { instanceId: "chart-1" } },
    })
    expect(raiseIntentResponse).toMatchObject({
      type: "raiseIntentResponse",
      payload: {
        intentResolution: {
          source: { appId: "chart-app", instanceId: "chart-1" },
          intent: "ViewChart",
        },
      },
    })
    expect(raiseIntentResponse?.payload?.appIntent).toBeUndefined()
  })

  it("bypasses resolver UI when raiseIntent includes an AppIdentifier target", async () => {
    let state = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
    state = connectAppInstance(state, "source-app", "source-1", "Source App")
    state = connectAppInstance(state, "chart-app", "chart-1", "Running Chart")
    state = registerIntentListener(state, {
      listenerId: "chart-listener",
      intentName: "ViewChart",
      instanceId: "chart-1",
      appId: "chart-app",
      contextTypes: ["fdc3.instrument"],
    })

    const transport = new MockTransport()
    const { params } = createDACPTestParams({ instanceId: "source-1", initialState: state })
    Object.assign(params, withResponseDispatcher(params, transport))
    seedCatalogApp(params, {
      appId: "chart-app",
      title: "Chart App",
      type: "web",
      details: { url: "https://example.com/chart" },
      interop: {
        intents: {
          listensFor: {
            ViewChart: { displayName: "View Chart", contexts: ["fdc3.instrument"] },
          },
        },
      },
    })
    params.requestIntentResolution = vi.fn()

    await handleRaiseIntentRequest(
      createRaiseIntentRequest("raise-targeted", { appId: "chart-app", instanceId: "chart-1" }),
      params,
    )

    expect(params.requestIntentResolution).not.toHaveBeenCalled()
    const sentMessages = transport.sentMessages as SentMessage[]
    expect(sentMessages.find(message => message.type === "intentEvent")).toMatchObject({
      type: "intentEvent",
      meta: { destination: { instanceId: "chart-1" } },
    })
  })

  it("rejects resolver selections outside the advertised choices", async () => {
    let state = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
    state = connectAppInstance(state, "source-app", "source-1", "Source App")
    state = connectAppInstance(state, "chart-app", "chart-1", "Running Chart")
    state = registerIntentListener(state, {
      listenerId: "chart-listener",
      intentName: "ViewChart",
      instanceId: "chart-1",
      appId: "chart-app",
      contextTypes: ["fdc3.instrument"],
    })

    const transport = new MockTransport()
    const { params } = createDACPTestParams({ instanceId: "source-1", initialState: state })
    Object.assign(params, withResponseDispatcher(params, transport))
    seedCatalogApp(params, {
      appId: "chart-app",
      title: "Chart App",
      type: "web",
      details: { url: "https://example.com/chart" },
      interop: {
        intents: {
          listensFor: {
            ViewChart: { displayName: "View Chart", contexts: ["fdc3.instrument"] },
          },
        },
      },
    })
    seedCatalogApp(params, {
      appId: "portfolio-app",
      title: "Portfolio App",
      type: "web",
      details: { url: "https://example.com/portfolio" },
      interop: {
        intents: {
          listensFor: {
            ViewChart: { displayName: "View Chart", contexts: ["fdc3.instrument"] },
          },
        },
      },
    })
    params.requestIntentResolution = vi.fn(
      (request: IntentResolutionRequest): Promise<IntentResolutionResponse> =>
        Promise.resolve({
          requestId: request.requestId,
          selectedHandler: { appId: "unknown-app" },
          intent: "ViewChart",
        }),
    )

    await handleRaiseIntentRequest(createRaiseIntentRequest("raise-invalid-selection"), params)

    expect((transport.sentMessages as SentMessage[])[0]).toMatchObject({
      type: "raiseIntentResponse",
      payload: { error: "IntentDeliveryFailed" },
    })
  })

  it("uses the selected intent and instance for raiseIntentForContext", async () => {
    let state = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
    state = connectAppInstance(state, "source-app", "source-1", "Source App")
    state = connectAppInstance(state, "portfolio-app", "portfolio-1", "Portfolio App")
    state = connectAppInstance(state, "chart-app", "chart-1", "Chart App")
    state = registerIntentListener(state, {
      listenerId: "portfolio-listener",
      intentName: "ViewPortfolio",
      instanceId: "portfolio-1",
      appId: "portfolio-app",
      contextTypes: ["fdc3.portfolio"],
    })
    state = registerIntentListener(state, {
      listenerId: "chart-listener",
      intentName: "ViewChart",
      instanceId: "chart-1",
      appId: "chart-app",
      contextTypes: ["fdc3.portfolio"],
    })

    const transport = new MockTransport()
    const { params } = createDACPTestParams({ instanceId: "source-1", initialState: state })
    Object.assign(params, withResponseDispatcher(params, transport))
    seedCatalogApp(params, {
      appId: "portfolio-app",
      title: "Portfolio App",
      type: "web",
      details: { url: "https://example.com/portfolio" },
      interop: {
        intents: {
          listensFor: {
            ViewPortfolio: { displayName: "View Portfolio", contexts: ["fdc3.portfolio"] },
          },
        },
      },
    })
    seedCatalogApp(params, {
      appId: "chart-app",
      title: "Chart App",
      type: "web",
      details: { url: "https://example.com/chart" },
      interop: {
        intents: {
          listensFor: {
            ViewChart: { displayName: "View Chart", contexts: ["fdc3.portfolio"] },
          },
        },
      },
    })

    let resolverRequest: IntentResolutionRequest | undefined
    params.requestIntentResolution = vi.fn(
      (request: IntentResolutionRequest): Promise<IntentResolutionResponse> => {
        resolverRequest = request
        return Promise.resolve({
          requestId: request.requestId,
          selectedHandler: { appId: "chart-app", instanceId: "chart-1" },
          intent: "ViewChart",
        })
      },
    )

    await handleRaiseIntentForContextRequest(
      {
        type: "raiseIntentForContextRequest",
        meta: createDacpRequestMeta("raise-context-selected", {
          appId: "source-app",
          instanceId: "source-1",
        }),
        payload: { context: { type: "fdc3.portfolio", id: { portfolioId: "P1" } } },
      },
      params,
    )

    expect(resolverRequest?.choices?.map(choice => choice.intent.name)).toEqual(
      expect.arrayContaining(["ViewPortfolio", "ViewChart"]),
    )
    const sentMessages = transport.sentMessages as SentMessage[]
    expect(sentMessages.find(message => message.type === "intentEvent")).toMatchObject({
      type: "intentEvent",
      payload: { intent: "ViewChart" },
      meta: { destination: { instanceId: "chart-1" } },
    })
    expect(
      sentMessages.find(message => message.type === "raiseIntentForContextResponse"),
    ).toMatchObject({
      type: "raiseIntentForContextResponse",
      payload: {
        intentResolution: {
          source: { appId: "chart-app", instanceId: "chart-1" },
          intent: "ViewChart",
        },
      },
    })
  })
})
