/**
 * RT-03: multi-pending hostIdentifier adoption (isolated from long session soak tests).
 *
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import type { BrowserTypes, Context } from "@finos/fdc3"
import type { AppLauncher } from "../../host-contracts/app-launcher"
import type { SailDesktopAgent } from "../../agent/sail-desktop-agent"
import { AppInstanceState } from "../../state/types"
import { clearAllHeartbeatTimersForTesting } from "../../handlers/heartbeat/runtime"
import { clearAllPendingOpenWithContextTimeoutsForTesting } from "../../handlers/utils/open-with-context"
import {
  beginWcpAppFirstConnect,
  connectWcpApp,
  connectWcpAppFirstConnect,
  createGenericContextListenerMessage,
  createOpenRequestMessage,
  createWcpSourceWindow,
  postDacpOnPort,
  waitForPortMessage,
} from "./wcp-edge-test-helpers"
import { CHART_APP, createTestAgent, PORTFOLIO_APP } from "./wcp-desktop-agent.integration.fixtures"

const OPEN_WITH_CONTEXT_LAUNCH: Context = {
  type: "testContextY",
  id: { value: "conformance-open-context" },
}

/**
 * A response answers a request only when it echoes that request's `requestUuid`.
 *
 * Both tests below leave a plain `open()` outstanding on purpose: its launched app
 * (`STALE_PENDING_ID`) never connects, so its pending open is still open when appB validates.
 * Reaping that orphan row migrates the pending open onto the validated instance, which then
 * answers it with `NEW_PENDING_ID` — an instanceId L1 never launched. Either way the response
 * belongs to L1's request, and an untargeted `type === "openResponse"` predicate would happily
 * consume it as if it were the answer to the open-with-context request these tests are about.
 */
function isOpenResponseFor(data: unknown, request: BrowserTypes.OpenRequest): boolean {
  const message = data as { type?: string; meta?: { requestUuid?: string } }
  return message.type === "openResponse" && message.meta?.requestUuid === request.meta.requestUuid
}

function cleanupWcpIntegrationTestHarness(activeAgents: SailDesktopAgent[]): void {
  clearAllPendingOpenWithContextTimeoutsForTesting()
  clearAllHeartbeatTimersForTesting()
  for (const agent of activeAgents.splice(0)) {
    agent.stop()
  }
  vi.restoreAllMocks()
}

describe("multi-pending hostIdentifier adoption", () => {
  const activeAgents: SailDesktopAgent[] = []
  const STALE_PENDING_ID = "mp-stale-pending-l1"
  const NEW_PENDING_ID = "mp-new-pending-l2"

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    cleanupWcpIntegrationTestHarness(activeAgents)
  })

  function createMultiPendingAppLauncher(): AppLauncher {
    let launchCount = 0
    return {
      launch(request) {
        const launcherIds = [STALE_PENDING_ID, NEW_PENDING_ID]
        const instanceId = request.app.instanceId ?? launcherIds[launchCount++]
        return Promise.resolve({ appId: request.app.appId, instanceId })
      },
    }
  }

  function createFindInstancesMessage(
    sourceInstanceId: string,
    sourceAppId: string,
    targetAppId: string,
  ): BrowserTypes.FindInstancesRequest {
    return {
      type: "findInstancesRequest",
      meta: {
        requestUuid: crypto.randomUUID(),
        timestamp: new Date(),
        source: { appId: sourceAppId, instanceId: sourceInstanceId },
      },
      payload: {
        app: { appId: targetAppId },
      },
    }
  }

  it("delivers open-with-context to L2 when WCP4 omits instanceId and hostIdentifier names L2 among two stale PENDING rows", async () => {
    const openWithContextWaitMs = 5000
    const agent = createTestAgent({
      appLauncher: createMultiPendingAppLauncher(),
      openContextListenerTimeoutMs: openWithContextWaitMs,
    })
    activeAgents.push(agent)
    const portMessageWaitMs = openWithContextWaitMs + 2000

    const appA = await connectWcpApp(agent, {
      connectionAttemptUuid: "multi-pending-source-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    // L1: a plain open whose launched app (STALE_PENDING_ID) is deliberately never connected —
    // it exists only to leave a stale PENDING row behind. A plain open now resolves on connect,
    // so this one never succeeds; wait on the PENDING row it creates, not on its response.
    await postDacpOnPort(
      appA.appPort,
      createOpenRequestMessage(appA.validatedInstanceId, appA.appId, CHART_APP.appId),
    )

    await vi.waitFor(() => {
      expect(agent.getState().instances[STALE_PENDING_ID]?.state).toBe(AppInstanceState.PENDING)
    })

    // L2: the open this test is about. Its response is matched by requestUuid so L1's eventual
    // AppTimeout on the same port can never be read as L2's answer.
    const contextOpenRequest = createOpenRequestMessage(
      appA.validatedInstanceId,
      appA.appId,
      CHART_APP.appId,
      OPEN_WITH_CONTEXT_LAUNCH,
    )

    const openResponsePromise = waitForPortMessage<BrowserTypes.OpenResponse>(
      appA.appPort,
      data => isOpenResponseFor(data, contextOpenRequest),
      portMessageWaitMs,
    )

    await postDacpOnPort(appA.appPort, contextOpenRequest)

    await vi.waitFor(() => {
      expect(agent.getState().instances[STALE_PENDING_ID]?.state).toBe(AppInstanceState.PENDING)
      expect(agent.getState().instances[NEW_PENDING_ID]?.state).toBe(AppInstanceState.PENDING)
      expect(agent.getState().open.pendingWithContext[NEW_PENDING_ID]?.length).toBe(1)
    })

    const appB = await connectWcpAppFirstConnect(agent, {
      connectionAttemptUuid: "multi-pending-host-id-target-uuid",
      appId: "chartApp",
      identityUrl: CHART_APP.details.url,
      hostIdentifier: NEW_PENDING_ID,
    })

    expect(appB.validatedInstanceId).toBe(NEW_PENDING_ID)

    const broadcastPromise = waitForPortMessage<BrowserTypes.BroadcastEvent>(
      appB.appPort,
      data => (data as { type?: string }).type === "broadcastEvent",
      portMessageWaitMs,
    )

    await postDacpOnPort(
      appB.appPort,
      createGenericContextListenerMessage(appB.validatedInstanceId, appB.appId),
    )

    const [broadcastEvent, openResponse] = await Promise.all([
      broadcastPromise,
      openResponsePromise,
    ])

    expect(broadcastEvent.payload.context?.type).toBe(OPEN_WITH_CONTEXT_LAUNCH.type)
    expect(openResponse.type).toBe("openResponse")
    expect(openResponse.payload.error).toBeUndefined()
    expect(openResponse.payload.appIdentifier?.instanceId).toBe(NEW_PENDING_ID)
    expect(agent.getState().open.pendingWithContext[NEW_PENDING_ID]?.length ?? 0).toBe(0)

    const findInstancesResponsePromise = waitForPortMessage<BrowserTypes.FindInstancesResponse>(
      appA.appPort,
      data => (data as { type?: string }).type === "findInstancesResponse",
    )

    await postDacpOnPort(
      appA.appPort,
      createFindInstancesMessage(appA.validatedInstanceId, appA.appId, CHART_APP.appId),
    )

    const findInstancesResponse = await findInstancesResponsePromise
    const findInstancesIds =
      findInstancesResponse.payload.appIdentifiers?.map(identifier => identifier.instanceId) ?? []

    expect(findInstancesIds).toContain(NEW_PENDING_ID)
    expect(findInstancesIds).not.toContain(STALE_PENDING_ID)
  })

  it("persists hostIdentifier re-resolved at WCP4 when window.name was empty at WCP1", async () => {
    const openWithContextWaitMs = 5000
    const popupSource = createWcpSourceWindow("")
    const popupRegistry = new Map<Window, string>()

    const agent = createTestAgent({
      appLauncher: createMultiPendingAppLauncher(),
      openContextListenerTimeoutMs: openWithContextWaitMs,
      resolveHostIdentifier: source => popupRegistry.get(source),
    })
    activeAgents.push(agent)
    const portMessageWaitMs = openWithContextWaitMs + 2000

    const appA = await connectWcpApp(agent, {
      connectionAttemptUuid: "host-id-persist-source-uuid",
      appId: "portfolioApp",
      identityUrl: PORTFOLIO_APP.details.url,
    })

    // L1: a plain open whose launched app (STALE_PENDING_ID) is deliberately never connected —
    // it exists only to leave a stale PENDING row behind. A plain open now resolves on connect,
    // so this one cannot be answered by its own launch; wait on the PENDING row it creates, not
    // on its response. That wait also pins the launch order, which the removed response await
    // used to guarantee. (Reaping the orphan later migrates this pending open onto appB and
    // answers it with NEW_PENDING_ID — see the isOpenResponseFor doc block.)
    await postDacpOnPort(
      appA.appPort,
      createOpenRequestMessage(appA.validatedInstanceId, appA.appId, CHART_APP.appId),
    )

    await vi.waitFor(() => {
      expect(agent.getState().instances[STALE_PENDING_ID]?.state).toBe(AppInstanceState.PENDING)
    })

    // L2: the open this test is about. Its response is matched by requestUuid so L1's eventual
    // AppTimeout on the same port can never be read as L2's answer.
    const contextOpenRequest = createOpenRequestMessage(
      appA.validatedInstanceId,
      appA.appId,
      CHART_APP.appId,
      OPEN_WITH_CONTEXT_LAUNCH,
    )

    const openResponsePromise = waitForPortMessage<BrowserTypes.OpenResponse>(
      appA.appPort,
      data => isOpenResponseFor(data, contextOpenRequest),
      portMessageWaitMs,
    )

    await postDacpOnPort(appA.appPort, contextOpenRequest)

    await vi.waitFor(() => {
      expect(agent.getState().instances[STALE_PENDING_ID]?.state).toBe(AppInstanceState.PENDING)
      expect(agent.getState().instances[NEW_PENDING_ID]?.state).toBe(AppInstanceState.PENDING)
      expect(agent.getState().open.pendingWithContext[NEW_PENDING_ID]?.length).toBe(1)
    })

    // Simulate FINOS timing: WCP1 arrives before the host registry can map the popup.
    const handshake = beginWcpAppFirstConnect(agent, {
      connectionAttemptUuid: "host-id-persist-target-uuid",
      appId: "chartApp",
      identityUrl: CHART_APP.details.url,
      sourceWindow: popupSource,
    })

    const connectionAfterWcp1 = agent.apps.getConnection(handshake.tempInstanceId)
    expect(connectionAfterWcp1?.hostIdentifier).toBeUndefined()
    expect(connectionAfterWcp1?.source).toBe(popupSource)

    popupRegistry.set(popupSource, NEW_PENDING_ID)

    await handshake.postFirstConnectWcp4()
    const appB = await handshake.completeFirstConnect()

    expect(appB.validatedInstanceId).toBe(NEW_PENDING_ID)
    expect(agent.apps.getConnection(appB.validatedInstanceId)?.hostIdentifier).toBe(NEW_PENDING_ID)

    const broadcastPromise = waitForPortMessage<BrowserTypes.BroadcastEvent>(
      appB.appPort,
      data => (data as { type?: string }).type === "broadcastEvent",
      portMessageWaitMs,
    )

    await postDacpOnPort(
      appB.appPort,
      createGenericContextListenerMessage(appB.validatedInstanceId, appB.appId),
    )

    const [broadcastEvent, openResponse] = await Promise.all([
      broadcastPromise,
      openResponsePromise,
    ])

    expect(broadcastEvent.payload.context?.type).toBe(OPEN_WITH_CONTEXT_LAUNCH.type)
    expect(openResponse.payload.error).toBeUndefined()
    expect(openResponse.payload.appIdentifier?.instanceId).toBe(NEW_PENDING_ID)
  })
})
