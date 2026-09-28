/**
 * Headless fixture: two instances of one `forceNewWindow` appId.
 *
 * Mirrors `createHarnessBootstrap()`'s `mountLaunchedPanel` wiring (stale-pending prune →
 * host pre-register → popup) against a real `SailDesktopAgent` over `DacpTestAppConnection`,
 * with jsdom popup stubs instead of real browsing contexts.
 *
 * Reproduces the FINOS `fdc3.getAppMetadata` suite shape: Conformance1 opens `MetadataAppId`
 * twice before either popup completes WCP4, then queries and tears both down.
 */
import { expect, vi } from "vite-plus/test"
import type { SailDesktopAgent } from "../../../sail-desktop-agent/src/agent/sail-desktop-agent"
import { createDesktopAgentWithTestConnection } from "../../../sail-desktop-agent/test/support/desktop-agent-test-harness"
import type { DacpTestAppConnection } from "../../../sail-desktop-agent/test/support/dacp-test-app-connection"

import { loadConformanceApplications } from "../conformance-app-directory"
import { createHarnessAppLauncher } from "../app-launcher"
import { extractAppUrl } from "../harness-bootstrap"
import { HARNESS_FINOS_APP_CONTROL_CHANNEL } from "../harness-browsing-context-close"
import {
  createHarnessInstanceCleanup,
  type HarnessInstanceCleanup,
} from "../harness-instance-lifecycle"
import { pruneStalePendingHostInstances } from "../harness-stale-instance-prune"
import { createPopupCloseWatcher, openHarnessPopup } from "../popup-launcher"
import type { HarnessPanel } from "../types"

const CONFORMANCE1_APP_ID = "Conformance1"

/** FINOS mock app the `fdc3.getAppMetadata` suite opens twice (`forceNewWindow: true`). */
export const TWO_INSTANCE_APP_ID = "MetadataAppId"

/** One launched mock app: the id `open()` handed the caller, and the id WCP5 gave the app. */
export type LaunchedMockInstance = {
  /** `openResponse.appIdentifier.instanceId` — the id the FDC3 caller holds. */
  openedInstanceId: string
  /** `WCP5ValidateAppIdentityResponse.payload.instanceId` — the id the app holds. */
  wcp5InstanceId: string
}

export type HarnessTwoInstanceFixture = {
  agent: SailDesktopAgent<DacpTestAppConnection>
  connection: DacpTestAppConnection
  conformance1InstanceId: string
  launched: [LaunchedMockInstance, LaunchedMockInstance]
  cleanup: () => void
}

function createPopupStub(name: string): Window {
  const popup = {
    name,
    closed: false,
    location: { href: "about:blank" },
    close() {
      popup.closed = true
    },
  }
  return popup as unknown as Window
}

function readLastWcp5InstanceId(connection: DacpTestAppConnection): string {
  const wcp5 = connection.getMessagesByType("WCP5ValidateAppIdentityResponse").at(-1)?.msg as
    | { payload?: { instanceId?: string } }
    | undefined

  expect(wcp5?.payload?.instanceId).toBeDefined()
  return wcp5!.payload!.instanceId!
}

/** WCP4 from a browsing context claiming the host-assigned id it was launched with. */
async function completeWcp4Handshake(
  connection: DacpTestAppConnection,
  params: { connectionAttemptUuid: string; appUrl: string; claimedInstanceId: string },
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

  return readLastWcp5InstanceId(connection)
}

/**
 * Conformance1 `fdc3.open({ appId })` — delivers the request and returns its `requestUuid`.
 *
 * A plain open does NOT answer here: it resolves only once the launched browsing context has
 * connected, so the caller's instanceId is read later via {@link readOpenedInstanceId}.
 */
async function deliverOpenRequest(
  connection: DacpTestAppConnection,
  conformance1InstanceId: string,
): Promise<string> {
  const requestUuid = crypto.randomUUID()

  await connection.receiveMessage({
    type: "openRequest",
    meta: {
      requestUuid,
      timestamp: new Date(),
      source: { appId: CONFORMANCE1_APP_ID, instanceId: conformance1InstanceId },
    },
    payload: {
      app: { appId: TWO_INSTANCE_APP_ID, desktopAgent: "n/a" },
    },
  })

  return requestUuid
}

/** No plain `open()` may be answered while its launched browsing context is still booting. */
function expectNoOpenResponseYet(connection: DacpTestAppConnection): void {
  expect(
    connection.getMessagesByType("openResponse").map(record => record.msg),
    "plain open() must not answer before the launched app has completed WCP4",
  ).toEqual([])
}

/**
 * The instanceId `fdc3.open()` hands the caller, matched to its own request by `requestUuid`
 * so two in-flight opens can never read each other's response.
 */
function readOpenedInstanceId(connection: DacpTestAppConnection, requestUuid: string): string {
  const openResponse = connection
    .getMessagesByType("openResponse")
    .map(
      record =>
        record.msg as {
          meta?: { requestUuid?: string }
          payload?: { error?: string; appIdentifier?: { instanceId?: string } }
        },
    )
    .find(message => message.meta?.requestUuid === requestUuid)

  expect(openResponse, `no openResponse for openRequest ${requestUuid}`).toBeDefined()
  expect(openResponse!.payload?.error).toBeUndefined()
  expect(openResponse!.payload?.appIdentifier?.instanceId).toBeDefined()
  return openResponse!.payload!.appIdentifier!.instanceId!
}

/** The host-assigned instanceId the launcher handed each mounted panel, in launch order. */
function readLaunchedInstanceIds(panels: HarnessPanel[]): [string, string] {
  const launched = panels
    .filter(panel => panel.appId === TWO_INSTANCE_APP_ID)
    .map(panel => panel.instanceId)

  expect(launched, "both openRequests must have launched a browsing context").toHaveLength(2)
  return [launched[0]!, launched[1]!]
}

/**
 * Launch two instances of {@link TWO_INSTANCE_APP_ID}, both opened before either
 * browsing context completes WCP4 (the FINOS `getAppMetadata` suite's ordering).
 */
export async function runHarnessTwoInstanceLaunch(): Promise<HarnessTwoInstanceFixture> {
  const { applications } = loadConformanceApplications({ profile: "hosted" })
  const conformance1Url = extractAppUrl(applications)
  const mockAppUrl = extractAppUrl(applications, TWO_INSTANCE_APP_ID)
  const conformance1InstanceId = crypto.randomUUID()

  const openSpy = vi
    .spyOn(window, "open")
    .mockImplementation((_url, name) => createPopupStub(typeof name === "string" ? name : ""))

  const panels: HarnessPanel[] = []
  let agentRef: SailDesktopAgent<DacpTestAppConnection> | null = null

  const instanceCleanup: HarnessInstanceCleanup = {
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

  const removePanel = (instanceId: string) => {
    const index = panels.findIndex(panel => panel.instanceId === instanceId)
    if (index >= 0) {
      panels.splice(index, 1)
    }
  }

  // Same order as createHarnessBootstrap().mountLaunchedPanel.
  const appLauncher = createHarnessAppLauncher(panel => {
    pruneStalePendingHostInstances({
      desktopAgent: agentRef as never,
      appId: panel.appId,
      popupWatcher,
      keepInstanceId: panel.instanceId,
    })
    instanceCleanup.prepareLaunchedHostInstance(panel)
    if (panel.launchMode === "popup") {
      openHarnessPopup(panel, {
        onPopupCreated: opened => popupWatcher.registerPopup(panel.instanceId, opened),
      })
    }
    panels.push(panel)
  })

  const { agent, connection } = createDesktopAgentWithTestConnection({
    apps: applications,
    appLauncher,
    heartbeatEnabled: false,
  })
  agentRef = agent

  Object.assign(
    instanceCleanup,
    createHarnessInstanceCleanup({ desktopAgent: agent as never, popupWatcher, removePanel }),
  )

  agent.registerPendingHostInstance({
    appId: CONFORMANCE1_APP_ID,
    instanceId: conformance1InstanceId,
  })
  await completeWcp4Handshake(connection, {
    connectionAttemptUuid: "conformance1-caller",
    appUrl: conformance1Url,
    claimedInstanceId: conformance1InstanceId,
  })

  // Both opens are issued before either popup connects. Neither can answer yet: a plain
  // `fdc3.open()` resolves only once its launched app has completed WCP4/WCP5, so the caller's
  // instanceId does not exist until the handshakes below have run.
  const openRequestUuid1 = await deliverOpenRequest(connection, conformance1InstanceId)
  const openRequestUuid2 = await deliverOpenRequest(connection, conformance1InstanceId)

  expectNoOpenResponseYet(connection)

  // The browsing contexts claim the host-assigned ids the launcher mounted them with.
  const [launchedInstanceId1, launchedInstanceId2] = readLaunchedInstanceIds(panels)

  const wcp5InstanceId1 = await completeWcp4Handshake(connection, {
    connectionAttemptUuid: "metadata-app-connect-1",
    appUrl: mockAppUrl,
    claimedInstanceId: launchedInstanceId1,
  })
  const wcp5InstanceId2 = await completeWcp4Handshake(connection, {
    connectionAttemptUuid: "metadata-app-connect-2",
    appUrl: mockAppUrl,
    claimedInstanceId: launchedInstanceId2,
  })

  // Only now does each `open()` hand its caller an instanceId.
  const openedInstanceId1 = readOpenedInstanceId(connection, openRequestUuid1)
  const openedInstanceId2 = readOpenedInstanceId(connection, openRequestUuid2)

  return {
    agent,
    connection,
    conformance1InstanceId,
    launched: [
      { openedInstanceId: openedInstanceId1, wcp5InstanceId: wcp5InstanceId1 },
      { openedInstanceId: openedInstanceId2, wcp5InstanceId: wcp5InstanceId2 },
    ],
    cleanup: () => {
      agent.stop()
      popupWatcher.stop()
      openSpy.mockRestore()
    },
  }
}

/** `fdc3.getAppMetadata({ appId, instanceId })` from Conformance1. */
export async function getAppMetadataInstanceId(
  fixture: HarnessTwoInstanceFixture,
  identifier: { appId: string; instanceId: string },
): Promise<string | undefined> {
  const { connection, conformance1InstanceId } = fixture

  await connection.receiveMessage({
    type: "getAppMetadataRequest",
    meta: {
      requestUuid: crypto.randomUUID(),
      timestamp: new Date(),
      source: { appId: CONFORMANCE1_APP_ID, instanceId: conformance1InstanceId },
    },
    payload: { app: { ...identifier, desktopAgent: "n/a" } },
  })

  const response = connection.getMessagesByType("getAppMetadataResponse").at(-1)?.msg as
    | { payload?: { error?: string; appMetadata?: { instanceId?: string } } }
    | undefined

  expect(response?.payload?.error).toBeUndefined()
  return response?.payload?.appMetadata?.instanceId
}

/**
 * FINOS `closeMockAppWindow`: Conformance1 broadcasts `closeWindow` on the `app-control`
 * app channel that both mocks listen on. Returns the instanceIds the agent delivered to.
 */
export async function broadcastCloseWindowOnAppControl(
  fixture: HarnessTwoInstanceFixture,
  listenerInstanceIds: string[],
): Promise<string[]> {
  const { connection, conformance1InstanceId } = fixture

  await connection.receiveMessage({
    type: "getOrCreateChannelRequest",
    meta: {
      requestUuid: crypto.randomUUID(),
      timestamp: new Date(),
      source: { appId: CONFORMANCE1_APP_ID, instanceId: conformance1InstanceId },
    },
    payload: { channelId: HARNESS_FINOS_APP_CONTROL_CHANNEL },
  })

  for (const instanceId of listenerInstanceIds) {
    await connection.receiveMessage({
      type: "addContextListenerRequest",
      meta: {
        requestUuid: crypto.randomUUID(),
        timestamp: new Date(),
        source: { appId: TWO_INSTANCE_APP_ID, instanceId },
      },
      payload: { channelId: HARNESS_FINOS_APP_CONTROL_CHANNEL, contextType: "closeWindow" },
    })
  }

  connection.clear()

  await connection.receiveMessage({
    type: "broadcastRequest",
    meta: {
      requestUuid: crypto.randomUUID(),
      timestamp: new Date(),
      source: { appId: CONFORMANCE1_APP_ID, instanceId: conformance1InstanceId },
    },
    payload: {
      channelId: HARNESS_FINOS_APP_CONTROL_CHANNEL,
      context: { type: "closeWindow", testId: "(AppInstanceMetadata) two MetadataAppId instances" },
    },
  })

  return connection
    .getMessagesByType("broadcastEvent")
    .map(record => record.msg)
    .filter(
      message =>
        (message.payload as { context?: { type?: string } } | undefined)?.context?.type ===
        "closeWindow",
    )
    .map(message => message.meta?.destination?.instanceId)
    .filter((instanceId): instanceId is string => typeof instanceId === "string")
}
