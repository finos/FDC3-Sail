/**
 * Intent Selectors
 *
 * Pure functions for querying intent-related state.
 */

import type { AgentState, AppInstance, IntentListener, PendingIntent } from "../types"
import { getInstance } from "./instance"

export const getIntentListener = (
  state: AgentState,
  listenerId: string,
): IntentListener | undefined => state.intents.listeners[listenerId]

export const getAllIntentListeners = (state: AgentState): IntentListener[] =>
  Object.values(state.intents.listeners)

export const getActiveListenersForIntent = (
  state: AgentState,
  intentName: string,
): IntentListener[] =>
  Object.values(state.intents.listeners).filter(l => l.intentName === intentName && l.active)

/** Resolve app instances that have active intent listeners via the global registry. */
export const getInstancesWithIntentListener = (
  state: AgentState,
  intentName: string,
): AppInstance[] => {
  const instanceIds = new Set(
    getActiveListenersForIntent(state, intentName).map(listener => listener.instanceId),
  )
  return [...instanceIds]
    .map(instanceId => getInstance(state, instanceId))
    .filter((instance): instance is AppInstance => instance !== undefined)
}

export const getListenersForInstance = (state: AgentState, instanceId: string): IntentListener[] =>
  Object.values(state.intents.listeners).filter(l => l.instanceId === instanceId)

export const getListenersForApp = (state: AgentState, appId: string): IntentListener[] =>
  Object.values(state.intents.listeners).filter(l => l.appId === appId)

export const getListenersForContextType = (
  state: AgentState,
  contextType: string,
): IntentListener[] =>
  Object.values(state.intents.listeners).filter(
    l => l.contextTypes.length === 0 || l.contextTypes.includes(contextType),
  )

export const getPendingIntent = (state: AgentState, requestId: string): PendingIntent | undefined =>
  state.intents.pending[requestId]

export const getAllPendingIntents = (state: AgentState): PendingIntent[] =>
  Object.values(state.intents.pending)
