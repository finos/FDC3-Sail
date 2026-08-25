import type { SailDesktopAgent } from "@finos/sail-desktop-agent"

import type { HarnessInstanceCleanup } from "./harness-instance-lifecycle"
import {
  HARNESS_FINOS_APP_CONTROL_CHANNEL,
  relayFinOsCloseWindowToMockApps,
  type FinOsCloseWindowContext,
} from "./harness-browsing-context-close"

const CONFORMANCE1_APP_ID = "Conformance1"
const HARNESS_LOG_PREFIX = "[ConformanceHarness]"
type HarnessAppMessageHandler = (message: unknown) => void | Promise<void>

/** Context types FINOS mock apps emit on `app-control` after receiving `closeWindow`. */
export const FINOS_MOCK_TEARDOWN_CONTEXT_TYPES = new Set(["windowClosed", "fdc3.nothing"])

export type MockAppTeardownBroadcast = {
  instanceId: string
  appId: string
}

export type Conformance1CloseWindowBroadcast = {
  conformance1InstanceId: string
  context: FinOsCloseWindowContext
}

/**
 * Detect Conformance1 `broadcastRequest` of `closeWindow` on `app-control`
 * (FINOS `closeMockAppWindow` / `broadcastCloseWindow`).
 */
export function parseConformance1CloseWindowBroadcast(
  message: unknown,
  options?: { conformance1AppId?: string },
): Conformance1CloseWindowBroadcast | undefined {
  const conformance1AppId = options?.conformance1AppId ?? CONFORMANCE1_APP_ID

  if (!message || typeof message !== "object") {
    return undefined
  }

  const record = message as Record<string, unknown>
  if (record.type !== "broadcastRequest") {
    return undefined
  }

  const meta = record.meta as { source?: { appId?: string; instanceId?: string } } | undefined
  const payload = record.payload as
    | { channelId?: string; context?: Record<string, unknown> }
    | undefined

  if (payload?.channelId !== HARNESS_FINOS_APP_CONTROL_CHANNEL) {
    return undefined
  }

  const context = payload.context
  if (!context || context.type !== "closeWindow") {
    return undefined
  }

  const appId = meta?.source?.appId
  const instanceId = meta?.source?.instanceId
  if (!appId || !instanceId || appId !== conformance1AppId) {
    return undefined
  }

  return {
    conformance1InstanceId: instanceId,
    context: context as FinOsCloseWindowContext,
  }
}

/**
 * Detect mock-app `broadcastRequest` on `app-control` that completes the FINOS
 * close-context handshake (Conformance1 Mocha waits up to 1s for this).
 */
export function parseMockAppControlTeardownBroadcast(
  message: unknown,
  options?: { conformance1AppId?: string },
): MockAppTeardownBroadcast | undefined {
  const conformance1AppId = options?.conformance1AppId ?? CONFORMANCE1_APP_ID

  if (!message || typeof message !== "object") {
    return undefined
  }

  const record = message as Record<string, unknown>
  if (record.type !== "broadcastRequest") {
    return undefined
  }

  const meta = record.meta as { source?: { appId?: string; instanceId?: string } } | undefined
  const payload = record.payload as { channelId?: string; context?: { type?: string } } | undefined

  if (payload?.channelId !== HARNESS_FINOS_APP_CONTROL_CHANNEL) {
    return undefined
  }

  const contextType = payload.context?.type
  if (!contextType || !FINOS_MOCK_TEARDOWN_CONTEXT_TYPES.has(contextType)) {
    return undefined
  }

  const appId = meta?.source?.appId
  const instanceId = meta?.source?.instanceId
  if (!appId || !instanceId || appId === conformance1AppId) {
    return undefined
  }

  return { instanceId, appId }
}

/**
 * Observe inbound DACP from apps for the FINOS close-context handshake:
 *
 * 1. Conformance1 `closeWindow` on `app-control` → relay `broadcastEvent` to connected
 *    mock instances (preserves `testId` for ChannelsApp / MockApp echo).
 * 2. Mock `windowClosed` / `fdc3.nothing` → deferred disconnect so Conformance1 receives
 *    the teardown broadcast before the mock MessagePort is torn down.
 */
export function createHarnessFinOsTeardownObserver(options: {
  instanceCleanup: HarnessInstanceCleanup
  getDesktopAgent?: () => SailDesktopAgent | null | undefined
  conformance1AppId?: string
  deferDisconnectMs?: number
}): (message: unknown) => void {
  const { instanceCleanup, getDesktopAgent, conformance1AppId, deferDisconnectMs = 0 } = options

  return message => {
    const closeWindow = parseConformance1CloseWindowBroadcast(message, { conformance1AppId })
    if (closeWindow) {
      const desktopAgent = getDesktopAgent?.()
      if (desktopAgent) {
        const delivered = relayFinOsCloseWindowToMockApps({
          desktopAgent,
          conformance1InstanceId: closeWindow.conformance1InstanceId,
          context: closeWindow.context,
        })
        if (delivered.length > 0) {
          console.log(
            `${HARNESS_LOG_PREFIX} Relayed closeWindow to mock instance(s): ${delivered.join(", ")}`,
          )
        }
      }
    }

    const teardown = parseMockAppControlTeardownBroadcast(message, { conformance1AppId })
    if (!teardown) {
      return
    }

    const disconnect = () => {
      instanceCleanup.disconnectHarnessInstance(teardown.instanceId)
    }

    if (deferDisconnectMs <= 0) {
      setTimeout(disconnect, 0)
      return
    }

    setTimeout(disconnect, deferDisconnectMs)
  }
}

export function installHarnessInboundAppMessageObserver(
  appConnection: {
    onAppMessage(handler: HarnessAppMessageHandler): void
  },
  observer: (message: unknown) => void,
): void {
  const registerAppMessageHandler = appConnection.onAppMessage.bind(appConnection)

  appConnection.onAppMessage = handler => {
    registerAppMessageHandler(message => {
      observer(message)
      return handler(message)
    })
  }
}
