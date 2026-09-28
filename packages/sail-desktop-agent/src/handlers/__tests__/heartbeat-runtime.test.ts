import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { startHeartbeat } from "../heartbeat/handlers"
import {
  clearAllHeartbeatTimersForTesting,
  getActiveHeartbeatTimerCount,
  setHeartbeatTimer,
  stopHeartbeat,
} from "../heartbeat/runtime"
import { connectInstance, updateInstanceState } from "../../state/mutators"
import { AppInstanceState } from "../../state/types"
import { DEFAULT_FDC3_USER_CHANNELS } from "../../agent/default-user-channels"
import { createInitialState } from "../../state/initial-state"
import type { AgentState } from "../../state/types"
import { createDACPTestParams } from "./test-params"
import { withResponseDispatcher } from "./test-params"
import { MockTransport } from "../../__tests__/utils/mock-transport"

afterEach(() => {
  clearAllHeartbeatTimersForTesting()
})

describe("heartbeat-runtime", () => {
  it("removes interval handles when stopHeartbeat is called", () => {
    let state = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
    const setState = (fn: (s: AgentState) => AgentState) => {
      state = fn(state)
    }

    const handle = setInterval(() => {}, 1000)
    setHeartbeatTimer("a1", handle)
    expect(getActiveHeartbeatTimerCount()).toBe(1)

    stopHeartbeat("a1", setState)

    expect(getActiveHeartbeatTimerCount()).toBe(0)
  })

  it("replaces an existing interval when setHeartbeatTimer is called again", () => {
    const clearSpy = vi.spyOn(globalThis, "clearInterval")

    setHeartbeatTimer(
      "a1",
      setInterval(() => {}, 1000),
    )
    setHeartbeatTimer(
      "a1",
      setInterval(() => {}, 1000),
    )

    expect(getActiveHeartbeatTimerCount()).toBe(1)
    expect(clearSpy).toHaveBeenCalled()

    clearSpy.mockRestore()
  })
})

describe("heartbeat scenario isolation", () => {
  beforeEach(() => {
    clearAllHeartbeatTimersForTesting()
  })

  it("has no active timers after explicit cleanup (simulates scenario teardown expectation)", () => {
    setHeartbeatTimer(
      "orphan",
      setInterval(() => {}, 1000),
    )
    clearAllHeartbeatTimersForTesting()
    expect(getActiveHeartbeatTimerCount()).toBe(0)
  })
})

describe("startHeartbeat disconnect alignment", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("keys heartbeat timers by the instanceId passed to startHeartbeat, not the handler params id", () => {
    const tempInstanceId = "temp-connection-uuid"
    const validatedInstanceId = "validated-instance-from-wcp5"
    let state = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
    state = connectInstance(state, {
      instanceId: validatedInstanceId,
      appId: "TestApp",
      metadata: { name: "TestApp" },
    })
    state = updateInstanceState(state, validatedInstanceId, AppInstanceState.CONNECTED)

    const { params, getState } = createDACPTestParams({
      instanceId: tempInstanceId,
      initialState: state,
    })
    const heartbeatContext = withResponseDispatcher(params, new MockTransport())

    startHeartbeat(validatedInstanceId, heartbeatContext)

    expect(getActiveHeartbeatTimerCount()).toBe(1)
    expect(getState().heartbeats[validatedInstanceId]).toBeDefined()
    expect(getState().heartbeats[tempInstanceId]).toBeUndefined()
  })
})
