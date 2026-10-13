/**
 * Each app is served at `min(WCP1Hello.fdc3Version, implementationMetadata.fdc3Version)`.
 * WCP3Handshake, WCP5ValidateAppIdentityResponse and `getInfo` must all report that version.
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

type ImplementationMetadata = BrowserTypes.ImplementationMetadata

/**
 * Drives WCP1 → WCP5 → getInfo against the started agent (window `message` listener) and returns
 * what each step reported.
 */
async function handshakeVersions(helloFdc3Version?: string): Promise<{
  wcp3: string
  wcp5: string
  getInfo: ImplementationMetadata
}> {
  const connectionAttemptUuid = crypto.randomUUID()
  const postMessageSpy = vi.spyOn(window, "postMessage")

  window.dispatchEvent(
    createMessageEvent(
      createWCP1Hello(connectionAttemptUuid, IDENTITY_URL, helloFdc3Version),
      window,
    ),
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
  const nextMessage = <T>(type: string): Promise<T> =>
    Promise.race([
      new Promise<T>(resolve => {
        appPort.onmessage = event => {
          if ((event.data as { type?: string }).type === type) {
            resolve(event.data as T)
          }
        }
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timed out waiting for ${type}`)), 5000),
      ),
    ])

  const wcp5 = nextMessage<BrowserTypes.WebConnectionProtocol5ValidateAppIdentitySuccessResponse>(
    "WCP5ValidateAppIdentityResponse",
  )
  appPort.postMessage({
    type: "WCP4ValidateAppIdentity",
    meta: { connectionAttemptUuid, timestamp: new Date() },
    payload: { identityUrl: IDENTITY_URL, actualUrl: IDENTITY_URL },
  } satisfies BrowserTypes.WebConnectionProtocol4ValidateAppIdentity)
  await flushAsyncDelivery()
  const wcp5Response = await wcp5

  const getInfo = nextMessage<BrowserTypes.GetInfoResponse>("getInfoResponse")
  appPort.postMessage({
    type: "getInfoRequest",
    meta: { requestUuid: crypto.randomUUID(), timestamp: new Date().toISOString() },
    payload: {},
  })
  await flushAsyncDelivery()
  const getInfoResponse = await getInfo

  return {
    wcp3: handshake.payload.fdc3Version,
    wcp5: wcp5Response.payload.implementationMetadata.fdc3Version,
    getInfo: getInfoResponse.payload.implementationMetadata!,
  }
}

describe("per-app fdc3Version negotiation", () => {
  let agent: SailDesktopAgent | undefined

  afterEach(() => {
    agent?.stop()
    agent = undefined
    vi.restoreAllMocks()
  })

  it("serves a 3.0 app at 3.0 without the 2.x-only OriginatingAppMetadata flag", async () => {
    agent = createAgent("3.0")

    const { wcp3, wcp5, getInfo } = await handshakeVersions("3.0")

    expect(wcp3).toBe("3.0")
    expect(wcp5).toBe("3.0")
    expect(getInfo.fdc3Version).toBe("3.0")
    expect(getInfo.optionalFeatures).not.toHaveProperty("OriginatingAppMetadata")
  })

  it("serves a 2.2 app at 2.2 on a 3.0 agent, with OriginatingAppMetadata", async () => {
    agent = createAgent("3.0")

    const { wcp3, wcp5, getInfo } = await handshakeVersions("2.2")

    expect(wcp3).toBe("2.2")
    expect(wcp5).toBe("2.2")
    expect(getInfo.fdc3Version).toBe("2.2")
    expect(getInfo.optionalFeatures).toHaveProperty("OriginatingAppMetadata", true)
    expect(agent.getImplementationMetadata().fdc3Version).toBe("3.0")
  })

  it("never offers more than the agent supports", async () => {
    agent = createAgent("2.2")

    const { wcp3, wcp5, getInfo } = await handshakeVersions("3.0")

    expect(wcp3).toBe("2.2")
    expect(wcp5).toBe("2.2")
    expect(getInfo.fdc3Version).toBe("2.2")
  })

  it("serves an app whose hello has no version at the agent's version", async () => {
    agent = createAgent("3.0")

    const { wcp3, wcp5, getInfo } = await handshakeVersions("")

    expect(wcp3).toBe("3.0")
    expect(wcp5).toBe("3.0")
    expect(getInfo.fdc3Version).toBe("3.0")
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

    const { wcp3, wcp5 } = await handshakeVersions("3.0")

    expect(wcp3).toBe("3.0")
    expect(wcp5).toBe("3.0")
  })
})
