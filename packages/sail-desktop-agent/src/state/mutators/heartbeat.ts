/**
 * Heartbeat Mutators
 *
 * Pure functions that transform heartbeat-related state using Immer.
 */

import { produce } from "immer"
import type { AgentState } from "../types"

export const startHeartbeat = (state: AgentState, instanceId: string): AgentState => {
  return produce(state, draft => {
    const now = Date.now()
    draft.heartbeats[instanceId] = {
      instanceId,
      lastHeartbeatSent: now,
      lastAcknowledgmentReceived: now,
      missedHeartbeats: 0,
    }
  })
}

export const acknowledgeHeartbeat = (state: AgentState, instanceId: string): AgentState => {
  if (!state.heartbeats[instanceId]) return state

  return produce(state, draft => {
    draft.heartbeats[instanceId]!.lastAcknowledgmentReceived = Date.now()
    draft.heartbeats[instanceId]!.missedHeartbeats = 0
  })
}

export const updateHeartbeatSent = (state: AgentState, instanceId: string): AgentState => {
  if (!state.heartbeats[instanceId]) return state

  return produce(state, draft => {
    draft.heartbeats[instanceId]!.lastHeartbeatSent = Date.now()
    draft.heartbeats[instanceId]!.missedHeartbeats += 1
  })
}

export const stopHeartbeat = (state: AgentState, instanceId: string): AgentState => {
  if (!state.heartbeats[instanceId]) return state

  return produce(state, draft => {
    delete draft.heartbeats[instanceId]
  })
}
