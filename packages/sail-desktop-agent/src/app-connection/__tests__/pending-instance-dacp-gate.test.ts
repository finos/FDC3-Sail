/**
 * Wire-level reachability check for the parked follow-up proven (via direct internal calls,
 * not the wire) in `../../handlers/intents/__tests__/intent-delivery-pending-target.test.ts`:
 * can a `PENDING` (pre-WCP5) app instance actually get `addIntentListenerRequest` through
 * Sail's real inbound path to `handleAddIntentListener`?
 *
 * Per FDC3 spec (`webConnectionProtocol.md`, `browserResidentDesktopAgents.md`), a DACP
 * message sent before `WCP4ValidateAppIdentity` succeeds should be ignored / the port should
 * be considered inactive. This test drives the real transport — a live `MessagePort`, real
 * `window.postMessage` WCP1-3 handshake, and `routeDACPMessage` — to check whether Sail
 * actually enforces that, or whether `addIntentListenerRequest` can reach the handler for an
 * instance that is still `AppInstanceState.PENDING`.
 *
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import type { BrowserTypes } from "@finos/fdc3"
import { ResolveError } from "@finos/fdc3"
import type { SailDesktopAgent } from "../../agent/sail-desktop-agent"
import { AppInstanceState } from "../../state/types"
import { getListenersForInstance } from "../../state/selectors"
import { clearAllHeartbeatTimersForTesting } from "../../handlers/heartbeat/runtime"
import { clearAllPendingOpenWithContextTimeoutsForTesting } from "../../handlers/utils/open-with-context"
import {
  beginWcpAppFirstConnect,
  connectWcpApp,
  createOpenRequestMessage,
  postDacpOnPort,
  waitForPortMessage,
} from "./wcp-edge-test-helpers"
import {
  CHART_APP,
  createHostInstanceAppLauncher,
  createTestAgent,
  HOST_LAUNCHER_INSTANCE_ID,
  PORTFOLIO_APP,
} from "./wcp-desktop-agent.integration.fixtures"

const INTENT_NAME = "ViewChart"
const OPEN_WITH_CONTEXT_LAUNCH = {
  type: "testContextY",
  id: { value: "pending-gate-context" },
}

function cleanupWcpIntegrationTestHarness(activeAgents: SailDesktopAgent[]): void {
  clearAllPendingOpenWithContextTimeoutsForTesting()
  clearAllHeartbeatTimersForTesting()
  for (const agent of activeAgents.splice(0)) {
    agent.stop()
  }
  vi.restoreAllMocks()
}

/**
 * `addIntentListenerRequest` naming an explicit `instanceId` in `meta.source` — the attempt
 * to impersonate a specific (here: lingering `PENDING`) instance. Sail's trust boundary
 * (`BrowserAppConnection.enrichMessageWithSource`) strips app-authored `meta.source` and
 * re-stamps it from the sending port's own `transportToInstanceId` binding, so this field is
 * exactly what is under test: is it honoured, or overridden server-side?
 */
function createAddIntentListenerMessage(
  instanceId: string,
  appId: string,
  intent: string,
): BrowserTypes.AddIntentListenerRequest {
  return {
    type: "addIntentListenerRequest",
    meta: {
      requestUuid: crypto.randomUUID(),
      timestamp: new Date(),
      source: { appId, instanceId },
    },
    payload: { intent },
  }
}

describe("pending-instance DACP gate: addIntentListenerRequest", () => {
  const activeAgents: SailDesktopAgent[] = []

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    cleanupWcpIntegrationTestHarness(activeAgents)
  })

  it("does not let a live, unvalidated port register an intent listener by naming a lingering PENDING instanceId", async () => {
    const agent = createTestAgent({
      appLauncher: createHostInstanceAppLauncher(),
      openContextListenerTimeoutMs: 5000,
    })
    activeAgents.push(agent)

    // 1. Produce a real, lingering PENDING instance in state: portfolioApp opens chartApp
    // with context. The host launcher creates HOST_LAUNCHER_INSTANCE_ID synchronously and it
    // stays PENDING until (if ever) chartApp completes its own WCP4/5 handshake -- exactly the
    // `wcp-host-instance-adoption.ts` "lingering PENDING instance" scenario.
    const appA = await connectWcpApp(agent, {
      connectionAttemptUuid: "pending-gate-source-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    await postDacpOnPort(
      appA.appPort,
      createOpenRequestMessage(
        appA.validatedInstanceId,
        appA.appId,
        CHART_APP.appId,
        OPEN_WITH_CONTEXT_LAUNCH,
      ),
    )

    await vi.waitFor(() => {
      expect(agent.getState().instances[HOST_LAUNCHER_INSTANCE_ID]?.state).toBe(
        AppInstanceState.PENDING,
      )
    })

    // 2. A second, different app connects over its own real MessagePort but stops after
    // WCP1-3 (temp id only) -- it deliberately has NOT sent WCP4ValidateAppIdentity yet, so
    // this port is not associated with HOST_LAUNCHER_INSTANCE_ID, or any real instance, in
    // any way. `transportToInstanceId` only maps it to the temporary handshake id.
    const session = beginWcpAppFirstConnect(agent, {
      connectionAttemptUuid: "pending-gate-target-uuid",
      appId: "chartApp",
      identityUrl: CHART_APP.details.url,
    })

    // 3. Attempt the attack over the real wire: send addIntentListenerRequest on this live,
    // connected-but-unvalidated port, explicitly naming the lingering PENDING instance as the
    // source.
    const responsePromise = waitForPortMessage<{
      type?: string
      payload?: { error?: string }
    }>(session.appPort, data => (data as { type?: string }).type === "addIntentListenerResponse")

    await postDacpOnPort(
      session.appPort,
      createAddIntentListenerMessage(HOST_LAUNCHER_INSTANCE_ID, "chartApp", INTENT_NAME),
    )

    const response = await responsePromise

    // UNREACHABLE: the wire rejects it. The port gets back an explicit
    // TargetInstanceUnavailable error, not a successful addIntentListenerResponse.
    expect(response.type).toBe("addIntentListenerResponse")
    expect(response.payload?.error).toBe(ResolveError.TargetInstanceUnavailable)

    // No listener was registered anywhere -- neither under the impersonated PENDING instance
    // id nor under the port's real (temp) binding.
    expect(getListenersForInstance(agent.getState(), HOST_LAUNCHER_INSTANCE_ID)).toHaveLength(0)
    expect(getListenersForInstance(agent.getState(), session.tempInstanceId)).toHaveLength(0)

    // The lingering PENDING instance is untouched by the attempt.
    expect(agent.getState().instances[HOST_LAUNCHER_INSTANCE_ID]?.state).toBe(
      AppInstanceState.PENDING,
    )
  })
})
