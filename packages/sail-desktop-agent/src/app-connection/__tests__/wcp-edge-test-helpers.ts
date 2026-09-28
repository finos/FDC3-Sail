/**
 * Shared helpers for WCP edge-contract integration tests.
 *
 * @vitest-environment jsdom
 */

import { expect, vi } from "vite-plus/test"
import type { BrowserTypes, Context } from "@finos/fdc3"
import type { SailDesktopAgent } from "../../agent/sail-desktop-agent"

export const TEST_ORIGIN = "https://example.com"

export type WcpConnectedApp = {
  connectionAttemptUuid: string
  tempInstanceId: string
  validatedInstanceId: string
  instanceUuid: string
  appPort: MessagePort
  appId: string
}

export function createWCP1Hello(
  connectionAttemptUuid: string,
  identityUrl: string,
): BrowserTypes.WebConnectionProtocol1Hello {
  return {
    type: "WCP1Hello",
    meta: {
      connectionAttemptUuid,
      timestamp: new Date().toISOString(),
    },
    payload: {
      identityUrl,
      actualUrl: identityUrl,
      fdc3Version: "2.2",
    },
  } as unknown as BrowserTypes.WebConnectionProtocol1Hello
}

export function createMessageEvent(
  data: unknown,
  source: Window = window,
  origin = TEST_ORIGIN,
): MessageEvent {
  return new MessageEvent("message", { data, source, origin })
}

/** InMemoryTransport delivers on the next macrotask; flush before asserting. */
export async function flushAsyncDelivery(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0))
}

/** Synthetic browsing context for WCP1 `event.source` (optional `window.name`). */
export function createWcpSourceWindow(hostIdentifier = ""): Window {
  const source = Object.create(window) as Window
  Object.defineProperty(source, "name", {
    value: hostIdentifier,
    writable: true,
    configurable: true,
  })
  source.postMessage = window.postMessage.bind(window)
  return source
}

function captureAppMessagePort(
  connectionAttemptUuid: string,
  identityUrl: string,
  options?: {
    hostIdentifier?: string
    sourceWindow?: Window
  },
): MessagePort {
  const postMessageSpy = vi.spyOn(window, "postMessage")
  const sourceWindow =
    options?.sourceWindow ??
    (options?.hostIdentifier !== undefined ? createWcpSourceWindow(options.hostIdentifier) : window)
  window.dispatchEvent(
    createMessageEvent(createWCP1Hello(connectionAttemptUuid, identityUrl), sourceWindow),
  )

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
  // Buffer from the moment the port is live, so nothing that arrives before a waiter attaches
  // can be lost.
  trackPortMessages(appPort)
  return appPort
}

const isWcp5Response = (data: unknown): boolean =>
  (data as { type?: string } | null)?.type === "WCP5ValidateAppIdentityResponse"

export async function connectWcpApp(
  agent: SailDesktopAgent,
  options: {
    connectionAttemptUuid: string
    appId: string
    identityUrl: string
    hostInstanceId?: string
    /** WCP1 browsing-context name (`window.name`) — disambiguates multi-pending adoption. */
    hostIdentifier?: string
    /** Explicit WCP1 `event.source` (e.g. cleared `window.name` + host registry lookup). */
    sourceWindow?: Window
    instanceUuid?: string
  },
): Promise<WcpConnectedApp> {
  const {
    connectionAttemptUuid,
    appId,
    identityUrl,
    hostInstanceId,
    hostIdentifier,
    sourceWindow,
    instanceUuid: reconnectInstanceUuid,
  } = options
  const tempInstanceId = `temp-${connectionAttemptUuid}`
  const browserAppConnection = agent.appConnection

  const appPort = captureAppMessagePort(connectionAttemptUuid, identityUrl, {
    hostIdentifier,
    sourceWindow,
  })

  expect(browserAppConnection.getConnection(tempInstanceId)).toBeDefined()

  const wcp5Response =
    waitForPortMessage<BrowserTypes.WebConnectionProtocol5ValidateAppIdentitySuccessResponse>(
      appPort,
      isWcp5Response,
    )

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
      ...(reconnectInstanceUuid ? { instanceUuid: reconnectInstanceUuid } : {}),
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
  const validatedInstanceUuid = resolvedWcp5.payload.instanceUuid
  expect(validatedInstanceId).toBeTruthy()
  expect(validatedInstanceUuid).toBeTruthy()
  expect(resolvedWcp5.payload.appId).toBe(appId)

  await vi.waitFor(() => {
    expect(browserAppConnection.getConnection(validatedInstanceId)).toBeDefined()
    expect(browserAppConnection.getConnection(tempInstanceId)).toBeUndefined()
  })

  return {
    connectionAttemptUuid,
    tempInstanceId,
    validatedInstanceId,
    instanceUuid: validatedInstanceUuid,
    appPort,
    appId,
  }
}

/**
 * FINOS-realistic first WCP4 connect: `identityUrl` only — omits `instanceUuid` and
 * `hostInstanceId` unless the test opts into `hostInstanceId`.
 */
export async function connectWcpAppFirstConnect(
  agent: SailDesktopAgent,
  options: {
    connectionAttemptUuid: string
    appId: string
    identityUrl: string
    hostInstanceId?: string
    hostIdentifier?: string
    sourceWindow?: Window
  },
): Promise<WcpConnectedApp> {
  const { hostInstanceId, hostIdentifier, sourceWindow, ...rest } = options
  return connectWcpApp(agent, {
    ...rest,
    ...(hostInstanceId !== undefined ? { hostInstanceId } : {}),
    ...(hostIdentifier !== undefined ? { hostIdentifier } : {}),
    ...(sourceWindow !== undefined ? { sourceWindow } : {}),
  })
}

export type WcpFirstConnectSession = {
  connectionAttemptUuid: string
  tempInstanceId: string
  appPort: MessagePort
  postFirstConnectWcp4: () => Promise<void>
  completeFirstConnect: () => Promise<WcpConnectedApp>
}

/**
 * Starts a FINOS first-connect handshake through WCP3, leaving WCP4/WCP5 for the test
 * to interleave with early DACP (e.g. addContextListener on the temp routing id).
 */
export function beginWcpAppFirstConnect(
  agent: SailDesktopAgent,
  options: {
    connectionAttemptUuid: string
    appId: string
    identityUrl: string
    hostIdentifier?: string
    sourceWindow?: Window
  },
): WcpFirstConnectSession {
  const { connectionAttemptUuid, appId, identityUrl, hostIdentifier, sourceWindow } = options
  const tempInstanceId = `temp-${connectionAttemptUuid}`
  const browserAppConnection = agent.appConnection

  const appPort = captureAppMessagePort(connectionAttemptUuid, identityUrl, {
    hostIdentifier,
    sourceWindow,
  })
  expect(browserAppConnection.getConnection(tempInstanceId)).toBeDefined()

  const wcp5Response =
    waitForPortMessage<BrowserTypes.WebConnectionProtocol5ValidateAppIdentitySuccessResponse>(
      appPort,
      isWcp5Response,
    )

  const wcp4Message: BrowserTypes.WebConnectionProtocol4ValidateAppIdentity = {
    type: "WCP4ValidateAppIdentity",
    meta: {
      connectionAttemptUuid,
      timestamp: new Date(),
    },
    payload: {
      identityUrl,
      actualUrl: identityUrl,
    },
  }

  return {
    connectionAttemptUuid,
    tempInstanceId,
    appPort,
    postFirstConnectWcp4: async () => {
      appPort.postMessage(wcp4Message)
      await flushAsyncDelivery()
    },
    completeFirstConnect: async () => {
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
      const validatedInstanceUuid = resolvedWcp5.payload.instanceUuid
      expect(validatedInstanceId).toBeTruthy()
      expect(validatedInstanceUuid).toBeTruthy()
      expect(resolvedWcp5.payload.appId).toBe(appId)

      await vi.waitFor(() => {
        expect(browserAppConnection.getConnection(validatedInstanceId)).toBeDefined()
        expect(browserAppConnection.getConnection(tempInstanceId)).toBeUndefined()
      })

      return {
        connectionAttemptUuid,
        tempInstanceId,
        validatedInstanceId,
        instanceUuid: validatedInstanceUuid,
        appPort,
        appId,
      }
    },
  }
}

export async function postDacpOnPort(
  appPort: MessagePort,
  message: BrowserTypes.AppRequestMessage,
): Promise<void> {
  appPort.postMessage(message)
  await flushAsyncDelivery()
}

type PortWaiter = {
  predicate: (data: unknown) => boolean
  settle: (event: MessageEvent) => void
}

type PortInbox = {
  /** Messages that arrived with no waiter interested in them yet. */
  pending: MessageEvent[]
  waiters: PortWaiter[]
}

const portInboxes = new WeakMap<MessagePort, PortInbox>()

/**
 * Buffers everything a port receives, from the moment it is captured.
 *
 * The helpers used to wait by swapping `appPort.onmessage` and restoring a `priorHandler`.
 * That loses messages: a waiter only listens from the instant it is called, so a reply that
 * arrives first is delivered to whatever handler happens to be installed — in practice the
 * already-resolved WCP5 resolver, whose `resolve()` is a silent no-op. The message is then gone
 * and the waiter times out. Buffering makes arrival order irrelevant: a waiter either finds its
 * message already queued or is woken when it lands.
 */
function inboxFor(appPort: MessagePort): PortInbox {
  const existing = portInboxes.get(appPort)
  if (existing) return existing

  const inbox: PortInbox = { pending: [], waiters: [] }
  portInboxes.set(appPort, inbox)

  appPort.addEventListener("message", event => {
    const index = inbox.waiters.findIndex(waiter => waiter.predicate(event.data))
    if (index === -1) {
      inbox.pending.push(event)
      return
    }
    const [waiter] = inbox.waiters.splice(index, 1)
    waiter?.settle(event)
  })

  return inbox
}

/**
 * Starts buffering a captured port. Safe to call more than once per port.
 */
export function trackPortMessages(appPort: MessagePort): void {
  inboxFor(appPort)
}

export function waitForPortMessage<T>(
  appPort: MessagePort,
  predicate: (data: unknown) => boolean,
  timeoutMs = 5000,
): Promise<T> {
  const inbox = inboxFor(appPort)

  // Consume a matching message that already arrived, so sequential waits for different
  // messages each get their own rather than both matching the first one seen.
  const buffered = inbox.pending.findIndex(event => predicate(event.data))
  if (buffered !== -1) {
    const [event] = inbox.pending.splice(buffered, 1)
    return Promise.resolve(event!.data as T)
  }

  return new Promise<T>((resolve, reject) => {
    const waiter: PortWaiter = {
      predicate,
      settle: event => {
        clearTimeout(timer)
        resolve(event.data as T)
      },
    }
    const timer = setTimeout(() => {
      const index = inbox.waiters.indexOf(waiter)
      if (index !== -1) inbox.waiters.splice(index, 1)
      reject(new Error("Timed out waiting for MessagePort message"))
    }, timeoutMs)
    inbox.waiters.push(waiter)
  })
}

export const INSTRUMENT_CONTEXT: Context = {
  type: "fdc3.instrument",
  id: { ticker: "AAPL" },
}

export const COUNTRY_CONTEXT: Context = {
  type: "fdc3.country",
  id: { ISOCountryCode: "SE" },
}

export function collectPortMessages<T>(
  appPort: MessagePort,
  predicate: (data: unknown) => boolean,
): { messages: T[]; stop: () => void } {
  const messages: T[] = []
  const handler = (event: MessageEvent) => {
    if (predicate(event.data)) {
      messages.push(event.data as T)
    }
  }
  appPort.addEventListener("message", handler)
  return {
    messages,
    stop: () => appPort.removeEventListener("message", handler),
  }
}

export function createAddEventListenerMessage(
  instanceId: string,
  appId: string,
  eventType: BrowserTypes.AddEventListenerRequest["payload"]["type"],
): BrowserTypes.AddEventListenerRequest {
  return {
    type: "addEventListenerRequest",
    meta: {
      requestUuid: crypto.randomUUID(),
      timestamp: new Date(),
      source: { appId, instanceId },
    },
    payload: { type: eventType },
  }
}

export function createJoinUserChannelMessage(
  instanceId: string,
  appId: string,
  channelId: string,
): BrowserTypes.JoinUserChannelRequest {
  return {
    type: "joinUserChannelRequest",
    meta: {
      requestUuid: crypto.randomUUID(),
      timestamp: new Date(),
      source: { appId, instanceId },
    },
    payload: { channelId },
  }
}

export function createAddContextListenerMessage(
  instanceId: string,
  appId: string,
  channelId: string | null,
  contextType: string,
): BrowserTypes.AddContextListenerRequest {
  return {
    type: "addContextListenerRequest",
    meta: {
      requestUuid: crypto.randomUUID(),
      timestamp: new Date(),
      source: { appId, instanceId },
    },
    payload: { channelId, contextType },
  }
}

/** Generic user-channel listener (AOpensBWithContext3 / FINOS open-with-context path). */
export function createGenericContextListenerMessage(
  instanceId: string,
  appId: string,
): BrowserTypes.AddContextListenerRequest {
  return createAddContextListenerMessage(instanceId, appId, null, "*")
}

export function createBroadcastMessage(
  instanceId: string,
  appId: string,
  channelId: string,
  context: Context,
): BrowserTypes.BroadcastRequest {
  return {
    type: "broadcastRequest",
    meta: {
      requestUuid: crypto.randomUUID(),
      timestamp: new Date(),
      source: { appId, instanceId },
    },
    payload: { channelId, context },
  }
}

export function createOpenRequestMessage(
  sourceInstanceId: string,
  sourceAppId: string,
  targetAppId: string,
  context?: Context,
): BrowserTypes.OpenRequest {
  return {
    type: "openRequest",
    meta: {
      requestUuid: crypto.randomUUID(),
      timestamp: new Date(),
      source: { appId: sourceAppId, instanceId: sourceInstanceId },
    },
    payload: {
      app: { appId: targetAppId },
      ...(context ? { context } : {}),
    },
  }
}

export function createGetOrCreateChannelMessage(
  instanceId: string,
  appId: string,
  channelId: string,
): BrowserTypes.GetOrCreateChannelRequest {
  return {
    type: "getOrCreateChannelRequest",
    meta: {
      requestUuid: crypto.randomUUID(),
      timestamp: new Date(),
      source: { appId, instanceId },
    },
    payload: { channelId },
  }
}
