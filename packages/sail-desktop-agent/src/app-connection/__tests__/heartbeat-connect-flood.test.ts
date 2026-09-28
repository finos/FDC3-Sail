/**
 * Guard: one WCP connect must not deliver a burst of heartbeatEvents before the first interval.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, afterEach } from "vite-plus/test"
import type { BrowserTypes } from "@finos/fdc3"
import { DEFAULT_FDC3_USER_CHANNELS } from "../../agent/default-user-channels"
import {
  getActiveHeartbeatTimerCount,
  clearAllHeartbeatTimersForTesting,
} from "../../handlers/heartbeat/runtime"
import { SailDesktopAgent } from "../../agent/sail-desktop-agent"
import { connectWcpApp, flushAsyncDelivery } from "./wcp-edge-test-helpers"

const PORTFOLIO_APP = {
  appId: "portfolioApp",
  title: "Portfolio",
  type: "web" as const,
  details: { url: "https://example.com/portfolio" },
}

describe("heartbeat connect flood", () => {
  const activeAgents: SailDesktopAgent[] = []

  afterEach(() => {
    for (const agent of activeAgents.splice(0)) {
      agent.stop()
    }
    clearAllHeartbeatTimersForTesting()
  })

  it("does not flood heartbeatEvent to the app immediately after WCP5", async () => {
    const agent = new SailDesktopAgent({
      userChannels: DEFAULT_FDC3_USER_CHANNELS,
      apps: [PORTFOLIO_APP],
      appConnectionOptions: {
        getIntentResolverUrl: () => false,
        getChannelSelectorUrl: () => false,
      },
    })
    agent.start()
    activeAgents.push(agent)

    const heartbeatEvents: BrowserTypes.AgentEventMessage[] = []
    const connected = await connectWcpApp(agent, {
      connectionAttemptUuid: "heartbeat-flood-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    connected.appPort.onmessage = event => {
      const message = event.data as BrowserTypes.AgentEventMessage
      if (message.type === "heartbeatEvent") {
        heartbeatEvents.push(message)
      }
    }

    await flushAsyncDelivery()
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(getActiveHeartbeatTimerCount()).toBe(1)
    expect(heartbeatEvents).toHaveLength(0)
  })

  it("does not start heartbeat when heartbeatEnabled is false", async () => {
    const agent = new SailDesktopAgent({
      userChannels: DEFAULT_FDC3_USER_CHANNELS,
      apps: [PORTFOLIO_APP],
      heartbeatEnabled: false,
      appConnectionOptions: {
        getIntentResolverUrl: () => false,
        getChannelSelectorUrl: () => false,
      },
    })
    agent.start()
    activeAgents.push(agent)

    const heartbeatEvents: BrowserTypes.HeartbeatEvent[] = []
    const connected = await connectWcpApp(agent, {
      connectionAttemptUuid: "heartbeat-disabled-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    connected.appPort.onmessage = event => {
      const message = event.data as BrowserTypes.AgentEventMessage
      if (message.type === "heartbeatEvent") {
        heartbeatEvents.push(message)
      }
    }

    await flushAsyncDelivery()
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(getActiveHeartbeatTimerCount()).toBe(0)
    expect(agent.getState().heartbeats[connected.validatedInstanceId]).toBeUndefined()
    expect(heartbeatEvents).toHaveLength(0)
  })
})
