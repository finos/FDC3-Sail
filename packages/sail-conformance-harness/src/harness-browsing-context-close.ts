import type { SailDesktopAgent } from "@finos/sail-desktop-agent"

import type { PopupCloseWatcher } from "./popup-launcher"

const HARNESS_LOG_PREFIX = "[ConformanceHarness]"

/** FINOS toolbox teardown channel for mock-app close handshake. */
export const HARNESS_FINOS_APP_CONTROL_CHANNEL = "app-control"

export type FinOsCloseWindowContext = {
  type: "closeWindow"
  testId?: string
  [key: string]: unknown
}

const FINOS_CLOSE_WINDOW_CONTEXT: FinOsCloseWindowContext = { type: "closeWindow" }

/** Try to destroy a host-owned browsing context opened via {@link window.open}. */
export function tryCloseBrowsingContext(
  windowRef: Window | null | undefined,
  instanceId: string,
): boolean {
  if (!windowRef) {
    return false
  }
  if (windowRef.closed) {
    return true
  }

  try {
    windowRef.close()
  } catch (error) {
    console.warn(`${HARNESS_LOG_PREFIX} window.close() threw for ${instanceId}`, error)
  }

  // oxlint-disable-next-line typescript/no-unnecessary-condition -- TypeScript narrows windowRef.closed to false above and never invalidates that across windowRef.close(), which is precisely what mutates it; the linter's own autofix breaks same-origin close detection here
  if (windowRef.closed) {
    return true
  }

  console.warn(`${HARNESS_LOG_PREFIX} Browsing context still open after close() for ${instanceId}`)
  return false
}

/** Collect launcher and WCP routing ids that may refer to the same popup. */
export function collectHarnessCloseInstanceIds(
  desktopAgent: SailDesktopAgent,
  instanceId: string,
  popupWatcher?: Pick<PopupCloseWatcher, "findRegisteredIdsForWindowName">,
): string[] {
  const ids = new Set<string>([instanceId])

  for (const connection of desktopAgent.apps.getConnections()) {
    if (connection.instanceId === instanceId) {
      for (const other of desktopAgent.apps.getConnections()) {
        if (other.source === connection.source) {
          ids.add(other.instanceId)
        }
      }
    }
  }

  for (const instance of desktopAgent.apps.getInstances()) {
    if (instance.instanceId === instanceId) {
      ids.add(instance.instanceId)
    }
  }

  if (popupWatcher) {
    for (const registeredId of popupWatcher.findRegisteredIdsForWindowName(instanceId)) {
      ids.add(registeredId)
    }
  }

  return [...ids]
}

/**
 * Close a mock-app browsing context when FINOS calls `fdc3.close()` or the agent
 * disconnects the instance. Tries the popup registry first, then WCP `source` windows.
 */
export function closeHarnessBrowsingContext(options: {
  instanceId: string
  desktopAgent: SailDesktopAgent
  popupWatcher: PopupCloseWatcher
}): boolean {
  const { instanceId, desktopAgent, popupWatcher } = options
  const candidateIds = collectHarnessCloseInstanceIds(desktopAgent, instanceId, popupWatcher)

  if (popupWatcher.closePopupForInstance(instanceId)) {
    return true
  }

  for (const candidateId of candidateIds) {
    if (candidateId !== instanceId && popupWatcher.closePopupForInstance(candidateId)) {
      return true
    }
  }

  for (const connection of desktopAgent.apps.getConnections()) {
    if (!candidateIds.includes(connection.instanceId)) {
      continue
    }
    if (tryCloseBrowsingContext(connection.source, connection.instanceId)) {
      return true
    }
  }

  console.warn(
    `${HARNESS_LOG_PREFIX} No closable browsing context found for instance ${instanceId} (candidates: ${candidateIds.join(", ")})`,
  )
  return false
}

/**
 * Deliver a FINOS `closeWindow` `broadcastEvent` directly to a mock MessagePort.
 * Preserves `testId` (and any other fields) so ChannelsApp / MockApp can echo it on
 * `windowClosed` — Conformance1 rejects mismatched test ids within its 1s budget.
 */
export function deliverFinOsCloseWindowBroadcast(options: {
  desktopAgent: SailDesktopAgent
  conformance1InstanceId: string
  targetInstanceId: string
  context?: FinOsCloseWindowContext
}): void {
  const {
    desktopAgent,
    conformance1InstanceId,
    targetInstanceId,
    context = FINOS_CLOSE_WINDOW_CONTEXT,
  } = options
  const appConnection = desktopAgent.appConnection

  appConnection.sendToAppInstance(targetInstanceId, {
    type: "broadcastEvent",
    meta: {
      eventUuid: crypto.randomUUID(),
      timestamp: new Date(),
      destination: { instanceId: targetInstanceId },
    },
    payload: {
      channelId: HARNESS_FINOS_APP_CONTROL_CHANNEL,
      context,
      originatingApp: { appId: "Conformance1", instanceId: conformance1InstanceId },
    },
  })
}

/**
 * Relay Conformance1's `closeWindow` broadcast to every connected non-Conformance1
 * instance. Used when DACP channel membership would otherwise miss mock listeners
 * within the FINOS 1s close-context budget. Does **not** close browsing contexts —
 * mocks must reply with `windowClosed` / `fdc3.nothing` first.
 */
export function relayFinOsCloseWindowToMockApps(options: {
  desktopAgent: SailDesktopAgent
  conformance1InstanceId: string
  context: FinOsCloseWindowContext
}): string[] {
  const { desktopAgent, conformance1InstanceId, context } = options
  const delivered: string[] = []

  for (const instance of desktopAgent.apps.getInstances()) {
    if (instance.appId === "Conformance1") {
      continue
    }
    if (instance.status !== "connected") {
      continue
    }
    if (instance.instanceId === conformance1InstanceId) {
      continue
    }

    deliverFinOsCloseWindowBroadcast({
      desktopAgent,
      conformance1InstanceId,
      targetInstanceId: instance.instanceId,
      context,
    })
    delivered.push(instance.instanceId)
  }

  return delivered
}

/**
 * FINOS toolbox teardown helper for unit tests: deliver `closeWindow` then tear down
 * the browsing context. Live harness path uses {@link relayFinOsCloseWindowToMockApps}
 * without immediate teardown so Conformance1 can receive `windowClosed` first.
 */
export function broadcastHarnessFinOsCloseContext(options: {
  desktopAgent: SailDesktopAgent
  conformance1InstanceId: string
  targetInstanceId: string
  context?: FinOsCloseWindowContext
  onBrowsingContextTeardown: (instanceId: string) => boolean
}): Promise<void> {
  const {
    desktopAgent,
    conformance1InstanceId,
    targetInstanceId,
    context,
    onBrowsingContextTeardown,
  } = options

  deliverFinOsCloseWindowBroadcast({
    desktopAgent,
    conformance1InstanceId,
    targetInstanceId,
    context,
  })

  // Unit-test path only: simulate AppLauncher.close / popup teardown after delivery.
  onBrowsingContextTeardown(targetInstanceId)
  return Promise.resolve()
}
