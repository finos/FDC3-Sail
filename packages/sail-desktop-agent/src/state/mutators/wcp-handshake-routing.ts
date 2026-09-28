/**
 * Mutators for WCP handshake routing id → validated instanceId links on AgentState.
 */

import type { AgentState } from "../types"

/** Record a pre-WCP5 routing id → validated instanceId link after WCP5 succeeds. */
export function linkHandshakeRoutingId(
  state: AgentState,
  handshakeRoutingId: string,
  instanceId: string,
): AgentState {
  return {
    ...state,
    wcpHandshakeRouting: {
      ...state.wcpHandshakeRouting,
      handshakeRoutingIdToInstanceId: {
        ...state.wcpHandshakeRouting.handshakeRoutingIdToInstanceId,
        [handshakeRoutingId]: instanceId,
      },
    },
  }
}

/** Remove all routing entries that point at the given validated instanceId (on disconnect). */
export function clearHandshakeRoutingIdsForInstance(
  state: AgentState,
  instanceId: string,
): AgentState {
  const nextEntries = Object.fromEntries(
    Object.entries(state.wcpHandshakeRouting.handshakeRoutingIdToInstanceId).filter(
      ([, linkedInstanceId]) => linkedInstanceId !== instanceId,
    ),
  )

  return {
    ...state,
    wcpHandshakeRouting: {
      ...state.wcpHandshakeRouting,
      handshakeRoutingIdToInstanceId: nextEntries,
    },
  }
}
