/**
 * Host window registry: the host tells SailDesktopAgent which `Window` an app lives in, so WCP can
 * match a connection to its launch when `window.name` is unreadable or cleared.
 *
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it } from "vite-plus/test"
import type { AppLauncher } from "../../host-contracts/app-launcher"
import type { SailDesktopAgent } from "../../agent/sail-desktop-agent"
import { connectWcpApp, createWcpSourceWindow } from "./wcp-edge-test-helpers"
import { CHART_APP, createTestAgent, PORTFOLIO_APP } from "./wcp-desktop-agent.integration.fixtures"

/** A launcher that names each browsing context after the id the agent asked for. */
function createReusingLauncher(): AppLauncher {
  return {
    launch(request) {
      return Promise.resolve({ appId: request.app.appId, instanceId: request.app.instanceId })
    },
  }
}

describe("SailDesktopAgent host window registry", () => {
  const agents: SailDesktopAgent[] = []

  afterEach(() => {
    for (const agent of agents.splice(0)) {
      agent.stop()
    }
  })

  function startAgent(options?: Parameters<typeof createTestAgent>[0]): SailDesktopAgent {
    const agent = createTestAgent({ appLauncher: createReusingLauncher(), ...options })
    agents.push(agent)
    return agent
  }

  it("matches a connection to its launch through the registered window", async () => {
    const agent = startAgent()
    const first = await agent.apps.open(CHART_APP.appId)
    const second = await agent.apps.open(CHART_APP.appId)
    // `window.name` is empty, as when a cross-origin app clears it.
    const secondWindow = createWcpSourceWindow("")
    agent.registerHostWindow(createWcpSourceWindow(""), first.instanceId!)
    agent.registerHostWindow(secondWindow, second.instanceId!)

    const connected = await connectWcpApp(agent, {
      connectionAttemptUuid: "registry-second",
      appId: CHART_APP.appId,
      identityUrl: CHART_APP.details.url,
      sourceWindow: secondWindow,
    })

    expect(connected.validatedInstanceId).toBe(second.instanceId)
  })

  it("finds and forgets a registered window", async () => {
    const agent = startAgent()
    const opened = await agent.apps.open(PORTFOLIO_APP.appId)
    const appWindow = createWcpSourceWindow("")

    agent.registerHostWindow(appWindow, opened.instanceId!)
    expect(agent.findHostWindow(opened.instanceId!)).toBe(appWindow)

    agent.forgetHostWindow(opened.instanceId!)
    expect(agent.findHostWindow(opened.instanceId!)).toBeUndefined()
  })

  it("lets a host resolveHostIdentifier answer before the registry", async () => {
    let hostAnswer: string | undefined
    const agent = startAgent({ resolveHostIdentifier: () => hostAnswer })
    const first = await agent.apps.open(CHART_APP.appId)
    const second = await agent.apps.open(CHART_APP.appId)
    const appWindow = createWcpSourceWindow("")
    agent.registerHostWindow(appWindow, first.instanceId!)
    hostAnswer = second.instanceId

    const connected = await connectWcpApp(agent, {
      connectionAttemptUuid: "registry-host-wins",
      appId: CHART_APP.appId,
      identityUrl: CHART_APP.details.url,
      sourceWindow: appWindow,
    })

    expect(connected.validatedInstanceId).toBe(second.instanceId)
  })
})
