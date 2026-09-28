/**
 * Selectors for WCP handshake routing id → validated instanceId links on AgentState.
 */

import type { AgentState } from "../types"

/** Return the validated instanceId when routingId was linked at WCP5; otherwise undefined. */
export function resolveLinkedInstanceId(state: AgentState, routingId: string): string | undefined {
  return state.wcpHandshakeRouting.handshakeRoutingIdToInstanceId[routingId]
}

/**
 * Resolve a DACP routing id to the validated instanceId when linked; otherwise return routingId unchanged.
 */
export function resolveInstanceId(state: AgentState, routingId: string): string {
  return state.wcpHandshakeRouting.handshakeRoutingIdToInstanceId[routingId] ?? routingId
}
