/**
 * Target-architecture seams for DA-owned browser app connection tests.
 *
 * These helpers assert the collapsed model where SailDesktopAgent owns WCP listener
 * lifecycle and per-app MessagePort routing via BrowserAppConnection.
 *
 * @vitest-environment jsdom
 */
import { expect, vi } from "vite-plus/test"
import type { BrowserTypes } from "@finos/fdc3"
import { BrowserAppConnection } from "../../app-connection/browser-app-connection"
import type { SailDesktopAgent } from "../../agent/sail-desktop-agent"
import type { SailDesktopAgentApps } from "../../agent/sail-desktop-agent-controllers"
import {
  createMessageEvent,
  createWCP1Hello,
  flushAsyncDelivery,
  TEST_ORIGIN,
  type WcpConnectedApp,
} from "./wcp-edge-test-helpers"

/**
 * Assert the agent uses the collapsed browser architecture (DA-owned connection backend).
 */
export function assertCollapsedBrowserArchitecture(agent: SailDesktopAgent): void {
  expect(agent.appConnection).toBeInstanceOf(BrowserAppConnection)
}

/**
 * Require SailDesktopAgent-owned app connection APIs (the real `apps` controller).
 */
export function requireDaOwnedAppConnection(agent: SailDesktopAgent): SailDesktopAgentApps {
  assertCollapsedBrowserArchitecture(agent)
  const { apps } = agent
  expect(typeof apps.getConnection).toBe("function")
  expect(typeof apps.getConnections).toBe("function")
  return apps
}

function captureAppMessagePort(connectionAttemptUuid: string, identityUrl: string): MessagePort {
  const postMessageSpy = vi.spyOn(window, "postMessage")
  window.dispatchEvent(createMessageEvent(createWCP1Hello(connectionAttemptUuid, identityUrl)))
  const calls = postMessageSpy.mock.calls as unknown as Array<
    [BrowserTypes.WebConnectionProtocol3Handshake, string, MessagePort[]]
  >
  expect(calls.length).toBeGreaterThan(0)
  const [handshakeMessage, targetOrigin, ports] = calls[0]!
  expect(handshakeMessage.type).toBe("WCP3Handshake")
  expect(handshakeMessage.meta.connectionAttemptUuid).toBe(connectionAttemptUuid)
  expect(targetOrigin).toBe(TEST_ORIGIN)
  expect(ports).toEqual(expect.arrayContaining([expect.any(MessagePort)]))
  postMessageSpy.mockRestore()
  const appPort = ports[0]!
  appPort.start()
  return appPort
}

/**
 * Complete WCP1-5 through SailDesktopAgent-owned browser app connection.
 */
export async function connectWcpAppViaDaOwnedConnection(
  agent: SailDesktopAgent,
  options: {
    connectionAttemptUuid: string
    appId: string
    identityUrl: string
    hostInstanceId?: string
    instanceUuid?: string
  },
): Promise<WcpConnectedApp> {
  const connections = requireDaOwnedAppConnection(agent)

  const { connectionAttemptUuid, appId, identityUrl, hostInstanceId, instanceUuid } = options

  const tempInstanceId = `temp-${connectionAttemptUuid}`

  const appPort = captureAppMessagePort(connectionAttemptUuid, identityUrl)

  expect(connections.getConnection(tempInstanceId)).toBeDefined()

  const wcp5Response =
    new Promise<BrowserTypes.WebConnectionProtocol5ValidateAppIdentitySuccessResponse>(resolve => {
      appPort.onmessage = event => {
        resolve(event.data as BrowserTypes.WebConnectionProtocol5ValidateAppIdentitySuccessResponse)
      }
    })

  const wcp4Message: BrowserTypes.WebConnectionProtocol4ValidateAppIdentity = {
    type: "WCP4ValidateAppIdentity",
    meta: {
      connectionAttemptUuid,
      timestamp: new Date(),
    },
    payload: {
      identityUrl,
      actualUrl: identityUrl,
      ...(hostInstanceId ? { instanceId: hostInstanceId } : {}),
      ...(instanceUuid ? { instanceUuid } : {}),
    },
  }

  appPort.postMessage(wcp4Message)

  await flushAsyncDelivery()

  const resolvedWcp5 = await Promise.race([
    wcp5Response,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Timed out waiting for WCP5ValidateAppIdentityResponse")),
        5000,
      ),
    ),
  ])

  expect(resolvedWcp5.type).toBe("WCP5ValidateAppIdentityResponse")

  const validatedInstanceId = resolvedWcp5.payload.instanceId

  expect(validatedInstanceId).toBeTruthy()

  expect(resolvedWcp5.payload.appId).toBe(appId)

  const validatedInstanceUuid = resolvedWcp5.payload.instanceUuid
  expect(validatedInstanceUuid).toBeTruthy()

  await vi.waitFor(() => {
    expect(connections.getConnection(validatedInstanceId)).toBeDefined()
    expect(connections.getConnection(tempInstanceId)).toBeUndefined()
  })

  return {
    connectionAttemptUuid,
    tempInstanceId,
    validatedInstanceId,
    appPort,
    appId,
    instanceUuid: validatedInstanceUuid,
  }
}
