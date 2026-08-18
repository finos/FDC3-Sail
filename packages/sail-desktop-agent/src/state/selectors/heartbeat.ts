/**
 * Heartbeat Selectors
 *
 * Pure functions for querying heartbeat-related state.
 */

import type { AgentState, HeartbeatState } from "../types"

/**
 * Returns the heartbeat state for a specific app instance, if present.
 * @param state - The agent state to query.
 * @param instanceId - The app instance identifier.
 * @returns The heartbeat state for the instance, or undefined if none exists.
 */
export const getHeartbeatState = (
  state: AgentState,
  instanceId: string,
): HeartbeatState | undefined => state.heartbeats[instanceId]

/**
 * Returns all heartbeat states currently tracked by the agent.
 * @param state - The agent state to query.
 * @returns An array of all heartbeat states.
 */
export const getAllHeartbeatStates = (state: AgentState): HeartbeatState[] =>
  Object.values(state.heartbeats)
