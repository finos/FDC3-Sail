/**
 * Guard tests: the two instance-id resolvers are NOT interchangeable, and must stay that way.
 *
 *   - `resolveDacpHandlerInstanceId` (utils/resolve-context-listener-instance-id.ts)
 *       registered instance -> handshake link (only if the linked id is a registered instance) -> input
 *   - `resolveTeardownInstanceId` (instance-teardown.ts, module-private)
 *       active heartbeat -> `temp-`-prefixed handshake link -> input
 *
 * Cleanup deliberately keys off heartbeats so it can tear down an instance whose FDC3 state is
 * already gone, and it only follows `temp-`-prefixed links. Unifying the two would be a behaviour
 * change nobody asked for.
 *
 * `resolveTeardownInstanceId` is not exported, so these tests observe its decision through the
 * effect `cleanupInstanceDacpState` has on state — which is the only way it is observable in production
 * anyway. Each test constructs a state where the two resolvers disagree, in opposite directions,
 * so replacing either one with the other flips an assertion.
 */
import { afterEach, describe, expect, it } from "vite-plus/test"

import { MockTransport } from "../../__tests__/utils/mock-transport"
import { DEFAULT_FDC3_USER_CHANNELS } from "../../agent/default-user-channels"
import { createInitialState } from "../../state/initial-state"
import { connectInstance, startHeartbeat, updateInstanceState } from "../../state/mutators"
import { linkHandshakeRoutingId } from "../../state/mutators/wcp-handshake-routing"
import { AppInstanceState } from "../../state/types"
import { cleanupInstanceDacpState } from "../instance-teardown"
import { clearAllHeartbeatTimersForTesting } from "../heartbeat/runtime"
import { clearAllPendingOpenWithContextTimeoutsForTesting } from "../utils/open-with-context"
import { resolveDacpHandlerInstanceId } from "../utils/resolve-context-listener-instance-id"
import { createDACPTestParams, withResponseDispatcher } from "./test-params"

/** Has a heartbeat but was never registered in `state.instances`. */
const HEARTBEAT_ONLY_ID = "heartbeat-only-instance"
/** Registered in `state.instances` but has no heartbeat. */
const REGISTERED_ONLY_ID = "registered-only-instance"
const APP_ID = "ChartApp"
/** `temp-` prefixed: `resolveTeardownInstanceId` will follow this link. */
const TEMP_ROUTING_ID = "temp-connection-attempt"
/** Not `temp-` prefixed: `resolveTeardownInstanceId` will NOT follow this link. */
const PORT_ROUTING_ID = "port-routing-link"

afterEach(() => {
  clearAllHeartbeatTimersForTesting()
  clearAllPendingOpenWithContextTimeoutsForTesting()
})

describe("resolveDacpHandlerInstanceId and cleanup's resolver decide differently", () => {
  it("keeps the routing id for DACP while cleanup follows the temp- link to the heartbeat-only instance", () => {
    let state = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
    state = startHeartbeat(state, HEARTBEAT_ONLY_ID)
    state = linkHandshakeRoutingId(state, TEMP_ROUTING_ID, HEARTBEAT_ONLY_ID)

    const { params, getState } = createDACPTestParams({
      instanceId: TEMP_ROUTING_ID,
      initialState: state,
    })
    const wiredContext = withResponseDispatcher(params, new MockTransport())

    // The DACP resolver refuses the link: the linked id is not a registered instance.
    expect(resolveDacpHandlerInstanceId(wiredContext)).toBe(TEMP_ROUTING_ID)
    expect(getState().heartbeats[HEARTBEAT_ONLY_ID]).toBeDefined()

    cleanupInstanceDacpState(wiredContext)

    // Cleanup DID follow the link — proof that it resolved to HEARTBEAT_ONLY_ID and stopped its
    // heartbeat. If cleanup used `resolveDacpHandlerInstanceId` it would have resolved to
    // TEMP_ROUTING_ID, found no cleanup work, and left this heartbeat running.
    expect(getState().heartbeats[HEARTBEAT_ONLY_ID]).toBeUndefined()
  })

  it("follows a non-temp routing link for DACP while cleanup ignores it and tears down nothing", () => {
    let state = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
    state = connectInstance(state, {
      instanceId: REGISTERED_ONLY_ID,
      appId: APP_ID,
      metadata: { name: APP_ID },
    })
    state = updateInstanceState(state, REGISTERED_ONLY_ID, AppInstanceState.CONNECTED)
    state = linkHandshakeRoutingId(state, PORT_ROUTING_ID, REGISTERED_ONLY_ID)

    const { params, getState } = createDACPTestParams({
      instanceId: PORT_ROUTING_ID,
      initialState: state,
    })
    const wiredContext = withResponseDispatcher(params, new MockTransport())

    // The DACP resolver follows the link: the linked id IS a registered instance.
    expect(resolveDacpHandlerInstanceId(wiredContext)).toBe(REGISTERED_ONLY_ID)

    cleanupInstanceDacpState(wiredContext)

    // Cleanup did NOT follow it — the routing id lacks the `temp-` prefix, so cleanup resolved to
    // PORT_ROUTING_ID, found no cleanup work, and returned early. If the resolvers were unified,
    // this would have removed a live, registered instance.
    expect(getState().instances[REGISTERED_ONLY_ID]).toBeDefined()
    expect(getState().wcpHandshakeRouting.handshakeRoutingIdToInstanceId[PORT_ROUTING_ID]).toBe(
      REGISTERED_ONLY_ID,
    )
  })
})
