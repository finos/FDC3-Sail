/**
 * SailDesktopAgent lifecycle tests.
 *
 * Verifies browser WCP teardown on stop and that a fresh instance can complete
 * handshake without stale connection state.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, afterEach, vi } from "vite-plus/test"
import type { BrowserTypes } from "@finos/fdc3"
import { SailDesktopAgent } from "../agent/sail-desktop-agent"

function createWCP1Hello(connectionAttemptUuid: string): BrowserTypes.WebConnectionProtocol1Hello {
  const message = {
    type: "WCP1Hello",
    meta: {
      connectionAttemptUuid,
      timestamp: new Date().toISOString(),
    },
    payload: {
      identityUrl: "https://example.com/app",
      actualUrl: "https://example.com/app",
      fdc3Version: "2.2",
    },
  }

  return message as unknown as BrowserTypes.WebConnectionProtocol1Hello
}

function createMessageEvent(data: unknown, source: Window = window): MessageEvent {
  return new MessageEvent("message", {
    data,
    source,
    origin: "https://example.com",
  })
}

async function expectWCP3Handshake(connectionAttemptUuid: string): Promise<void> {
  const postMessageSpy = vi.spyOn(window, "postMessage")

  window.dispatchEvent(createMessageEvent(createWCP1Hello(connectionAttemptUuid)))
  await new Promise(resolve => setTimeout(resolve, 50))

  const calls = postMessageSpy.mock.calls as unknown as Array<
    [BrowserTypes.WebConnectionProtocol3Handshake, string, MessagePort[]]
  >
  expect(calls.length).toBeGreaterThan(0)

  const [handshakeMessage, targetOrigin, ports] = calls[0]!
  expect(handshakeMessage.type).toBe("WCP3Handshake")
  expect(handshakeMessage.meta.connectionAttemptUuid).toBe(connectionAttemptUuid)
  expect(targetOrigin).toBe("https://example.com")
  expect(ports).toEqual(expect.arrayContaining([expect.any(MessagePort)]))

  postMessageSpy.mockRestore()
}

describe("SailDesktopAgent lifecycle", () => {
  const activeAgents: SailDesktopAgent[] = []

  afterEach(() => {
    for (const agent of activeAgents.splice(0)) {
      agent.stop()
    }
  })

  it("completes WCP handshake after a previous agent was started and stopped", async () => {
    const firstAgent = new SailDesktopAgent({
      appConnectionOptions: {
        getIntentResolverUrl: () => false,
        getChannelSelectorUrl: () => false,
      },
    })
    activeAgents.push(firstAgent)

    firstAgent.start()
    firstAgent.stop()

    const secondAgent = new SailDesktopAgent({
      appConnectionOptions: {
        getIntentResolverUrl: () => false,
        getChannelSelectorUrl: () => false,
      },
    })
    activeAgents.push(secondAgent)

    secondAgent.start()

    await expectWCP3Handshake("reuse-after-stop-uuid")
    expect(secondAgent.appConnection.getConnections()).toHaveLength(1)
  })

  it("allows stop then start on a new instance without stale in-memory transport", async () => {
    const sessionOne = new SailDesktopAgent()
    activeAgents.push(sessionOne)
    sessionOne.start()
    sessionOne.stop()

    const sessionTwo = new SailDesktopAgent()
    activeAgents.push(sessionTwo)
    sessionTwo.start()

    await expectWCP3Handshake("fresh-pair-uuid")

    expect(sessionOne.appConnection.getIsStarted()).toBe(false)
    expect(sessionTwo.appConnection.getIsStarted()).toBe(true)
    expect(sessionTwo.appConnection.getConnections()).toHaveLength(1)
  })
})
