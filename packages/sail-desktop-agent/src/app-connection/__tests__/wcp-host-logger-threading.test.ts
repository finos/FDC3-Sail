/**
 * Host-supplied logger and logPayloadDetail must reach MessagePortTransport
 * constructed during WCP1–3 handshake (not only when the transport is built in tests).
 *
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import {
  createCapturingLogger,
  SENSITIVE_MARKER,
  serializeLogCalls,
} from "../../__tests__/utils/capturing-logger"
import type { CapturingLogger } from "../../__tests__/utils/capturing-logger"
import { SailDesktopAgent } from "../../agent/sail-desktop-agent"
import { DEFAULT_FDC3_USER_CHANNELS } from "../../agent/default-user-channels"
import { clearAllHeartbeatTimersForTesting } from "../../handlers/heartbeat/runtime"
import type { LogPayloadDetail } from "../../logging/logger"
import {
  createMessageEvent,
  createWCP1Hello,
  flushAsyncDelivery,
  TEST_ORIGIN,
} from "./wcp-edge-test-helpers"
import { PORTFOLIO_APP } from "./wcp-desktop-agent.integration.fixtures"

function createAgentWithHostLogger(
  logger: CapturingLogger,
  logPayloadDetail?: LogPayloadDetail,
): SailDesktopAgent {
  const agent = new SailDesktopAgent({
    userChannels: DEFAULT_FDC3_USER_CHANNELS,
    apps: [PORTFOLIO_APP],
    logger,
    logPayloadDetail,
    heartbeatEnabled: false,
    appConnectionOptions: {
      getIntentResolverUrl: () => false,
      getChannelSelectorUrl: () => false,
      handshakeTimeout: 30_000,
    },
  })
  agent.start()
  return agent
}

function captureAppPortAfterWcp1(connectionAttemptUuid: string, identityUrl: string): MessagePort {
  const postMessageSpy = vi.spyOn(window, "postMessage")
  window.dispatchEvent(createMessageEvent(createWCP1Hello(connectionAttemptUuid, identityUrl)))

  const calls = postMessageSpy.mock.calls as unknown as Array<[unknown, string, MessagePort[]]>
  expect(calls.length).toBeGreaterThan(0)

  const [, targetOrigin, ports] = calls[0]!
  expect(targetOrigin).toBe(TEST_ORIGIN)
  expect(ports).toEqual(expect.arrayContaining([expect.any(MessagePort)]))

  postMessageSpy.mockRestore()

  const appPort = ports[0]!
  appPort.start()
  return appPort
}

function postBroadcastEventOnAppPort(appPort: MessagePort): void {
  appPort.postMessage({
    type: "broadcastEvent",
    meta: { eventUuid: "host-logger-broadcast-event-uuid" },
    payload: {
      channelId: "fdc3.channel.1",
      context: {
        type: "fdc3.instrument",
        accountNumber: SENSITIVE_MARKER,
      },
    },
  })
}

function transportDebugCallsInclude(logger: CapturingLogger, fragment: string): boolean {
  return logger.debugCalls.some(call => call.message.includes(fragment))
}

describe("host logger threading through WCP MessagePortTransport", () => {
  const activeAgents: SailDesktopAgent[] = []

  afterEach(() => {
    clearAllHeartbeatTimersForTesting()
    for (const agent of activeAgents.splice(0)) {
      agent.stop()
    }
    vi.restoreAllMocks()
  })

  it("routes MessagePortTransport message logs to the host logger, not console", async () => {
    const logger = createCapturingLogger()
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {})

    const agent = createAgentWithHostLogger(logger)
    activeAgents.push(agent)

    const appPort = captureAppPortAfterWcp1("host-logger-transport-uuid", PORTFOLIO_APP.details.url)
    postBroadcastEventOnAppPort(appPort)
    await flushAsyncDelivery()

    expect(transportDebugCallsInclude(logger, "[MessagePortTransport]")).toBe(true)
    expect(transportDebugCallsInclude(logger, "Received message")).toBe(true)

    const consoleSinks = [
      ...consoleErrorSpy.mock.calls,
      ...consoleWarnSpy.mock.calls,
      ...consoleLogSpy.mock.calls,
    ]
    expect(
      consoleSinks.some(args =>
        args.some(arg => typeof arg === "string" && arg.includes("[MessagePortTransport]")),
      ),
    ).toBe(false)
  })

  it("reaches the full-payload transport log branch when logPayloadDetail is full", async () => {
    const logger = createCapturingLogger()
    const agent = createAgentWithHostLogger(logger, "full")
    activeAgents.push(agent)

    const appPort = captureAppPortAfterWcp1(
      "host-logger-full-payload-uuid",
      PORTFOLIO_APP.details.url,
    )
    postBroadcastEventOnAppPort(appPort)
    await flushAsyncDelivery()

    expect(
      transportDebugCallsInclude(logger, "[MessagePortTransport] BroadcastEvent details"),
    ).toBe(true)
    expect(serializeLogCalls(logger.debugCalls)).toContain("fullMessage")
    expect(serializeLogCalls(logger.debugCalls)).toContain(SENSITIVE_MARKER)
  })
})
