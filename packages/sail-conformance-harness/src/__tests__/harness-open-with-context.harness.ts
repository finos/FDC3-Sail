/**
 * Headless harness open-with-context fixture.
 *
 * Mirrors `createHarnessBootstrap()` AppLauncher + `prepareLaunchedHostInstance` wiring
 * with `DacpTestAppConnection` and jsdom popup stubs (no MessagePort WCP).
 */
import { expect, vi } from "vite-plus/test"
import type { BrowserTypes, Context } from "@finos/fdc3"
import { DEFAULT_FDC3_USER_CHANNELS, type DirectoryApp } from "@finos/sail-desktop-agent"
import type { SailDesktopAgent } from "../../../sail-desktop-agent/src/agent/sail-desktop-agent"
import { createDesktopAgentWithTestConnection } from "../../../sail-desktop-agent/test/support/desktop-agent-test-harness"
import type { DacpTestAppConnection } from "../../../sail-desktop-agent/test/support/dacp-test-app-connection"
import { clearAllPendingOpenWithContextTimeoutsForTesting } from "../../../sail-desktop-agent/src/handlers/utils/open-with-context"

import { loadConformanceApplications } from "../conformance-app-directory"
import { createHarnessAppLauncher } from "../app-launcher"
import { extractAppUrl } from "../harness-bootstrap"
import {
  createHarnessInstanceCleanup,
  type HarnessInstanceCleanup,
} from "../harness-instance-lifecycle"
import { createPopupCloseWatcher } from "../popup-launcher"
import type { HarnessPanel } from "../types"

export const MOCK_APP_ID = "MockAppId"

export const INSTRUMENT_CONTEXT: Context = {
  type: "fdc3.instrument",
  id: { ticker: "AAPL" },
}

export type HarnessOpenWithContextFixture = {
  agent: SailDesktopAgent<DacpTestAppConnection>
  connection: DacpTestAppConnection
  sourceInstanceId: string
  launcherInstanceId: string
  adoptedInstanceId: string
  cleanup: () => void
}

export type HarnessOpenWithContextSnapshot = {
  launcherInstanceId: string
  adoptedInstanceId: string
  openResponseError?: string
  openResponseInstanceId?: string
  broadcastContextType?: string
  broadcastDestinationInstanceId?: string
}

function extractMockAppUrl(apps: DirectoryApp[]): string {
  const mockApp = apps.find(app => app.appId === MOCK_APP_ID)
  const url =
    mockApp?.type === "web" &&
    mockApp.details &&
    "url" in mockApp.details &&
    typeof mockApp.details.url === "string"
      ? mockApp.details.url
      : undefined

  if (!url) {
    throw new Error(`${MOCK_APP_ID} app with web details.url not found in conformance-appd.json`)
  }

  return url
}

function readWcp5InstanceId(connection: DacpTestAppConnection): string {
  const wcp5 = connection.sentMessages.find(
    message => (message as { type?: string }).type === "WCP5ValidateAppIdentityResponse",
  ) as { payload?: { instanceId?: string } } | undefined

  const fromPayload = wcp5?.payload?.instanceId
  if (fromPayload) {
    return fromPayload
  }

  expect(connection.outbound.lastWcp5ValidatedInstanceId).toBeDefined()
  return connection.outbound.lastWcp5ValidatedInstanceId!
}

async function completeWcp4Handshake(
  connection: DacpTestAppConnection,
  params: {
    connectionAttemptUuid: string
    appUrl: string
    claimedInstanceId: string
  },
): Promise<string> {
  await connection.receiveMessage(
    {
      type: "WCP4ValidateAppIdentity",
      meta: {
        connectionAttemptUuid: params.connectionAttemptUuid,
        timestamp: new Date().toISOString(),
      },
      payload: {
        instanceId: params.claimedInstanceId,
        instanceUuid: params.claimedInstanceId,
        identityUrl: params.appUrl,
        actualUrl: params.appUrl,
      },
    },
    { messageOrigin: new URL(params.appUrl).origin },
  )

  return readWcp5InstanceId(connection)
}

async function completeWcp4FirstConnect(
  connection: DacpTestAppConnection,
  params: {
    connectionAttemptUuid: string
    appUrl: string
    hostIdentifier?: string
  },
): Promise<string> {
  await connection.receiveMessage(
    {
      type: "WCP4ValidateAppIdentity",
      meta: {
        connectionAttemptUuid: params.connectionAttemptUuid,
        timestamp: new Date().toISOString(),
      },
      payload: {
        identityUrl: params.appUrl,
        actualUrl: params.appUrl,
      },
    },
    {
      sourceWindow: params.hostIdentifier ? { hostPanel: params.hostIdentifier } : undefined,
      messageOrigin: new URL(params.appUrl).origin,
    },
  )

  return readWcp5InstanceId(connection)
}

function createAddContextListenerMessage(
  targetInstanceId: string,
  contextType: string,
): BrowserTypes.AddContextListenerRequest {
  return {
    type: "addContextListenerRequest",
    meta: {
      requestUuid: crypto.randomUUID(),
      timestamp: new Date(),
      source: {
        appId: MOCK_APP_ID,
        instanceId: targetInstanceId,
      },
    },
    payload: {
      channelId: null,
      contextType,
    },
  }
}

function collectOpenWithContextSnapshot(
  connection: DacpTestAppConnection,
  launcherInstanceId: string,
  adoptedInstanceId: string,
): HarnessOpenWithContextSnapshot {
  const openResponse = connection.getMessagesByType("openResponse").at(-1)?.msg as
    | {
        payload?: {
          error?: string
          appIdentifier?: { instanceId?: string }
        }
      }
    | undefined

  const broadcastEvent = connection.getMessagesByType("broadcastEvent").at(-1)?.msg as
    | {
        payload?: { context?: { type?: string } }
        meta?: { destination?: { instanceId?: string } }
      }
    | undefined

  return {
    launcherInstanceId,
    adoptedInstanceId,
    openResponseError: openResponse?.payload?.error,
    openResponseInstanceId: openResponse?.payload?.appIdentifier?.instanceId,
    broadcastContextType: broadcastEvent?.payload?.context?.type,
    broadcastDestinationInstanceId: broadcastEvent?.meta?.destination?.instanceId,
  }
}

/**
 * Bootstrap equivalent: real harness AppLauncher, instance cleanup pre-register,
 * jsdom popup stub for `forceNewWindow` mock apps, and DacpTestAppConnection edge.
 */
export function createHarnessOpenWithContextBootstrap(): {
  agent: SailDesktopAgent<DacpTestAppConnection>
  connection: DacpTestAppConnection
  sourceInstanceId: string
  launchedPanels: HarnessPanel[]
  cleanup: () => void
} {
  const { applications: conformanceApps } = loadConformanceApplications({ profile: "hosted" })
  const conformance1InstanceId = crypto.randomUUID()
  const conformance1Url = extractAppUrl(conformanceApps)
  const mockAppUrl = extractMockAppUrl(conformanceApps)

  const launchedPanels: HarnessPanel[] = [
    {
      instanceId: conformance1InstanceId,
      appId: "Conformance1",
      url: conformance1Url,
      title: "FDC3 Conformance Framework",
      launchMode: "iframe",
    },
  ]

  const popupStubs = new Map<string, Window>()
  const openSpy = vi.spyOn(window, "open").mockImplementation((_url, name) => {
    const instanceId = typeof name === "string" ? name : ""
    let closed = false
    const popup = {
      get name() {
        return instanceId
      },
      get closed() {
        return closed
      },
      close: vi.fn(() => {
        closed = true
      }),
      location: { href: mockAppUrl },
    } as unknown as Window
    if (instanceId) {
      popupStubs.set(instanceId, popup)
    }
    return popup
  })

  let instanceCleanup: HarnessInstanceCleanup = {
    prepareLaunchedHostInstance() {},
    closeHarnessBrowsingContext() {
      return false
    },
    disconnectHarnessInstance() {},
  }

  const popupWatcher = createPopupCloseWatcher({
    onPopupClosed: instanceId => {
      instanceCleanup.disconnectHarnessInstance(instanceId)
    },
  })

  const mountLaunchedPanel = (panel: HarnessPanel) => {
    instanceCleanup.prepareLaunchedHostInstance(panel)

    if (panel.launchMode === "popup") {
      const popup = popupStubs.get(panel.instanceId) ?? window.open("about:blank", panel.instanceId)
      if (popup) {
        popupWatcher.registerPopup(panel.instanceId, popup)
      }
    }

    launchedPanels.push(panel)
  }

  const removePanel = (instanceId: string) => {
    const index = launchedPanels.findIndex(panel => panel.instanceId === instanceId)
    if (index >= 0) {
      launchedPanels.splice(index, 1)
    }
  }

  const appLauncher = createHarnessAppLauncher(mountLaunchedPanel, {
    closePopup: instanceId => instanceCleanup.closeHarnessBrowsingContext(instanceId),
    removePanel,
  })

  const { agent, connection } = createDesktopAgentWithTestConnection({
    apps: conformanceApps,
    appLauncher,
    heartbeatEnabled: false,
    userChannels: DEFAULT_FDC3_USER_CHANNELS,
    openContextListenerTimeoutMs: 5000,
  })

  Object.assign(
    instanceCleanup,
    createHarnessInstanceCleanup({
      desktopAgent: agent as never,
      popupWatcher,
      removePanel,
    }),
  )

  agent.registerPendingHostInstance({
    appId: "Conformance1",
    instanceId: conformance1InstanceId,
  })

  return {
    agent,
    connection,
    sourceInstanceId: conformance1InstanceId,
    launchedPanels,
    cleanup: () => {
      clearAllPendingOpenWithContextTimeoutsForTesting()
      agent.stop()
      popupWatcher.stop()
      openSpy.mockRestore()
    },
  }
}

async function runHarnessOpenWithContextFromBootstrap(bootstrap: {
  agent: SailDesktopAgent<DacpTestAppConnection>
  connection: DacpTestAppConnection
  sourceInstanceId: string
  launchedPanels: HarnessPanel[]
  cleanup: () => void
}): Promise<HarnessOpenWithContextFixture> {
  const { agent, connection, sourceInstanceId, launchedPanels } = bootstrap

  const { applications: conformanceApps } = loadConformanceApplications({ profile: "hosted" })
  const conformance1Url = extractAppUrl(conformanceApps)
  const mockAppUrl = extractMockAppUrl(conformanceApps)

  const sourceValidatedId = await completeWcp4Handshake(connection, {
    connectionAttemptUuid: "conformance1-caller",
    appUrl: conformance1Url,
    claimedInstanceId: sourceInstanceId,
  })
  expect(sourceValidatedId).toBe(sourceInstanceId)

  connection.clear()

  await connection.receiveMessage({
    type: "openRequest",
    meta: {
      requestUuid: crypto.randomUUID(),
      timestamp: new Date(),
      source: {
        appId: "Conformance1",
        instanceId: sourceValidatedId,
      },
    },
    payload: {
      app: {
        appId: MOCK_APP_ID,
        desktopAgent: "n/a",
      },
      context: INSTRUMENT_CONTEXT,
    },
  })

  const launchedPanel = launchedPanels.find(panel => panel.appId === MOCK_APP_ID)
  expect(launchedPanel).toBeDefined()
  const launcherInstanceId = launchedPanel!.instanceId
  expect(launcherInstanceId).toBeTruthy()
  expect(launchedPanel!.launchMode).toBe("popup")

  const adoptedInstanceId = await completeWcp4FirstConnect(connection, {
    connectionAttemptUuid: "mock-app-first-connect",
    appUrl: mockAppUrl,
  })

  expect(adoptedInstanceId).toBe(launcherInstanceId)

  await connection.receiveMessage(
    createAddContextListenerMessage(adoptedInstanceId, INSTRUMENT_CONTEXT.type),
  )

  return {
    agent,
    connection,
    sourceInstanceId: sourceValidatedId,
    launcherInstanceId,
    adoptedInstanceId,
    cleanup: bootstrap.cleanup,
  }
}

/**
 * Conformance1 analogue open-with-context to MockAppId through harness launcher wiring.
 */
export async function runHarnessOpenWithContext(): Promise<HarnessOpenWithContextFixture> {
  const bootstrap = createHarnessOpenWithContextBootstrap()
  return runHarnessOpenWithContextFromBootstrap(bootstrap)
}

export function snapshotHarnessOpenWithContext(
  fixture: HarnessOpenWithContextFixture,
): HarnessOpenWithContextSnapshot {
  return collectOpenWithContextSnapshot(
    fixture.connection,
    fixture.launcherInstanceId,
    fixture.adoptedInstanceId,
  )
}

/**
 * Harness contract: launcher id, WCP5 adoption, successful openResponse, and instrument broadcast align.
 */
export function assertHarnessOpenWithContextDelivered(
  snapshot: HarnessOpenWithContextSnapshot,
): void {
  expect(snapshot.launcherInstanceId).toBeTruthy()
  expect(snapshot.adoptedInstanceId).toBe(snapshot.launcherInstanceId)
  expect(snapshot.openResponseError).toBeUndefined()
  expect(snapshot.openResponseInstanceId).toBe(snapshot.launcherInstanceId)
  expect(snapshot.broadcastContextType).toBe(INSTRUMENT_CONTEXT.type)
  expect(snapshot.broadcastDestinationInstanceId).toBe(snapshot.launcherInstanceId)
}
