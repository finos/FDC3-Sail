import { describe, expect, it } from "vite-plus/test"
import type { IntentHandler, IntentResolutionRequest } from "../intent-resolver"
import { createProgrammaticIntentResolver } from "../programmatic-intent-resolver"

function handler(appId: string, options: { instanceId?: string; intent?: string } = {}) {
  const intent = options.intent ?? "ViewChart"
  return {
    app: { appId, title: appId },
    intent: { name: intent, displayName: intent },
    instanceId: options.instanceId,
    isRunning: options.instanceId !== undefined,
  } satisfies IntentHandler
}

function request(
  handlers: IntentHandler[],
  overrides: Partial<IntentResolutionRequest> = {},
): IntentResolutionRequest {
  return {
    requestId: "req-1",
    intent: "ViewChart",
    context: { type: "fdc3.instrument", id: { ticker: "AAPL" } },
    handlers,
    ...overrides,
  }
}

describe("createProgrammaticIntentResolver", () => {
  it("picks the sole handler", async () => {
    const response = await createProgrammaticIntentResolver().resolve(
      request([handler("ChartApp")]),
    )

    expect(response?.target).toEqual({ appId: "ChartApp" })
    expect(response?.selectedHandler.app.appId).toBe("ChartApp")
  })

  it("prefers a running instance over a directory app", async () => {
    const response = await createProgrammaticIntentResolver().resolve(
      request([handler("ChartApp"), handler("NewsApp", { instanceId: "news-1" })]),
    )

    expect(response?.target).toEqual({ appId: "NewsApp", instanceId: "news-1" })
  })

  it("falls back to the first handler in directory order", async () => {
    const response = await createProgrammaticIntentResolver().resolve(
      request([handler("ChartApp"), handler("NewsApp")]),
    )

    expect(response?.target).toEqual({ appId: "ChartApp" })
  })

  it("returns null when there is no handler", async () => {
    expect(await createProgrammaticIntentResolver().resolve(request([]))).toBeNull()
  })

  it("names the intent of the chosen handler for raiseIntentForContext", async () => {
    const news = handler("NewsApp", { intent: "ViewNews" })
    const response = await createProgrammaticIntentResolver().resolve(
      request([news], { intent: "", choices: [{ intent: news.intent, handler: news }] }),
    )

    expect(response?.intent).toBe("ViewNews")
  })

  it("reports each choice to the log callback", async () => {
    const lines: string[] = []
    await createProgrammaticIntentResolver({ log: message => lines.push(message) }).resolve(
      request([handler("ChartApp")]),
    )

    expect(lines).toHaveLength(1)
  })
})
