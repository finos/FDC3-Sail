/**
 * FDC3 Browser-Resident DA spec, "Disconnects": the DA tracks app windows that close, so
 * `findInstances` / `findIntent` never offer an app that's gone. One way the spec names is the
 * `closed` property of the `WCP1Hello` source `WindowProxy`.
 *
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it } from "vite-plus/test"
import type { BrowserTypes } from "@finos/fdc3"
import { SailDesktopAgent } from "../../agent/sail-desktop-agent"
import { DEFAULT_FDC3_USER_CHANNELS } from "../../agent/default-user-channels"
import {
  connectWcpApp,
  createWcpSourceWindow,
  postDacpOnPort,
  waitForPortMessage,
  type WcpConnectedApp,
} from "./wcp-edge-test-helpers"
import { PORTFOLIO_APP } from "./wcp-desktop-agent.integration.fixtures"

const CHART_APP = {
  appId: "chartApp",
  title: "Chart",
  type: "web" as const,
  details: { url: "https://example.com/chart" },
  interop: { intents: { listensFor: { ViewChart: { contexts: ["fdc3.instrument"] } } } },
}

function closeWindow(windowRef: Window): void {
  Object.defineProperty(windowRef, "closed", { value: true, configurable: true })
}

function meta(source: WcpConnectedApp) {
  return {
    requestUuid: crypto.randomUUID(),
    timestamp: new Date(),
    source: { appId: source.appId, instanceId: source.validatedInstanceId },
  }
}

describe("SailDesktopAgent closed window tracking", () => {
  const agents: SailDesktopAgent[] = []

  afterEach(() => {
    for (const agent of agents.splice(0)) {
      agent.stop()
    }
  })

  async function connectPortfolioAndChart() {
    const agent = new SailDesktopAgent({
      userChannels: DEFAULT_FDC3_USER_CHANNELS,
      apps: [PORTFOLIO_APP, CHART_APP],
      heartbeatEnabled: false,
      appConnectionOptions: {
        getIntentResolverUrl: () => false,
        getChannelSelectorUrl: () => false,
      },
    })
    agent.start()
    agents.push(agent)

    const portfolio = await connectWcpApp(agent, {
      connectionAttemptUuid: "closed-portfolio",
      appId: PORTFOLIO_APP.appId,
      identityUrl: PORTFOLIO_APP.details.url,
      sourceWindow: createWcpSourceWindow(""),
    })
    const chartWindow = createWcpSourceWindow("")
    const chart = await connectWcpApp(agent, {
      connectionAttemptUuid: "closed-chart",
      appId: CHART_APP.appId,
      identityUrl: CHART_APP.details.url,
      sourceWindow: chartWindow,
    })
    const listenerAdded = waitForPortMessage(
      chart.appPort,
      data => (data as { type?: string }).type === "addIntentListenerResponse",
    )
    await postDacpOnPort(chart.appPort, {
      type: "addIntentListenerRequest",
      meta: meta(chart),
      payload: { intent: "ViewChart" },
    })
    await listenerAdded
    return { agent, portfolio, chart, chartWindow }
  }

  it("leaves a closed window out of findInstances", async () => {
    const { portfolio, chart, chartWindow } = await connectPortfolioAndChart()
    const request: BrowserTypes.FindInstancesRequest = {
      type: "findInstancesRequest",
      meta: meta(portfolio),
      payload: { app: { appId: CHART_APP.appId } },
    }

    closeWindow(chartWindow)
    const response = waitForPortMessage<BrowserTypes.FindInstancesResponse>(
      portfolio.appPort,
      data => (data as { type?: string }).type === "findInstancesResponse",
    )
    await postDacpOnPort(portfolio.appPort, request)

    const instanceIds = (await response).payload.appIdentifiers?.map(app => app.instanceId)
    expect(instanceIds).not.toContain(chart.validatedInstanceId)
  })

  it("leaves a closed window out of findIntent", async () => {
    const { portfolio, chart, chartWindow } = await connectPortfolioAndChart()
    const request: BrowserTypes.FindIntentRequest = {
      type: "findIntentRequest",
      meta: meta(portfolio),
      payload: { intent: "ViewChart", context: { type: "fdc3.instrument" } },
    }

    closeWindow(chartWindow)
    const response = waitForPortMessage<BrowserTypes.FindIntentResponse>(
      portfolio.appPort,
      data => (data as { type?: string }).type === "findIntentResponse",
    )
    await postDacpOnPort(portfolio.appPort, request)

    const apps = (await response).payload.appIntent?.apps ?? []
    // The directory entry stays (it can be launched); the closed instance does not.
    expect(apps.map(app => app.appId)).toContain(CHART_APP.appId)
    expect(apps.map(app => app.instanceId)).not.toContain(chart.validatedInstanceId)
  })

  it("still offers an open window to findIntent", async () => {
    const { portfolio, chart } = await connectPortfolioAndChart()
    const request: BrowserTypes.FindIntentRequest = {
      type: "findIntentRequest",
      meta: meta(portfolio),
      payload: { intent: "ViewChart", context: { type: "fdc3.instrument" } },
    }

    const response = waitForPortMessage<BrowserTypes.FindIntentResponse>(
      portfolio.appPort,
      data => (data as { type?: string }).type === "findIntentResponse",
    )
    await postDacpOnPort(portfolio.appPort, request)

    const apps = (await response).payload.appIntent?.apps ?? []
    expect(apps.map(app => app.instanceId)).toContain(chart.validatedInstanceId)
  })

  it("still lists an open window", async () => {
    const { portfolio, chart } = await connectPortfolioAndChart()
    const request: BrowserTypes.FindInstancesRequest = {
      type: "findInstancesRequest",
      meta: meta(portfolio),
      payload: { app: { appId: CHART_APP.appId } },
    }

    const response = waitForPortMessage<BrowserTypes.FindInstancesResponse>(
      portfolio.appPort,
      data => (data as { type?: string }).type === "findInstancesResponse",
    )
    await postDacpOnPort(portfolio.appPort, request)

    const instanceIds = (await response).payload.appIdentifiers?.map(app => app.instanceId)
    expect(instanceIds).toContain(chart.validatedInstanceId)
  })
})
