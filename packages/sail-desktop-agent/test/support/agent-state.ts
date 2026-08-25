/**
 * BDD-only helpers for mutating DesktopAgent internal state during fixture setup.
 *
 * Production code must not expose state setters on DesktopAgent. Cucumber steps that
 * need to seed state (before DACP messages) use these helpers instead.
 */

import type { SailDesktopAgent } from "../../src/agent/sail-desktop-agent"
import type { AgentAppConnection } from "../../src/app-connection/types"
import type { AgentState } from "../../src/state/types"

/** Runtime shape of DesktopAgent private fields used only in tests. */
type DesktopAgentInternals = {
  state: AgentState
}

/**
 * Accepts any `SailDesktopAgent<TEdge>` — these helpers reach past `private` fields
 * regardless of which app-connection edge the agent under test was constructed with.
 */
function asInternals(agent: SailDesktopAgent<AgentAppConnection>): DesktopAgentInternals {
  return agent as SailDesktopAgent<AgentAppConnection> & DesktopAgentInternals
}

/**
 * Apply a state mutation the same way DACP handler `setState` does.
 */
export function applyDesktopAgentStateUpdate(
  agent: SailDesktopAgent<AgentAppConnection>,
  callback: (state: AgentState) => AgentState,
): void {
  const internal = asInternals(agent)
  internal.state = callback(internal.state)
}
