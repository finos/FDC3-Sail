import { describe, expect, it } from "vite-plus/test"
import type { AppIdentifier, Context } from "@finos/fdc3"
import { selectIntentHandler } from "./intent-resolution"
import type { IntentHandlerOption, IntentResolutionRequest } from "./types"

const sampleContext: Context = { type: "fdc3.instrument", id: { ticker: "AAPL" } }

function createRequest(
  handlers: IntentHandlerOption[],
  overrides: Partial<Omit<IntentResolutionRequest, "handlers">> = {},
): IntentResolutionRequest {
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
  options: { instanceId?: string; isRunning?: boolean; name?: string } = {},
): IntentHandlerOption {
  return {
    appId,
    name: options.name ?? appId,
    instanceId: options.instanceId,
    isRunning: options.isRunning ?? false,
  }
}

describe("selectIntentHandler", () => {
  const cases: Array<{
    name: string
    request: IntentResolutionRequest
    target?: AppIdentifier | null
    expected: AppIdentifier | null
  }> = [
    {
      name: "auto-selects the sole handler when exactly one valid handler exists",
      request: createRequest([handler("ChartApp")]),
      expected: { appId: "ChartApp" },
    },
    {
      name: "selects an explicit target instance when appId and instanceId match a handler",
      request: createRequest([
        handler("ChartApp", { instanceId: "chart-running", isRunning: true }),
        handler("NewsApp", { instanceId: "news-1" }),
      ]),
      target: { appId: "NewsApp", instanceId: "news-1" },
      expected: { appId: "NewsApp", instanceId: "news-1" },
    },
    {
      name: "selects an explicit target appId when only appId is provided",
      request: createRequest([handler("ChartApp"), handler("NewsApp", { instanceId: "news-1" })]),
      target: { appId: "NewsApp" },
      expected: { appId: "NewsApp", instanceId: "news-1" },
    },
    {
      name: "prefers a running handler over a non-running handler in directory order",
      request: createRequest([
        handler("ChartApp"),
        handler("NewsApp", { instanceId: "news-running", isRunning: true }),
      ]),
      expected: { appId: "NewsApp", instanceId: "news-running" },
    },
    {
      name: "falls back to directory order when multiple handlers are not running",
      request: createRequest([handler("ChartApp"), handler("NewsApp")]),
      expected: { appId: "ChartApp" },
    },
    {
      name: "prefers the first running handler in directory order when several are running",
      request: createRequest([
        handler("ChartApp", { instanceId: "chart-1", isRunning: true }),
        handler("NewsApp", { instanceId: "news-1", isRunning: true }),
      ]),
      expected: { appId: "ChartApp", instanceId: "chart-1" },
    },
    {
      name: "returns null when no handlers are available",
      request: createRequest([]),
      expected: null,
    },
  ]

  it.each(cases)("$name", ({ request, target, expected }) => {
    expect(selectIntentHandler(request, target)).toEqual(expected)
  })
})
