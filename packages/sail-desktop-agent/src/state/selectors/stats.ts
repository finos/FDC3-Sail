/**
 * Stats Selectors
 *
 * Pure functions for querying aggregate statistics about state.
 */

import type { AgentState } from "../types"
import { getConnectedInstances } from "./instance"

/**
 * Returns aggregate counts of key AgentState collections.
 * @param state - The agent state to query.
 * @returns An object with:
 * - `instances` — total registered instances
 * - `connectedInstances` — instances currently connected
 * - `intentListeners` — registered intent listeners
 * - `pendingIntents` — intents awaiting resolution
 * - `userChannels` — user channels
 * - `appChannels` — app channels
 * - `privateChannels` — private channels
 * - `eventListeners` — registered event listeners
 * - `heartbeats` — active heartbeats
 */
export const getStats = (state: AgentState) => ({
  instances: Object.keys(state.instances).length,
  connectedInstances: getConnectedInstances(state).length,
  intentListeners: Object.keys(state.intents.listeners).length,
  pendingIntents: Object.keys(state.intents.pending).length,
  userChannels: Object.keys(state.channels.user).length,
  appChannels: Object.keys(state.channels.app).length,
  privateChannels: Object.keys(state.channels.private).length,
  eventListeners: Object.keys(state.events.listeners).length,
  heartbeats: Object.keys(state.heartbeats).length,
})
