import { describe, expect, it } from "vite-plus/test"
import type { AppIdentifier, Context } from "@finos/fdc3"

import {
  createProgrammaticIntentResolver,
  selectIntentHandler,
  type ProgrammaticIntentHandlerOption,
  type ProgrammaticIntentResolutionRequest,
} from "../programmatic-intent-resolver"
import type { IntentHandler, IntentResolutionRequest } from "../intent-resolver"

const sampleContext: Context = { type: "fdc3.instrument", id: { ticker: "AAPL" } }

function createRequest(
  handlers: ProgrammaticIntentHandlerOption[],
  overrides: Partial<Omit<ProgrammaticIntentResolutionRequest, "handlers">> = {},
): ProgrammaticIntentResolutionRequest {
  return {
    requestId: "req-1",
    intent: "ViewChart",
    context: sampleContext,
    handlers,
    ...overrides,
  }
}

function handler(
  appId: string,
  options: { instanceId?: string; isRunning?: boolean } = {},
): ProgrammaticIntentHandlerOption {
  return {
    appId,
    instanceId: options.instanceId,
    isRunning: options.isRunning ?? false,
  }
}

describe("selectIntentHandler", () => {
  it("returns null when there are no handlers", () => {
    expect(selectIntentHandler(createRequest([]))).toBeNull()
  })

  it("returns the sole handler", () => {
    expect(selectIntentHandler(createRequest([handler("a")]))).toEqual({ appId: "a" })
  })

  it("prefers a running instance when several handlers exist", () => {
    expect(
      selectIntentHandler(
        createRequest([handler("a"), handler("b", { instanceId: "i1", isRunning: true })]),
      ),
    ).toEqual({ appId: "b", instanceId: "i1" })
  })

  it("honors an explicit target appId", () => {
    const target: AppIdentifier = { appId: "b" }
    expect(selectIntentHandler(createRequest([handler("a"), handler("b")]), target)).toEqual({
      appId: "b",
    })
  })
})

describe("createProgrammaticIntentResolver", () => {
  it("resolves to the first running handler", async () => {
    const resolver = createProgrammaticIntentResolver({ log: () => undefined })
    const handlers: IntentHandler[] = [
      {
        app: { appId: "a", name: "A" },
        intent: { name: "ViewChart", displayName: "ViewChart" },
        isRunning: false,
      },
      {
        app: { appId: "b", name: "B" },
        intent: { name: "ViewChart", displayName: "ViewChart" },
        instanceId: "inst-b",
        isRunning: true,
      },
    ]
    const request: IntentResolutionRequest = {
      requestId: "r1",
      intent: "ViewChart",
      context: sampleContext,
      handlers,
    }

    const response = await resolver.resolve(request)
    expect(response?.target).toEqual({ appId: "b", instanceId: "inst-b" })
    expect(response?.selectedHandler).toBe(handlers[1])
  })
})
