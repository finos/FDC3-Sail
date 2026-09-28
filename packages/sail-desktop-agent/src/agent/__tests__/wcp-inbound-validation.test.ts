/**
 * WCP4/WCP6 honor ValidationMode before handler dispatch (raw message, before enrichment).
 *
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it } from "vite-plus/test"

import {
  beginWcpAppFirstConnect,
  connectWcpApp,
  flushAsyncDelivery,
} from "../../app-connection/__tests__/wcp-edge-test-helpers"
import { PORTFOLIO_APP } from "../../app-connection/__tests__/wcp-desktop-agent.integration.fixtures"
import { DEFAULT_FDC3_USER_CHANNELS } from "../default-user-channels"
import { clearAllHeartbeatTimersForTesting } from "../../handlers/heartbeat/runtime"
import { connectInstance, updateInstanceState } from "../../state/mutators"
import { AppInstanceState } from "../../state/types"
import { createDesktopAgentWithTestConnection } from "../../../test/support/desktop-agent-test-harness"
import { applyDesktopAgentStateUpdate } from "../../../test/support/agent-state"
import { SailDesktopAgent } from "../sail-desktop-agent"

const DIRECTORY_APP = {
  appId: "test-app",
  title: "Test App",
  type: "web" as const,
  details: { url: "https://example.com/app" },
}

const SCHEMA_VALID_CONNECTION_ATTEMPT_UUID = "550e8400-e29b-41d4-a716-446655440000"

function isWcp5IdentityResponse(message: unknown): boolean {
  const type = (message as { type?: string }).type
  return (
    type === "WCP5ValidateAppIdentityResponse" || type === "WCP5ValidateAppIdentityFailedResponse"
  )
}

describe("WCP inbound schema validation (strict)", () => {
  const activeAgents: SailDesktopAgent[] = []

  afterEach(() => {
    clearAllHeartbeatTimersForTesting()
    for (const agent of activeAgents.splice(0)) {
      agent.stop()
    }
  })

  it("rejects schema-invalid WCP4 under strict without entering the identity handler", async () => {
    const { connection } = createDesktopAgentWithTestConnection({
      validation: "strict",
      heartbeatEnabled: false,
      apps: [DIRECTORY_APP],
    })

    // Schema-invalid: missing required actualUrl (and messageOrigin is not on the WCP4 schema).
    await connection.receiveMessage({
      type: "WCP4ValidateAppIdentity",
      payload: {
        identityUrl: "https://example.com/app",
      },
      meta: {
        connectionAttemptUuid: SCHEMA_VALID_CONNECTION_ATTEMPT_UUID,
        timestamp: new Date(),
        messageOrigin: "https://example.com",
      },
    })

    const wcp5Responses = connection.sentMessages.filter(isWcp5IdentityResponse)
    expect(wcp5Responses).toHaveLength(0)
  })

  it("rejects schema-invalid WCP6 under strict without cleaning up the instance", async () => {
    const instanceId = "wcp6-strict-validation-instance"
    const { agent, connection } = createDesktopAgentWithTestConnection({
      validation: "strict",
      heartbeatEnabled: false,
    })

    applyDesktopAgentStateUpdate(agent, state => {
      const withInstance = connectInstance(state, {
        instanceId,
        appId: "test-app",
        metadata: { name: "Test App" },
      })
      return updateInstanceState(withInstance, instanceId, AppInstanceState.CONNECTED)
    })

    expect(agent.getState().instances[instanceId]?.state).toBe(AppInstanceState.CONNECTED)

    // Schema-invalid: meta.source is forbidden on WCP6 (additionalProperties: false).
    await connection.receiveMessage({
      type: "WCP6Goodbye",
      meta: {
        timestamp: new Date(),
        source: { appId: "test-app", instanceId },
      },
    })

    expect(agent.getState().instances[instanceId]).toBeDefined()
    expect(agent.getState().instances[instanceId]?.state).toBe(AppInstanceState.CONNECTED)
  })

  function createStrictBrowserAgent(): SailDesktopAgent {
    const agent = new SailDesktopAgent({
      validation: "strict",
      heartbeatEnabled: false,
      userChannels: DEFAULT_FDC3_USER_CHANNELS,
      apps: [PORTFOLIO_APP],
      appConnectionOptions: {
        getIntentResolverUrl: () => false,
        getChannelSelectorUrl: () => false,
        handshakeTimeout: 30_000,
        disconnectGracePeriod: 0,
      },
    })
    agent.start()
    activeAgents.push(agent)
    return agent
  }

  it("accepts schema-valid WCP4 under strict on the browser MessagePort path", async () => {
    const agent = createStrictBrowserAgent()

    // Schema-valid WCP4 on the wire (UUID + Date, no messageOrigin/source).
    // Enrichment may add messageOrigin after validation.
    const connected = await connectWcpApp(agent, {
      connectionAttemptUuid: "550e8400-e29b-41d4-a716-446655440001",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    expect(agent.getState().instances[connected.validatedInstanceId]?.state).toBe(
      AppInstanceState.CONNECTED,
    )
  })

  it("rejects schema-invalid WCP4 under strict on the browser MessagePort path", async () => {
    const agent = createStrictBrowserAgent()
    const session = beginWcpAppFirstConnect(agent, {
      connectionAttemptUuid: "550e8400-e29b-41d4-a716-446655440002",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    const wcp5Types: string[] = []
    session.appPort.onmessage = event => {
      const type = (event.data as { type?: string }).type
      if (
        type === "WCP5ValidateAppIdentityResponse" ||
        type === "WCP5ValidateAppIdentityFailedResponse"
      ) {
        wcp5Types.push(type)
      }
    }

    // Schema-invalid: missing required actualUrl — rejected on the MessagePort before enrichment.
    session.appPort.postMessage({
      type: "WCP4ValidateAppIdentity",
      meta: {
        connectionAttemptUuid: session.connectionAttemptUuid,
        timestamp: new Date(),
      },
      payload: {
        identityUrl: PORTFOLIO_APP.details.url,
      },
    })
    await flushAsyncDelivery()
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(wcp5Types).toHaveLength(0)
    expect(
      Object.values(agent.getState().instances).some(
        instance =>
          instance.appId === "portfolioApp" && instance.state === AppInstanceState.CONNECTED,
      ),
    ).toBe(false)
  })

  it("accepts a schema-valid DACP request under strict after browser enrichment", async () => {
    // Regression test: BrowserAppConnection.enrichMessageWithSource stamps meta.messageOrigin
    // (schema-illegal on DACP, additionalProperties: false) onto messages *after* they were
    // already validated raw. If routeDACPMessage re-validates the enriched message, this
    // request would be wrongly rejected under strict — dropping every DACP request from every
    // fully-connected app.
    const agent = createStrictBrowserAgent()
    const connected = await connectWcpApp(agent, {
      connectionAttemptUuid: "550e8400-e29b-41d4-a716-446655440004",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    const response = new Promise<{ type?: string; payload?: { error?: string } }>(resolve => {
      connected.appPort.onmessage = event =>
        resolve(event.data as { type?: string; payload?: { error?: string } })
    })

    connected.appPort.postMessage({
      type: "addContextListenerRequest",
      meta: {
        requestUuid: "regression-add-context-listener",
        timestamp: new Date(),
      },
      payload: {
        channelId: null,
        contextType: null,
      },
    })
    await flushAsyncDelivery()

    const resolved = await Promise.race([
      response,
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Timed out waiting for addContextListenerResponse")),
          5000,
        ),
      ),
    ])

    expect(resolved.type).toBe("addContextListenerResponse")
    expect(resolved.payload?.error).toBeUndefined()
  })

  it("rejects schema-invalid WCP6 under strict on the browser MessagePort path", async () => {
    const agent = createStrictBrowserAgent()
    const connected = await connectWcpApp(agent, {
      connectionAttemptUuid: "550e8400-e29b-41d4-a716-446655440003",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    expect(agent.getState().instances[connected.validatedInstanceId]?.state).toBe(
      AppInstanceState.CONNECTED,
    )

    // Schema-invalid: meta.timestamp required. Browser WCP6 is handled in bridgeAppPort.
    connected.appPort.postMessage({
      type: "WCP6Goodbye",
      meta: {},
    })
    await flushAsyncDelivery()
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(agent.getState().instances[connected.validatedInstanceId]).toBeDefined()
    expect(agent.getState().instances[connected.validatedInstanceId]?.state).toBe(
      AppInstanceState.CONNECTED,
    )
  })
})
