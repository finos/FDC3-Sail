import { describe, expect, it } from "vite-plus/test"
import { connectInstance, updateInstanceState } from "../../../state/mutators"
import { createInitialState } from "../../../state/initial-state"
import { DEFAULT_FDC3_USER_CHANNELS } from "../../../agent/default-user-channels"
import { AppInstanceState } from "../../../state/types"
import type { AgentState } from "../../../state/types"
import type { InstanceIdentityRecord } from "../../../app-connection/wcp/instance-identity-registry"
import { createDACPTestParams } from "../../__tests__/test-params"
import {
  reconcileOrphanPendingHostInstances,
  tryAdoptHostPreRegisteredInstance,
} from "../wcp-host-instance-adoption"

const MOCK_APP_ID = "MockAppId"
const L1 = "L1"
const L2 = "L2"
const SOURCE_WINDOW = { hostPanel: "test-source" }

function createStateWithPendingInstances(instanceIds: string[]) {
  let state = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
  for (const instanceId of instanceIds) {
    state = connectInstance(state, {
      instanceId,
      appId: MOCK_APP_ID,
      metadata: { name: MOCK_APP_ID },
    })
  }
  return state
}

function adopt(params: {
  reconnectInstanceId?: string
  reconnectInstanceUuid?: string
  hostIdentifier?: string
  state: ReturnType<typeof createStateWithPendingInstances>
  identityMap?: Map<string, InstanceIdentityRecord>
}) {
  const { state, identityMap = new Map<string, InstanceIdentityRecord>(), ...rest } = params
  return tryAdoptHostPreRegisteredInstance({
    ...rest,
    sourceWindow: SOURCE_WINDOW,
    appId: MOCK_APP_ID,
    getState: () => state,
    identityMap,
  })
}

describe("tryAdoptHostPreRegisteredInstance", () => {
  describe("multiple stale PENDING rows for same appId", () => {
    it.each([
      {
        label: "hostIdentifier L2 with no WCP4 instanceId",
        reconnectInstanceId: undefined,
        hostIdentifier: L2,
        expectedInstanceId: L2,
      },
      {
        label: "explicit WCP4 instanceId L1 wins over hostIdentifier L2",
        reconnectInstanceId: L1,
        hostIdentifier: L2,
        expectedInstanceId: L1,
      },
      {
        label: "explicit WCP4 instanceId L2 wins when hostIdentifier absent",
        reconnectInstanceId: L2,
        hostIdentifier: undefined,
        expectedInstanceId: L2,
      },
    ])(
      "adopts $expectedInstanceId when $label",
      ({ reconnectInstanceId, hostIdentifier, expectedInstanceId }) => {
        const state = createStateWithPendingInstances([L1, L2])

        const result = adopt({
          reconnectInstanceId,
          hostIdentifier,
          state,
        })

        expect(result).toBeDefined()
        expect(result?.instanceId).toBe(expectedInstanceId)
        expect(result?.instanceUuid).toBeTruthy()
      },
    )

    it("returns undefined when two pendings exist and neither instanceId nor hostIdentifier disambiguates", () => {
      const state = createStateWithPendingInstances([L1, L2])

      const result = adopt({ state })

      expect(result).toBeUndefined()
    })

    it("ignores hostIdentifier that does not match a pending host instance", () => {
      const state = createStateWithPendingInstances([L1, L2])

      const result = adopt({ hostIdentifier: "unknown-launch-id", state })

      expect(result).toBeUndefined()
    })
  })
})

describe("reconcileOrphanPendingHostInstances", () => {
  const OTHER_APP_ID = "OtherMockAppId"

  function connect(state: AgentState, instanceId: string, appId = MOCK_APP_ID): AgentState {
    return connectInstance(state, {
      instanceId,
      appId,
      metadata: { name: appId },
    })
  }

  function reconcile(state: AgentState, appId: string, validatedInstanceId: string) {
    const { params, getState } = createDACPTestParams({
      instanceId: validatedInstanceId,
      initialState: state,
    })
    reconcileOrphanPendingHostInstances(params, appId, validatedInstanceId)
    return getState()
  }

  describe("uuid-only ids (no regression on the deliberate order rule)", () => {
    it("reaps an earlier PENDING row of the same appId when a later row validates first", () => {
      const earlierId = "11111111-1111-1111-1111-111111111111"
      const laterId = "22222222-2222-2222-2222-222222222222"
      let state = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
      state = connect(state, earlierId)
      state = connect(state, laterId)

      const nextState = reconcile(state, MOCK_APP_ID, laterId)

      expect(nextState.instances[earlierId]).toBeUndefined()
      expect(nextState.instances[laterId]?.state).toBe(AppInstanceState.PENDING)
    })

    it("never reaps a PENDING row belonging to a different appId", () => {
      const otherAppInstanceId = "other-app-instance"
      const earlierId = "same-app-earlier"
      const laterId = "same-app-later"
      let state = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
      state = connect(state, otherAppInstanceId, OTHER_APP_ID)
      state = connect(state, earlierId)
      state = connect(state, laterId)

      const nextState = reconcile(state, MOCK_APP_ID, laterId)

      expect(nextState.instances[otherAppInstanceId]).toBeDefined()
      expect(nextState.instances[earlierId]).toBeUndefined()
    })

    it("never reaps a row that is not PENDING, even if registered earlier", () => {
      const connectedId = "already-connected-earlier"
      const laterId = "pending-later"
      let state = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
      state = connect(state, connectedId)
      state = updateInstanceState(state, connectedId, AppInstanceState.CONNECTED)
      state = connect(state, laterId)

      const nextState = reconcile(state, MOCK_APP_ID, laterId)

      expect(nextState.instances[connectedId]).toBeDefined()
      expect(nextState.instances[connectedId]?.state).toBe(AppInstanceState.CONNECTED)
    })
  })

  describe("not-found validatedInstanceId: fails safe, not open", () => {
    it("reaps nothing when the validated instanceId is absent from state.instances", () => {
      const earlierId = "not-found-a"
      const laterId = "not-found-b"
      let state = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
      state = connect(state, earlierId)
      state = connect(state, laterId)

      const nextState = reconcile(state, MOCK_APP_ID, "instance-id-that-does-not-exist")

      expect(nextState.instances[earlierId]).toBeDefined()
      expect(nextState.instances[laterId]).toBeDefined()
    })
  })

  describe("integer-like instanceId ordering", () => {
    it("reaps the integer-like row when it is genuinely the earlier registration", () => {
      const integerId = "7"
      const uuidId = "33333333-3333-3333-3333-333333333333"
      let state = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
      // Genuine registration order: integer-like FIRST, uuid SECOND.
      state = connect(state, integerId)
      state = connect(state, uuidId)

      const nextState = reconcile(state, MOCK_APP_ID, uuidId)

      expect(nextState.instances[integerId]).toBeUndefined()
      expect(nextState.instances[uuidId]?.state).toBe(AppInstanceState.PENDING)
    })

    it("does NOT reap the integer-like row when it is genuinely the later (still in-flight) launch", () => {
      const uuidId = "44444444-4444-4444-4444-444444444444"
      const integerId = "7"
      let state = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
      // Genuine registration order: uuid FIRST, integer-like SECOND — a concurrent launch that
      // has not connected yet. JS enumerates integer-like keys first regardless of insertion
      // order, so Object.values(state.instances) reports the integer-like row as if it came
      // first, even though it did not.
      state = connect(state, uuidId)
      state = connect(state, integerId)
      expect(Object.keys(state.instances)).toEqual([integerId, uuidId])

      // The genuinely earlier (uuid) row validates. The integer-like row is the genuinely later,
      // still-in-flight concurrent launch and must be left alone — reaping it would delete an
      // instanceId its own open() caller already holds.
      const nextState = reconcile(state, MOCK_APP_ID, uuidId)

      expect(nextState.instances[integerId]).toBeDefined()
      expect(nextState.instances[integerId]?.state).toBe(AppInstanceState.PENDING)
    })
  })
})
