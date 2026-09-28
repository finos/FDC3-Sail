/**
 * Headless fixture: a plain `fdc3.open({ appId })` against an app that boots on its own clock.
 *
 * Same wiring as {@link ./harness-two-instances.harness.ts} (real `SailDesktopAgent` over
 * `DacpTestAppConnection`, real harness `AppLauncher`, jsdom popup stubs) with one difference
 * that is the whole point of the fixture: the launched browsing context does **not** connect
 * inline. It boots {@link APP_BOOT_DELAY_MS} later, which is what an instrumented conformance
 * run measured (38-60ms between `openResponse` and the app's WCP4 + listener registration).
 *
 * The app's boot is one routine, in the order a FINOS mock app really does it:
 *
 *   WCP4ValidateAppIdentity → getOrCreateChannel('app-control') → addContextListener('closeWindow')
 *
 * so "the app has connected" and "the app is listening" are the same instant from the caller's
 * point of view — exactly the contract `fdc3.open()` is supposed to hand back.
 *
 * Everything here runs on fake timers; no test in this file ever waits in real time.
 */
import { expect, vi } from "vite-plus/test"

import type { SailDesktopAgent } from "../../../sail-desktop-agent/src/agent/sail-desktop-agent"
import { createDesktopAgentWithTestConnection } from "../../../sail-desktop-agent/test/support/desktop-agent-test-harness"
import type { DacpTestAppConnection } from "../../../sail-desktop-agent/test/support/dacp-test-app-connection"
import { clearAllPendingOpenWithContextTimeoutsForTesting } from "../../../sail-desktop-agent/src/handlers/utils/open-with-context"

import { loadConformanceApplications } from "../conformance-app-directory"
import { createHarnessAppLauncher } from "../app-launcher"
import { extractAppUrl } from "../harness-bootstrap"
import { HARNESS_FINOS_APP_CONTROL_CHANNEL } from "../harness-browsing-context-close"
import {
  createHarnessInstanceCleanup,
  type HarnessInstanceCleanup,
} from "../harness-instance-lifecycle"
import { createPopupCloseWatcher, openHarnessPopup } from "../popup-launcher"
import type { HarnessPanel } from "../types"

const CONFORMANCE1_APP_ID = "Conformance1"

/** The FINOS `fdc3.open` suite's target mock app (`forceNewWindow: true`). */
export const OPEN_TARGET_APP_ID = "OpenAppAId"

/** Context type the FINOS `app-control` channel carries from Conformance1 to a mock. */
export const CLOSE_WINDOW_CONTEXT_TYPE = "closeWindow"

/**
 * Gap the instrumented conformance run measured between `openResponse` and the launched app
 * finishing WCP4 + registering its listeners.
 */
export const APP_BOOT_DELAY_MS = 40

/** Launch-wait budget configured on the agent for this fixture. */
export const OPEN_CONNECT_TIMEOUT_MS = 2000

/**
 * Simulated time the never-connecting case is given: past {@link OPEN_CONNECT_TIMEOUT_MS} and
 * past the agent's 15s default launch budget, so the assertion does not depend on which knob
 * the wait is wired to. Fake time — this costs no wall-clock.
 */
export const LAUNCH_WAIT_BUDGET_MS = 15_000

/** Ceiling, in simulated ms, on how long {@link settleOpenResponse} steps time forward. */
const OPEN_SETTLE_CEILING_MS = 500

export type OpenOutcome = {
  /** `openResponse.payload.appIdentifier.instanceId`, when the open succeeded. */
  instanceId?: string
  /** `openResponse.payload.error`, when the open failed. */
  error?: string
}

export type HarnessOpenWaitFixture = {
  agent: SailDesktopAgent<DacpTestAppConnection>
  connection: DacpTestAppConnection
  conformance1InstanceId: string
  /** Panels the harness launcher mounted, in launch order. */
  panels: HarnessPanel[]
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

/** `getOrCreateChannel('app-control')` + `addContextListener(type)` from one instance. */
async function subscribeToAppControl(
  connection: DacpTestAppConnection,
  subscriber: { appId: string; instanceId: string },
  contextType: string,
): Promise<void> {
  await connection.receiveMessage({
    type: "getOrCreateChannelRequest",
    meta: { requestUuid: crypto.randomUUID(), timestamp: new Date(), source: subscriber },
    payload: { channelId: HARNESS_FINOS_APP_CONTROL_CHANNEL },
  })

  await connection.receiveMessage({
    type: "addContextListenerRequest",
    meta: { requestUuid: crypto.randomUUID(), timestamp: new Date(), source: subscriber },
    payload: { channelId: HARNESS_FINOS_APP_CONTROL_CHANNEL, contextType },
  })
}

/**
 * @param options.bootLaunchedApps - when false the launched browsing context never connects,
 *   modelling an app that fails to load.
 */
export async function runHarnessOpenWaitLaunch(options?: {
  bootLaunchedApps?: boolean
}): Promise<HarnessOpenWaitFixture> {
  const bootLaunchedApps = options?.bootLaunchedApps ?? true

  const { applications } = loadConformanceApplications({ profile: "hosted" })
  const conformance1Url = extractAppUrl(applications)
  const openTargetUrl = extractAppUrl(applications, OPEN_TARGET_APP_ID)
  const conformance1InstanceId = crypto.randomUUID()

  const openSpy = vi
    .spyOn(window, "open")
    .mockImplementation((_url, name) => createPopupStub(typeof name === "string" ? name : ""))

  const panels: HarnessPanel[] = []
  let connectionRef: DacpTestAppConnection | null = null

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

  /** What the launched browsing context does once it has loaded, on its own clock. */
  const bootLaunchedApp = async (panel: HarnessPanel): Promise<void> => {
    const connection = connectionRef!
    const wcp5InstanceId = await completeWcp4Handshake(connection, {
      connectionAttemptUuid: `open-target-connect-${panel.instanceId}`,
      appUrl: openTargetUrl,
      claimedInstanceId: panel.instanceId,
    })
    await subscribeToAppControl(
      connection,
      { appId: panel.appId, instanceId: wcp5InstanceId },
      CLOSE_WINDOW_CONTEXT_TYPE,
    )
  }

  const appLauncher = createHarnessAppLauncher(panel => {
    instanceCleanup.prepareLaunchedHostInstance(panel)
    if (panel.launchMode === "popup") {
      openHarnessPopup(panel, {
        onPopupCreated: opened => popupWatcher.registerPopup(panel.instanceId, opened),
      })
    }
    panels.push(panel)

    if (bootLaunchedApps) {
      setTimeout(() => void bootLaunchedApp(panel), APP_BOOT_DELAY_MS)
    }
  })

  const { agent, connection } = createDesktopAgentWithTestConnection({
    apps: applications,
    appLauncher,
    heartbeatEnabled: false,
    openContextListenerTimeoutMs: OPEN_CONNECT_TIMEOUT_MS,
  })
  connectionRef = connection

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

  // Conformance1 owns `app-control` before it opens anything (FINOS `before` hook ordering).
  await connection.receiveMessage({
    type: "getOrCreateChannelRequest",
    meta: {
      requestUuid: crypto.randomUUID(),
      timestamp: new Date(),
      source: { appId: CONFORMANCE1_APP_ID, instanceId: conformance1InstanceId },
    },
    payload: { channelId: HARNESS_FINOS_APP_CONTROL_CHANNEL },
  })

  connection.clear()

  return {
    agent,
    connection,
    conformance1InstanceId,
    panels,
    cleanup: () => {
      clearAllPendingOpenWithContextTimeoutsForTesting()
      agent.stop()
      popupWatcher.stop()
      openSpy.mockRestore()
    },
  }
}

/**
 * Conformance1 `fdc3.open({ appId })`, no context. Returns once the agent has finished
 * processing the request message — NOT once `fdc3.open()` would have resolved.
 */
export async function deliverPlainOpenRequest(fixture: HarnessOpenWaitFixture): Promise<void> {
  await fixture.connection.receiveMessage({
    type: "openRequest",
    meta: {
      requestUuid: crypto.randomUUID(),
      timestamp: new Date(),
      source: { appId: CONFORMANCE1_APP_ID, instanceId: fixture.conformance1InstanceId },
    },
    payload: { app: { appId: OPEN_TARGET_APP_ID, desktopAgent: "n/a" } },
  })
}

function readOpenResponses(fixture: HarnessOpenWaitFixture): OpenOutcome[] {
  return fixture.connection.getMessagesByType("openResponse").map(record => {
    const payload = (
      record.msg as { payload?: { error?: string; appIdentifier?: { instanceId?: string } } }
    ).payload
    return { instanceId: payload?.appIdentifier?.instanceId, error: payload?.error }
  })
}

/** Every `openResponse` the agent has emitted so far. */
export function openResponsesSoFar(fixture: HarnessOpenWaitFixture): OpenOutcome[] {
  return readOpenResponses(fixture)
}

/** WCP4-validated instanceIds of launched apps that have connected so far. */
export function connectedLaunchedInstanceIds(fixture: HarnessOpenWaitFixture): string[] {
  return fixture.connection
    .getMessagesByType("WCP5ValidateAppIdentityResponse")
    .map(record => (record.msg as { payload?: { instanceId?: string } }).payload?.instanceId)
    .filter((instanceId): instanceId is string => typeof instanceId === "string")
}

/**
 * Step simulated time forward until the agent emits an `openResponse`, then stop dead — the
 * returned outcome is the state of the world at the instant `fdc3.open()` resolves, which is
 * what a caller that acts "immediately after open()" sees.
 */
export async function settleOpenResponse(fixture: HarnessOpenWaitFixture): Promise<OpenOutcome> {
  for (let elapsed = 0; elapsed <= OPEN_SETTLE_CEILING_MS; elapsed += 1) {
    const outcome = readOpenResponses(fixture).at(-1)
    if (outcome) {
      return outcome
    }
    await vi.advanceTimersByTimeAsync(1)
  }

  throw new Error(
    `No openResponse after ${OPEN_SETTLE_CEILING_MS}ms of simulated time (app boots at ${APP_BOOT_DELAY_MS}ms)`,
  )
}

/** Let the whole launch-wait budget elapse in simulated time without the app ever connecting. */
export async function elapseLaunchWaitBudget(): Promise<void> {
  await vi.advanceTimersByTimeAsync(LAUNCH_WAIT_BUDGET_MS)
}

/**
 * FINOS `closeMockAppWindow`: Conformance1 broadcasts `closeWindow` on `app-control`.
 * Returns the instanceIds the agent actually delivered that broadcast to.
 */
export async function broadcastCloseWindowFromCaller(
  fixture: HarnessOpenWaitFixture,
  testId: string,
): Promise<string[]> {
  const { connection, conformance1InstanceId } = fixture

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
      context: { type: CLOSE_WINDOW_CONTEXT_TYPE, testId },
    },
  })

  return connection
    .getMessagesByType("broadcastEvent")
    .map(record => record.msg)
    .filter(
      message =>
        (message.payload as { context?: { type?: string } } | undefined)?.context?.type ===
        CLOSE_WINDOW_CONTEXT_TYPE,
    )
    .map(message => message.meta?.destination?.instanceId)
    .filter((instanceId): instanceId is string => typeof instanceId === "string")
}
