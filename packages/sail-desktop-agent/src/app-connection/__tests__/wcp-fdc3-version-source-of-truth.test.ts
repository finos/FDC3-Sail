/**
 * `implementationMetadata.fdc3Version` is the single source of truth for the advertised
 * version: WCP3Handshake and WCP5ValidateAppIdentityResponse must agree from one setting.
 *
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from "vite-plus/test"
import type { BrowserTypes } from "@finos/fdc3"

import { SailDesktopAgent } from "../../agent/sail-desktop-agent"
import { DEFAULT_FDC3_USER_CHANNELS } from "../../agent/default-user-channels"
import { PORTFOLIO_APP } from "./wcp-desktop-agent.integration.fixtures"
import {
  createMessageEvent,
  createWCP1Hello,
  flushAsyncDelivery,
  TEST_ORIGIN,
} from "./wcp-edge-test-helpers"

const IDENTITY_URL = `${TEST_ORIGIN}/portfolio`

function createAgent(fdc3Version: string): SailDesktopAgent {
  const agent = new SailDesktopAgent({
    userChannels: DEFAULT_FDC3_USER_CHANNELS,
    apps: [PORTFOLIO_APP],
    heartbeatEnabled: false,
    // The only place the version is set — nothing in appConnectionOptions.
    implementationMetadata: { fdc3Version },
    appConnectionOptions: {
      getIntentResolverUrl: () => false,
      getChannelSelectorUrl: () => false,
      handshakeTimeout: 30_000,
    },
  })
  agent.start()
  return agent
}

/**
 * Drives WCP1 → WCP5 against the started agent (window `message` listener) and returns the
 * version each side of the handshake advertised.
 */
async function handshakeVersions(): Promise<{ wcp3: string; wcp5: string }> {
  const connectionAttemptUuid = crypto.randomUUID()
  const postMessageSpy = vi.spyOn(window, "postMessage")

  window.dispatchEvent(
    createMessageEvent(createWCP1Hello(connectionAttemptUuid, IDENTITY_URL), window),
  )

  const [handshake, , ports] = postMessageSpy.mock.calls[0] as unknown as [
    BrowserTypes.WebConnectionProtocol3Handshake,
    string,
    MessagePort[],
  ]
  postMessageSpy.mockRestore()
  expect(handshake.type).toBe("WCP3Handshake")

  const appPort = ports[0]!
  appPort.start()
  const wcp5 = new Promise<BrowserTypes.WebConnectionProtocol5ValidateAppIdentitySuccessResponse>(
    resolve => {
      appPort.onmessage = event =>
        resolve(event.data as BrowserTypes.WebConnectionProtocol5ValidateAppIdentitySuccessResponse)
    },
  )

  appPort.postMessage({
    type: "WCP4ValidateAppIdentity",
    meta: { connectionAttemptUuid, timestamp: new Date() },
    payload: { identityUrl: IDENTITY_URL, actualUrl: IDENTITY_URL },
  } satisfies BrowserTypes.WebConnectionProtocol4ValidateAppIdentity)
  await flushAsyncDelivery()

  const response = await Promise.race([
    wcp5,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Timed out waiting for WCP5")), 5000),
    ),
  ])

  return {
    wcp3: handshake.payload.fdc3Version,
    wcp5: response.payload.implementationMetadata.fdc3Version,
  }
}

describe("fdc3Version source of truth", () => {
  let agent: SailDesktopAgent | undefined

  afterEach(() => {
    agent?.stop()
    agent = undefined
    vi.restoreAllMocks()
  })

  it("advertises implementationMetadata.fdc3Version in WCP3 and WCP5 from one setting", async () => {
    agent = createAgent("3.0")

    const { wcp3, wcp5 } = await handshakeVersions()

    expect(wcp3).toBe("3.0")
    expect(wcp5).toBe("3.0")
    expect(agent.getImplementationMetadata().fdc3Version).toBe("3.0")
  })

  it("falls back to the agent default when implementationMetadata omits the version", async () => {
    agent = new SailDesktopAgent({
      userChannels: DEFAULT_FDC3_USER_CHANNELS,
      apps: [PORTFOLIO_APP],
      heartbeatEnabled: false,
      appConnectionOptions: {
        getIntentResolverUrl: () => false,
        getChannelSelectorUrl: () => false,
        handshakeTimeout: 30_000,
      },
    })
    agent.start()

    const { wcp3, wcp5 } = await handshakeVersions()

    expect(wcp3).toBe("2.2")
    expect(wcp5).toBe("2.2")
  })
})
