import { describe, expect, it, vi } from "vite-plus/test"
import { createHostIntentResolver } from "../intent-resolver"
import type { IntentResolutionRequest } from "../intent-resolver"

const request: IntentResolutionRequest = {
  requestId: "intent-resolution-1",
  intent: "ViewChart",
  context: { type: "fdc3.instrument", id: { ticker: "AAPL" } },
  handlers: [
    {
      app: {
        appId: "chart-app",
        title: "Chart App",
        icons: [{ src: "https://example.com/chart.svg" }],
      },
      intent: { name: "ViewChart", displayName: "View Chart" },
      instanceId: "chart-instance-1",
      isRunning: true,
    },
  ],
}

describe("createHostIntentResolver", () => {
  it("emits resolver requests and resolves with the selected handler", async () => {
    const resolver = createHostIntentResolver()
    const listener = vi.fn()
    resolver.onRequest(listener)

    const resolution = resolver.resolve(request)

    expect(listener).toHaveBeenCalledWith(request)
    expect(resolver.getPendingRequests()).toEqual([request])

    resolver.select(request.requestId, request.handlers[0]!)

    await expect(resolution).resolves.toEqual({
      selectedHandler: request.handlers[0],
      target: { appId: "chart-app", instanceId: "chart-instance-1" },
      intent: "ViewChart",
    })
    expect(resolver.getPendingRequests()).toEqual([])
  })

  it("resolves null when the host UI cancels resolution", async () => {
    const resolver = createHostIntentResolver()

    const resolution = resolver.resolve(request)
    resolver.cancel(request.requestId)

    await expect(resolution).resolves.toBeNull()
  })

  it("cancels an existing request when the same requestId is reused", async () => {
    const resolver = createHostIntentResolver()

    const firstResolution = resolver.resolve(request)
    const secondResolution = resolver.resolve(request)

    await expect(firstResolution).resolves.toBeNull()

    resolver.cancel(request.requestId)
    await expect(secondResolution).resolves.toBeNull()
  })

  it("keeps resolver state usable when one request listener throws", async () => {
    const resolver = createHostIntentResolver()
    const workingListener = vi.fn()

    resolver.onRequest(() => {
      throw new Error("Broken UI subscriber")
    })
    resolver.onRequest(workingListener)

    const resolution = resolver.resolve(request)

    expect(workingListener).toHaveBeenCalledWith(request)
    resolver.cancel(request.requestId)
    await expect(resolution).resolves.toBeNull()
  })
})
