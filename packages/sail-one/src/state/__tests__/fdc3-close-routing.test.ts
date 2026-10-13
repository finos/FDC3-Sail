import { beforeEach, describe, expect, it, vi } from "vite-plus/test"
import type { DirectoryApp } from "@finos/sail-browser-agent"
import { SailDesktopAgent } from "@finos/sail-browser-agent"
import { State } from "@finos/sail-headless-agent"
import { installLocalStorage } from "./local-storage-mock"

function makeWebApp(appId: string, url: string): DirectoryApp {
  return {
    appId,
    name: appId,
    title: appId,
    type: "web",
    details: { url },
  }
}

describe("fdc3.close routing", () => {
  beforeEach(() => {
    installLocalStorage()
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("unexpected fetch"))),
    )
  })

  it("invokes AppLauncher.close for closeRequest when agent targets FDC3 3.0", async () => {
    const close = vi.fn().mockResolvedValue(undefined)
    const instanceId = "close-test-instance"

    const agent = new SailDesktopAgent({
      implementationMetadata: { fdc3Version: "3.0" },
      heartbeatEnabled: false,
      apps: [makeWebApp("demo-app", "https://app.example/page")],
      appLauncher: {
        launch: () => Promise.resolve({ appId: "demo-app", instanceId }),
        close,
      },
    })

    agent.start()
    agent.registerPendingHostInstance({ appId: "demo-app", instanceId })

    // Mirror post-WCP5 Connected registration (v3 OpenHandler requires Connected for close).
    const server = agent as unknown as {
      setInstanceDetails: (
        id: string,
        meta: { appId: string; instanceId: string; state: State; fdc3Version: "3.0" },
      ) => void
      receive: (msg: object, from: string) => Promise<void>
    }
    server.setInstanceDetails(instanceId, {
      appId: "demo-app",
      instanceId,
      state: State.Connected,
      fdc3Version: "3.0",
    })

    await server.receive(
      {
        type: "closeRequest",
        meta: {
          requestUuid: "req-close-1",
          timestamp: new Date().toISOString(),
          source: { appId: "demo-app", instanceId },
        },
        payload: {},
      },
      instanceId,
    )

    expect(close).toHaveBeenCalledWith(instanceId)
  })

  it("does not invoke AppLauncher.close for closeRequest when agent targets FDC3 2.2", async () => {
    const close = vi.fn().mockResolvedValue(undefined)
    const instanceId = "close-test-instance-22"

    const agent = new SailDesktopAgent({
      implementationMetadata: { fdc3Version: "2.2" },
      heartbeatEnabled: false,
      apps: [makeWebApp("demo-app", "https://app.example/page")],
      appLauncher: {
        launch: () => Promise.resolve({ appId: "demo-app", instanceId }),
        close,
      },
    })

    agent.start()

    const server = agent as unknown as {
      setInstanceDetails: (
        id: string,
        meta: { appId: string; instanceId: string; state: State; fdc3Version: "2.2" },
      ) => void
      receive: (msg: object, from: string) => Promise<void>
    }
    server.setInstanceDetails(instanceId, {
      appId: "demo-app",
      instanceId,
      state: State.Connected,
      fdc3Version: "2.2",
    })

    await server.receive(
      {
        type: "closeRequest",
        meta: {
          requestUuid: "req-close-2",
          timestamp: new Date().toISOString(),
          source: { appId: "demo-app", instanceId },
        },
        payload: {},
      },
      instanceId,
    )

    expect(close).not.toHaveBeenCalled()
  })
})
