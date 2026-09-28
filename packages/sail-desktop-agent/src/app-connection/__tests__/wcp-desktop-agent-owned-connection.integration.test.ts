/**
 * RED integration tests for DA-owned browser app connection (collapsed architecture).
 *
 * DesktopAgent must own WCP listener lifecycle, per-app MessagePort routing, and
 * connection maps — without a separate transport hop between edge and agent.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, afterEach, vi } from "vite-plus/test"
import type { BrowserTypes } from "@finos/fdc3"
import type { SailDesktopAgent } from "../../agent/sail-desktop-agent"
import { AppInstanceState } from "../../state/types"
import { clearAllHeartbeatTimersForTesting } from "../../handlers/heartbeat/runtime"
import {
  connectWcpAppViaDaOwnedConnection,
  requireDaOwnedAppConnection,
} from "./wcp-owned-connection-test-helpers"
import {
  CHANNEL_ID,
  CHART_APP,
  createTestAgent,
  PORTFOLIO_APP,
} from "./wcp-desktop-agent.integration.fixtures"
import {
  createAddContextListenerMessage,
  createBroadcastMessage,
  createJoinUserChannelMessage,
  createMessageEvent,
  createWCP1Hello,
  flushAsyncDelivery,
  INSTRUMENT_CONTEXT,
  postDacpOnPort,
  waitForPortMessage,
} from "./wcp-edge-test-helpers"

describe("DA-owned browser app connection (collapsed architecture)", () => {
  const activeAgents: SailDesktopAgent[] = []

  afterEach(() => {
    clearAllHeartbeatTimersForTesting()
    for (const agent of activeAgents.splice(0)) {
      agent.stop()
    }
  })

  it("completes WCP1-5 handshake and migrates temp to validated instance on DA-owned connection maps", async () => {
    const agent = createTestAgent()
    activeAgents.push(agent)

    const connected = await connectWcpAppViaDaOwnedConnection(agent, {
      connectionAttemptUuid: "da-owned-wcp1-5-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    const connections = requireDaOwnedAppConnection(agent)

    expect(agent.getState().instances[connected.validatedInstanceId]?.appId).toBe("portfolioApp")
    expect(agent.getState().instances[connected.validatedInstanceId]?.state).toBe(
      AppInstanceState.CONNECTED,
    )
    expect(connections.getConnection(connected.validatedInstanceId)).toMatchObject({
      instanceId: connected.validatedInstanceId,
      appId: "portfolioApp",
    })
    expect(connections.getConnection(connected.tempInstanceId)).toBeUndefined()
  })

  it("routes outbound DACP to the validated instance MessagePort after WCP5 migration", async () => {
    const agent = createTestAgent()
    activeAgents.push(agent)

    const appA = await connectWcpAppViaDaOwnedConnection(agent, {
      connectionAttemptUuid: "da-owned-outbound-a-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    const appB = await connectWcpAppViaDaOwnedConnection(agent, {
      connectionAttemptUuid: "da-owned-outbound-b-uuid",
      appId: "chartApp",
      identityUrl: CHART_APP.details.url,
    })

    const broadcastPromise = waitForPortMessage<BrowserTypes.BroadcastEvent>(
      appA.appPort,
      data => (data as { type?: string }).type === "broadcastEvent",
    )

    await postDacpOnPort(
      appA.appPort,
      createJoinUserChannelMessage(appA.validatedInstanceId, appA.appId, CHANNEL_ID),
    )
    await postDacpOnPort(
      appA.appPort,
      createAddContextListenerMessage(
        appA.validatedInstanceId,
        appA.appId,
        CHANNEL_ID,
        INSTRUMENT_CONTEXT.type,
      ),
    )
    await postDacpOnPort(
      appB.appPort,
      createJoinUserChannelMessage(appB.validatedInstanceId, appB.appId, CHANNEL_ID),
    )
    await postDacpOnPort(
      appB.appPort,
      createBroadcastMessage(appB.validatedInstanceId, appB.appId, CHANNEL_ID, INSTRUMENT_CONTEXT),
    )

    const broadcastEvent = await broadcastPromise

    expect(broadcastEvent.type).toBe("broadcastEvent")
    const destination = (
      broadcastEvent.meta as BrowserTypes.BroadcastEventMeta & {
        destination?: { instanceId?: string }
      }
    ).destination
    expect(destination?.instanceId).toBe(appA.validatedInstanceId)
    expect(broadcastEvent.payload.context?.type).toBe(INSTRUMENT_CONTEXT.type)
  })

  it("prunes DA state and DA-owned connection maps when the app sends WCP6Goodbye", async () => {
    const agent = createTestAgent({ disconnectGracePeriod: 0 })
    activeAgents.push(agent)

    const connected = await connectWcpAppViaDaOwnedConnection(agent, {
      connectionAttemptUuid: "da-owned-wcp6-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    const connections = requireDaOwnedAppConnection(agent)
    expect(connections.getConnection(connected.validatedInstanceId)).toBeDefined()

    connected.appPort.postMessage({
      type: "WCP6Goodbye",
      meta: { timestamp: new Date().toISOString() },
    })
    await flushAsyncDelivery()

    await vi.waitFor(() => {
      expect(agent.getState().instances[connected.validatedInstanceId]).toBeUndefined()
      expect(connections.getConnection(connected.validatedInstanceId)).toBeUndefined()
      expect(connections.getConnection(connected.tempInstanceId)).toBeUndefined()
    })
  })

  it("prunes DA state and DA-owned connection maps when host disconnect is called", async () => {
    const agent = createTestAgent({
      heartbeatEnabled: false,
      disconnectGracePeriod: 0,
    })
    activeAgents.push(agent)

    const connected = await connectWcpAppViaDaOwnedConnection(agent, {
      connectionAttemptUuid: "da-owned-host-disconnect-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    const connections = requireDaOwnedAppConnection(agent)
    agent.disconnectInstance(connected.validatedInstanceId)

    expect(agent.getState().instances[connected.validatedInstanceId]).toBeUndefined()
    expect(connections.getConnection(connected.validatedInstanceId)).toBeUndefined()
  })

  it("prunes pending temp connection maps when WCP4 identity validation fails", async () => {
    const agent = createTestAgent({ disconnectGracePeriod: 0 })
    activeAgents.push(agent)

    const connections = requireDaOwnedAppConnection(agent)
    const connectionAttemptUuid = "da-owned-wcp4-fail-uuid"
    const tempInstanceId = `temp-${connectionAttemptUuid}`
    const unknownIdentityUrl = "https://example.com/unknown-app"

    const postMessageSpy = vi.spyOn(window, "postMessage")
    window.dispatchEvent(
      createMessageEvent(createWCP1Hello(connectionAttemptUuid, unknownIdentityUrl)),
    )
    const calls = postMessageSpy.mock.calls as unknown as Array<
      [BrowserTypes.WebConnectionProtocol3Handshake, string, MessagePort[]]
    >
    const appPort = calls[0]![2][0]!
    appPort.start()
    postMessageSpy.mockRestore()

    expect(connections.getConnection(tempInstanceId)).toBeDefined()

    const wcp5FailurePromise =
      waitForPortMessage<BrowserTypes.WebConnectionProtocol5ValidateAppIdentityFailedResponse>(
        appPort,
        data => (data as { type?: string }).type === "WCP5ValidateAppIdentityFailedResponse",
      )

    appPort.postMessage({
      type: "WCP4ValidateAppIdentity",
      meta: {
        connectionAttemptUuid,
        timestamp: new Date(),
      },
      payload: {
        identityUrl: unknownIdentityUrl,
        actualUrl: unknownIdentityUrl,
      },
    } satisfies BrowserTypes.WebConnectionProtocol4ValidateAppIdentity)
    await flushAsyncDelivery()

    const failureResponse = await wcp5FailurePromise
    expect(failureResponse.type).toBe("WCP5ValidateAppIdentityFailedResponse")

    await vi.waitFor(() => {
      expect(connections.getConnection(tempInstanceId)).toBeUndefined()
      expect(agent.getState().instances[tempInstanceId]).toBeUndefined()
    })
  })

  it("delivers user-channel broadcast DACP round trip over MessagePort through DA-owned routing", async () => {
    const agent = createTestAgent()
    activeAgents.push(agent)

    const listener = await connectWcpAppViaDaOwnedConnection(agent, {
      connectionAttemptUuid: "da-owned-broadcast-listener-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    const broadcaster = await connectWcpAppViaDaOwnedConnection(agent, {
      connectionAttemptUuid: "da-owned-broadcast-source-uuid",
      appId: "chartApp",
      identityUrl: CHART_APP.details.url,
    })

    const broadcastPromise = waitForPortMessage<BrowserTypes.BroadcastEvent>(
      listener.appPort,
      data => (data as { type?: string }).type === "broadcastEvent",
    )

    await postDacpOnPort(
      listener.appPort,
      createJoinUserChannelMessage(listener.validatedInstanceId, listener.appId, CHANNEL_ID),
    )
    await postDacpOnPort(
      listener.appPort,
      createAddContextListenerMessage(
        listener.validatedInstanceId,
        listener.appId,
        CHANNEL_ID,
        INSTRUMENT_CONTEXT.type,
      ),
    )
    await postDacpOnPort(
      broadcaster.appPort,
      createJoinUserChannelMessage(broadcaster.validatedInstanceId, broadcaster.appId, CHANNEL_ID),
    )
    await postDacpOnPort(
      broadcaster.appPort,
      createBroadcastMessage(
        broadcaster.validatedInstanceId,
        broadcaster.appId,
        CHANNEL_ID,
        INSTRUMENT_CONTEXT,
      ),
    )

    const broadcastEvent = await broadcastPromise

    expect(broadcastEvent.payload.channelId).toBe(CHANNEL_ID)
    expect(broadcastEvent.payload.context?.type).toBe(INSTRUMENT_CONTEXT.type)
    expect(
      (
        broadcastEvent.meta as BrowserTypes.BroadcastEventMeta & {
          destination?: { instanceId?: string }
        }
      ).destination?.instanceId,
    ).toBe(listener.validatedInstanceId)
  })
})
