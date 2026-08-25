/**
 * Shared helpers for BrowserAppConnection unit tests.
 *
 * @vitest-environment jsdom
 */

import { expect, vi } from "vite-plus/test"
import type { BrowserTypes } from "@finos/fdc3"
import type { BrowserAppConnection } from "../../app-connection/browser-app-connection"

export function createWCP1Hello(
  connectionAttemptUuid: string = "test-uuid",
): BrowserTypes.WebConnectionProtocol1Hello {
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

export function createMessageEvent(data: unknown, source: Window = window): MessageEvent {
  return new MessageEvent("message", {
    data,
    source,
    origin: "https://example.com",
  })
}

/** Establish a WCP connection and return the temporary instanceId. */
export async function establishTempConnection(
  connector: BrowserAppConnection,
  connectionAttemptUuid = "test-uuid",
): Promise<string> {
  window.dispatchEvent(createMessageEvent(createWCP1Hello(connectionAttemptUuid)))
  await new Promise(resolve => setTimeout(resolve, 50))
  const connections = connector.getConnections()
  expect(connections).toHaveLength(1)
  return connections[0]!.instanceId
}

/** Return port1 transferred to the app during WCP3Handshake. */
export function captureAppMessagePort(connectionAttemptUuid = "test-uuid"): MessagePort {
  const postMessageSpy = vi.spyOn(window, "postMessage")
  window.dispatchEvent(createMessageEvent(createWCP1Hello(connectionAttemptUuid)))

  const calls = postMessageSpy.mock.calls as unknown as Array<
    [BrowserTypes.WebConnectionProtocol3Handshake, string, MessagePort[]]
  >
  expect(calls.length).toBeGreaterThan(0)
  const ports = calls[0]![2]
  expect(ports).toEqual(expect.arrayContaining([expect.any(MessagePort)]))

  postMessageSpy.mockRestore()
  const appPort = ports[0]!
  appPort.start()
  return appPort
}
