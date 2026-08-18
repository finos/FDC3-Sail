/**
 * SailDesktopAgent public API tests.
 *
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from "vite-plus/test"
import type { BrowserTypes } from "@finos/fdc3"
import * as sailDesktopAgentPackage from "../index"
import { SailDesktopAgent } from "../agent/sail-desktop-agent"
import type { DirectoryApp } from "../app-directory/types"
import type { AppLauncher, IntentHandler, IntentResolver } from "../host-contracts"
import { connectInstance, updateInstanceState } from "../state/mutators"
import type { AgentState } from "../state/types"
import { AppInstanceState } from "../state/types"

type AgentStateHolder = { state: AgentState }

function seedConnectedInstance(agent: SailDesktopAgent, instanceId: string, appId: string): void {
  const internal = agent as unknown as AgentStateHolder
  let state = connectInstance(agent.getState(), {
    instanceId,
    appId,
    metadata: { name: appId },
  })
  state = updateInstanceState(state, instanceId, AppInstanceState.CONNECTED)
  internal.state = state
}

const mockApp: DirectoryApp = {
  appId: "mock-app",
  title: "Mock App",
  type: "web",
  details: { url: "https://example.com/mock" },
}

const otherApp: DirectoryApp = {
  appId: "other-app",
  title: "Other App",
  type: "web",
  details: { url: "https://example.com/other" },
}

describe("SailDesktopAgent", () => {
  it("is exported from the package entrypoint", () => {
    expect(sailDesktopAgentPackage.SailDesktopAgent).toBe(SailDesktopAgent)
  })

  it("owns a browser appConnection and grouped host controllers", () => {
    const agent = new SailDesktopAgent()

    expect(agent.appConnection).toBeDefined()
    expect(agent.apps.getConnections()).toEqual([])
    expect(agent.channels.getUserChannels().length).toBeGreaterThan(0)
    expect(agent.intentResolver.getPendingRequests()).toEqual([])
  })

  it("manages app catalog and host-open lifecycle through DesktopAgent methods", async () => {
    const appLauncher: AppLauncher = {
      launch: vi.fn((request: BrowserTypes.OpenRequestPayload) =>
        Promise.resolve({
          appId: request.app.appId,
          instanceId: request.app.instanceId ?? "opened-instance",
        }),
      ),
    }
    const agent = new SailDesktopAgent({
      apps: [mockApp],
      appLauncher,
    })

    agent.apps.add(otherApp)

    expect(agent.apps.getById("mock-app")).toEqual(mockApp)
    expect(agent.apps.getAll().map(app => app.appId)).toEqual(["mock-app", "other-app"])

    const launched = await agent.apps.open("mock-app")

    expect(launched).toEqual({ appId: "mock-app", instanceId: "opened-instance" })
    expect(agent.apps.getInstance("opened-instance")).toEqual({
      appId: "mock-app",
      instanceId: "opened-instance",
      status: "pending",
      currentUserChannel: null,
    })
  })

  it("exposes default intent resolver UI methods over the browser appConnection", async () => {
    const agent = new SailDesktopAgent()
    const requests: unknown[] = []

    const unsubscribe = agent.intentResolver.onRequest(request => {
      requests.push(request)
      agent.intentResolver.select(request.requestId, request.handlers[0]!)
    })

    const response = await agent.appConnection.requestIntentResolution(
      {
        requestId: "intent-request",
        intent: "ViewChart",
        context: { type: "fdc3.instrument", id: { ticker: "AAPL" } },
        handlers: [
          {
            appId: "mock-app",
            name: "Mock App",
            title: "Mock App",
            instanceId: "mock-instance",
            isRunning: true,
          },
        ],
      },
      1000,
    )

    unsubscribe()

    expect(requests).toHaveLength(1)
    expect(response).toEqual({
      requestId: "intent-request",
      selectedHandler: {
        appId: "mock-app",
        instanceId: "mock-instance",
      },
      intent: "ViewChart",
    })
  })

  it("changeAppChannel resolves on a redundant join to the same channel", async () => {
    const agent = new SailDesktopAgent()
    const instanceId = "redundant-join-instance"
    const channel = agent.channels.getUserChannels()[0]!
    expect(channel).toBeDefined()
    seedConnectedInstance(agent, instanceId, "redundant-app")

    await agent.channels.changeAppChannel(instanceId, channel.id)
    await expect(agent.channels.changeAppChannel(instanceId, channel.id)).resolves.toBeUndefined()
  }, 15_000)

  it("throws when select or cancel is called with a resolve-only intentResolver", () => {
    const resolveOnly: IntentResolver = {
      resolve: () => Promise.resolve(null),
    }
    const agent = new SailDesktopAgent({
      intentResolver: resolveOnly,
    })

    const choice: IntentHandler = {
      app: { appId: "mock-app", name: "Mock App" },
      intent: { name: "ViewChart", displayName: "ViewChart" },
      isRunning: false,
    }

    expect(() => agent.intentResolver.select("missing-ui-request", choice)).toThrow()
    expect(() => agent.intentResolver.cancel("missing-ui-request")).toThrow()
  })
})
