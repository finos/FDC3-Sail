import { describe, expect, it } from "vite-plus/test"
import type { Context } from "@finos/fdc3"
import type { IntentResolutionRequest } from "@finos/sail-desktop-agent"
import { createHarnessIntentResolver } from "./intent-resolver-wiring"

const sampleContext: Context = { type: "fdc3.instrument", id: { ticker: "AAPL" } }

function createHostRequest(
  handlers: Array<{ appId: string; instanceId?: string; isRunning: boolean }>,
): IntentResolutionRequest {
  return {
    requestId: "req-1",
    intent: "ViewChart",
    context: sampleContext,
    handlers: handlers.map(handler => ({
      app: { appId: handler.appId, title: handler.appId },
      intent: { name: "ViewChart", displayName: "ViewChart" },
      instanceId: handler.instanceId,
      isRunning: handler.isRunning,
    })),
  }
}

describe("createHarnessIntentResolver", () => {
  it("auto-selects the sole handler when exactly one valid handler exists", async () => {
    const resolver = createHarnessIntentResolver()
    const response = await resolver.resolve(
      createHostRequest([{ appId: "ChartApp", isRunning: false }]),
    )

    expect(response?.target).toEqual({ appId: "ChartApp" })
    expect(response?.selectedHandler?.app.appId).toBe("ChartApp")
  })

  it("prefers a running handler over a non-running handler in directory order", async () => {
    const resolver = createHarnessIntentResolver()
    const response = await resolver.resolve(
      createHostRequest([
        { appId: "ChartApp", isRunning: false },
        { appId: "NewsApp", instanceId: "news-running", isRunning: true },
      ]),
    )

    expect(response?.target).toEqual({ appId: "NewsApp", instanceId: "news-running" })
  })

  it("returns null when no handlers are available", async () => {
    const resolver = createHarnessIntentResolver()
    const response = await resolver.resolve(createHostRequest([]))

    expect(response).toBeNull()
  })
})
