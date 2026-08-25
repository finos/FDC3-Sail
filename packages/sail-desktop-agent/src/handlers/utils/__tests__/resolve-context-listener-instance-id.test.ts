import { describe, expect, it, afterEach } from "vite-plus/test"
import type { BrowserTypes } from "@finos/fdc3"
import {
  connectInstance,
  updateInstanceState,
  addPendingOpenWithContext,
} from "../../../state/mutators"
import { AppInstanceState } from "../../../state/types"
import { createInitialState } from "../../../state/initial-state"
import { DEFAULT_FDC3_USER_CHANNELS } from "../../../agent/default-user-channels"
import { createDACPTestParams } from "../../__tests__/test-params"
import { resolveDacpHandlerInstanceId } from "../resolve-context-listener-instance-id"
import { linkHandshakeRoutingId } from "../../../state/mutators/wcp-handshake-routing"
import { clearAllHeartbeatTimersForTesting } from "../../heartbeat/runtime"

const CHART_APP_ID = "chartApp"

afterEach(() => {
  clearAllHeartbeatTimersForTesting()
})

describe("resolveDacpHandlerInstanceId", () => {
  it("ignores app-authored meta.hostInstanceId naming another live instance", () => {
    const victimInstanceId = "victim-instance-id"
    const attackerInstanceId = "attacker-instance-id"
    const withVictim = connectInstance(createInitialState(DEFAULT_FDC3_USER_CHANNELS), {
      instanceId: victimInstanceId,
      appId: CHART_APP_ID,
      metadata: { name: CHART_APP_ID },
    })
    const initialState = connectInstance(withVictim, {
      instanceId: attackerInstanceId,
      appId: CHART_APP_ID,
      metadata: { name: CHART_APP_ID },
    })

    const { params } = createDACPTestParams({
      instanceId: attackerInstanceId,
      initialState,
    })

    // Even if the strip at the trust boundary were bypassed, identity must come
    // from the registered port-derived id — never from message meta.
    expect(resolveDacpHandlerInstanceId(params)).toBe(attackerInstanceId)
  })

  it("routes handshake routing id to validated instanceId after WCP4 handshake mapping", () => {
    const validatedInstanceId = "validated-wcp5-id"
    const handshakeRoutingId = "temp-linked-handshake"

    const initialState = connectInstance(createInitialState(DEFAULT_FDC3_USER_CHANNELS), {
      instanceId: validatedInstanceId,
      appId: CHART_APP_ID,
      metadata: { name: CHART_APP_ID },
    })
    const stateWithLink = linkHandshakeRoutingId(
      initialState,
      handshakeRoutingId,
      validatedInstanceId,
    )

    const { params } = createDACPTestParams({
      instanceId: handshakeRoutingId,
      initialState: stateWithLink,
    })

    expect(resolveDacpHandlerInstanceId(params)).toBe(validatedInstanceId)
  })

  it("does not rebind an unregistered routing id to another app's sole connected instance", () => {
    const unregisteredRoutingId = "stale-conformance-instance"
    const liveInstanceId = "live-conformance-instance"
    const claimedAppId = "Conformance1"
    const initialState = updateInstanceState(
      connectInstance(createInitialState(DEFAULT_FDC3_USER_CHANNELS), {
        instanceId: liveInstanceId,
        appId: claimedAppId,
        metadata: { name: claimedAppId },
      }),
      liveInstanceId,
      AppInstanceState.CONNECTED,
    )

    const { params } = createDACPTestParams({
      instanceId: unregisteredRoutingId,
      initialState,
    })

    const resolved = resolveDacpHandlerInstanceId(params)
    expect(resolved).not.toBe(liveInstanceId)
    expect(resolved).toBe(unregisteredRoutingId)
  })

  it("does not attribute a broadcast claiming another app's appId to that app's sole connected instance", () => {
    const attackerRoutingId = "attacker-unregistered-routing"
    const victimInstanceId = "victim-connected-instance"
    const victimAppId = "VictimApp"
    const initialState = updateInstanceState(
      connectInstance(createInitialState(DEFAULT_FDC3_USER_CHANNELS), {
        instanceId: victimInstanceId,
        appId: victimAppId,
        metadata: { name: victimAppId },
      }),
      victimInstanceId,
      AppInstanceState.CONNECTED,
    )

    const { params } = createDACPTestParams({
      instanceId: attackerRoutingId,
      initialState,
    })

    const resolved = resolveDacpHandlerInstanceId(params)
    expect(resolved).not.toBe(victimInstanceId)
    expect(resolved).toBe(attackerRoutingId)
  })
  it("keeps the connected sender when another instance has pending open-with-context", () => {
    const connectedSenderId = "connected-mock-instance"
    const pendingTargetId = "pending-mock-launch"
    const appId = "MockAppId"
    const openRequest = {
      type: "openRequest",
      meta: {
        requestUuid: "open-req-pending-other",
        timestamp: new Date(),
        source: { appId: "Conformance1", instanceId: "conformance-1" },
      },
      payload: {
        app: { appId, instanceId: pendingTargetId },
        context: { type: "fdc3.instrument", id: { ticker: "MSFT" } },
      },
    } as BrowserTypes.OpenRequest

    const withConnected = updateInstanceState(
      connectInstance(createInitialState(DEFAULT_FDC3_USER_CHANNELS), {
        instanceId: connectedSenderId,
        appId,
        metadata: { name: appId },
      }),
      connectedSenderId,
      AppInstanceState.CONNECTED,
    )
    const initialState = addPendingOpenWithContext(
      connectInstance(withConnected, {
        instanceId: pendingTargetId,
        appId,
        metadata: { name: appId },
      }),
      pendingTargetId,
      {
        message: openRequest,
        appIdentifier: { appId, instanceId: pendingTargetId },
        launchContext: openRequest.payload.context!,
        sourceInstanceId: "conformance-1",
      },
    )

    const { params } = createDACPTestParams({
      instanceId: connectedSenderId,
      initialState,
    })

    expect(resolveDacpHandlerInstanceId(params)).toBe(connectedSenderId)
  })

  it("does not guess a stale source id when multiple connected instances share the appId", () => {
    const staleInstanceId = "stale-conformance-instance"
    const appId = "Conformance1"
    const withFirst = updateInstanceState(
      connectInstance(createInitialState(DEFAULT_FDC3_USER_CHANNELS), {
        instanceId: "live-conformance-one",
        appId,
        metadata: { name: appId },
      }),
      "live-conformance-one",
      AppInstanceState.CONNECTED,
    )
    const initialState = updateInstanceState(
      connectInstance(withFirst, {
        instanceId: "live-conformance-two",
        appId,
        metadata: { name: appId },
      }),
      "live-conformance-two",
      AppInstanceState.CONNECTED,
    )

    const { params } = createDACPTestParams({
      instanceId: staleInstanceId,
      initialState,
    })

    expect(resolveDacpHandlerInstanceId(params)).toBe(staleInstanceId)
  })
})
