/**
 * Headless fixture: the FINOS `app-control` RETURN leg.
 *
 * Same wiring as {@link ../__tests__/harness-two-instances.harness.ts} (real `SailDesktopAgent`
 * over `DacpTestAppConnection`, jsdom popup stubs, FINOS open/WCP4 ordering) **plus** the
 * `createHarnessFinOsTeardownObserver` that `createHarnessBootstrap()` installs on the app
 * connection before `agent.start()`.
 *
 * The toolbox contract this models (`packages/sail-conformance-harness/2.2-conformance-tests`):
 *
 * 1. Conformance1 `getOrCreateChannel('app-control')` → `addContextListener('windowClosed')`,
 *    and arms a hard-coded 1000ms timer before that listener even resolves.
 * 2. Conformance1 broadcasts `{ type: 'closeWindow', testId }` on `app-control`.
 * 3. The mock replies `await appControlChannel.broadcast({ type: 'windowClosed', testId })`
 *    and then `setTimeout(() => window.close(), 5)` — it destroys its own browsing context
 *    1-5ms later. The desktop agent is never asked to close anything.
 * 4. Conformance1 must receive that `windowClosed` inside the 1000ms budget.
 */
import { expect, vi } from "vite-plus/test"

import { SailDesktopAgent } from "../../../sail-desktop-agent/src/agent/sail-desktop-agent"
import { DacpTestAppConnection } from "../../../sail-desktop-agent/test/support/dacp-test-app-connection"

import { loadConformanceApplications } from "../conformance-app-directory"
import { createHarnessAppLauncher } from "../app-launcher"
import { extractAppUrl } from "../harness-bootstrap"
import { HARNESS_FINOS_APP_CONTROL_CHANNEL } from "../harness-browsing-context-close"
import {
  createHarnessFinOsTeardownObserver,
  installHarnessInboundAppMessageObserver,
} from "../harness-finos-teardown"
import {
  createHarnessInstanceCleanup,
  type HarnessInstanceCleanup,
} from "../harness-instance-lifecycle"
import { pruneStalePendingHostInstances } from "../harness-stale-instance-prune"
import { createPopupCloseWatcher, openHarnessPopup } from "../popup-launcher"
import type { HarnessPanel } from "../types"

const CONFORMANCE1_APP_ID = "Conformance1"

/** FINOS mock app the `fdc3.getAppMetadata` suite opens twice (`forceNewWindow: true`). */
export const RETURN_LEG_APP_ID = "MetadataAppId"

/** Longest wait the FINOS toolbox gives the mock's reply before failing the after-hook. */
export const FINOS_CLOSE_CONTEXT_BUDGET_MS = 1000

/** jsdom stand-in for a mock app's browsing context. */
type PopupStub = Window & { closed: boolean }

export type ReturnLegMock = {
  /** `openResponse.appIdentifier.instanceId` — the id the FDC3 caller holds. */
  openedInstanceId: string
  /** `WCP5ValidateAppIdentityResponse.payload.instanceId` — the id the app holds. */
  wcp5InstanceId: string
}

export type HarnessReturnLegFixture = {
  agent: SailDesktopAgent<DacpTestAppConnection>
  connection: DacpTestAppConnection
  conformance1InstanceId: string
  mocks: [ReturnLegMock, ReturnLegMock]
  /** `setTimeout(() => window.close(), 5)` in the mock — the context just goes away. */
  destroyBrowsingContext: (instanceId: string) => void
  cleanup: () => void
}

function createPopupStub(name: string): PopupStub {
  const popup = {
    name,
    closed: false,
    location: { href: "about:blank" },
    close() {
      popup.closed = true
    },
  }
  return popup as unknown as PopupStub
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
      app: { appId: RETURN_LEG_APP_ID, desktopAgent: "n/a" },
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
    .filter(panel => panel.appId === RETURN_LEG_APP_ID)
    .map(panel => panel.instanceId)

  expect(launched, "both openRequests must have launched a browsing context").toHaveLength(2)
  return [launched[0]!, launched[1]!]
}

/**
 * Launch two instances of {@link RETURN_LEG_APP_ID} (the `fdc3.getAppMetadata` after-hook
 * shape) behind a desktop agent that carries the harness FINOS teardown observer.
 */
export async function runHarnessReturnLegLaunch(): Promise<HarnessReturnLegFixture> {
  const { applications } = loadConformanceApplications({ profile: "hosted" })
  const conformance1Url = extractAppUrl(applications)
  const mockAppUrl = extractAppUrl(applications, RETURN_LEG_APP_ID)
  const conformance1InstanceId = crypto.randomUUID()

  const popupsByName = new Map<string, PopupStub>()
  const openSpy = vi.spyOn(window, "open").mockImplementation((_url, name) => {
    const popupName = typeof name === "string" ? name : ""
    const popup = createPopupStub(popupName)
    popupsByName.set(popupName, popup)
    return popup
  })

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

  const finOsTeardownObserver = createHarnessFinOsTeardownObserver({
    instanceCleanup,
    getDesktopAgent: () => agentRef as never,
  })

  // createHarnessBootstrap() installs the observer before start(); the agent registers its
  // own handler inside start(), so wrapping afterwards would never see inbound messages.
  const connection = new DacpTestAppConnection()

  // `DacpTestAppConnection` has no `sendToAppInstance(instanceId, message)` — the harness's
  // `relayFinOsCloseWindowToMockApps` calls it. Mirror `BrowserAppConnection.sendToAppInstance`
  // exactly (browser-app-connection.ts:144): delegate to the connection registry.
  Object.assign(connection, {
    sendToAppInstance(_instanceId: string, message: unknown) {
      connection.connectionRegistry.sendToAppInstance(message)
    },
  })

  installHarnessInboundAppMessageObserver(connection, finOsTeardownObserver)

  const agent = new SailDesktopAgent<DacpTestAppConnection>({
    apps: applications,
    appLauncher,
    heartbeatEnabled: false,
    appConnection: connection,
  })
  agentRef = agent
  agent.start()

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
    mocks: [
      { openedInstanceId: openedInstanceId1, wcp5InstanceId: wcp5InstanceId1 },
      { openedInstanceId: openedInstanceId2, wcp5InstanceId: wcp5InstanceId2 },
    ],
    destroyBrowsingContext: instanceId => {
      const popup = popupsByName.get(instanceId)
      expect(popup, `no browsing context stub registered for ${instanceId}`).toBeDefined()
      popup!.close()
    },
    cleanup: () => {
      agent.stop()
      popupWatcher.stop()
      openSpy.mockRestore()
    },
  }
}

/** `getOrCreateChannel('app-control')` + `addContextListener(type)` from one instance. */
export async function subscribeToAppControl(
  fixture: HarnessReturnLegFixture,
  subscriber: { appId: string; instanceId: string },
  contextType: string,
): Promise<void> {
  const { connection } = fixture

  await connection.receiveMessage({
    type: "getOrCreateChannelRequest",
    meta: {
      requestUuid: crypto.randomUUID(),
      timestamp: new Date(),
      source: subscriber,
    },
    payload: { channelId: HARNESS_FINOS_APP_CONTROL_CHANNEL },
  })

  await connection.receiveMessage({
    type: "addContextListenerRequest",
    meta: {
      requestUuid: crypto.randomUUID(),
      timestamp: new Date(),
      source: subscriber,
    },
    payload: { channelId: HARNESS_FINOS_APP_CONTROL_CHANNEL, contextType },
  })
}

/** FINOS `closeMockAppWindow`: Conformance1 broadcasts `closeWindow` on `app-control`. */
export async function broadcastCloseWindow(
  fixture: HarnessReturnLegFixture,
  testId: string,
): Promise<void> {
  const { connection, conformance1InstanceId } = fixture

  await connection.receiveMessage({
    type: "broadcastRequest",
    meta: {
      requestUuid: crypto.randomUUID(),
      timestamp: new Date(),
      source: { appId: CONFORMANCE1_APP_ID, instanceId: conformance1InstanceId },
    },
    payload: {
      channelId: HARNESS_FINOS_APP_CONTROL_CHANNEL,
      context: { type: "closeWindow", testId },
    },
  })
}

/**
 * The mock's reply: `await appControlChannel.broadcast({ type: 'windowClosed', testId })`
 * followed by `setTimeout(() => window.close(), 5)`. The browsing context is destroyed
 * straight after the broadcast, before any timer the harness scheduled has run.
 */
export async function replyWindowClosedThenSelfClose(
  fixture: HarnessReturnLegFixture,
  mock: ReturnLegMock,
  testId: string,
): Promise<void> {
  const { connection } = fixture

  await connection.receiveMessage({
    type: "broadcastRequest",
    meta: {
      requestUuid: crypto.randomUUID(),
      timestamp: new Date(),
      source: { appId: RETURN_LEG_APP_ID, instanceId: mock.wcp5InstanceId },
    },
    payload: {
      channelId: HARNESS_FINOS_APP_CONTROL_CHANNEL,
      context: { type: "windowClosed", testId },
    },
  })

  fixture.destroyBrowsingContext(mock.openedInstanceId)
}

/** `testId`s of every `windowClosed` broadcastEvent the agent routed to Conformance1. */
export function windowClosedTestIdsDeliveredToConformance1(
  fixture: HarnessReturnLegFixture,
): string[] {
  return fixture.connection
    .getMessagesByType("broadcastEvent")
    .map(record => record.msg)
    .filter(
      message =>
        message.meta?.destination?.instanceId === fixture.conformance1InstanceId &&
        (message.payload as { context?: { type?: string } } | undefined)?.context?.type ===
          "windowClosed",
    )
    .map(
      message =>
        (message.payload as { context?: { testId?: string } } | undefined)?.context?.testId ?? "",
    )
}

/**
 * Let the FINOS budget elapse in simulated time: the harness's deferred disconnect and the
 * 100ms popup-close poll both land well inside it.
 */
export async function elapseFinOsCloseContextBudget(): Promise<void> {
  await vi.advanceTimersByTimeAsync(FINOS_CLOSE_CONTEXT_BUDGET_MS)
}
