/**
 * Intent Mutators
 *
 * Pure functions that transform intent-related state using Immer.
 */

import { produce } from "immer"
import type { AgentState, IntentListener, PendingIntent } from "../types"

export const registerIntentListener = (
  state: AgentState,
  listener: Omit<IntentListener, "registeredAt" | "lastActivity" | "active">,
): AgentState => {
  if (state.intents.listeners[listener.listenerId]) {
    throw new Error(`Listener ${listener.listenerId} already exists`)
  }

  return produce(state, draft => {
    const now = new Date()
    draft.intents.listeners[listener.listenerId] = {
      ...listener,
      registeredAt: now,
      lastActivity: now,
      active: true,
    }
  })
}

export const unregisterIntentListener = (state: AgentState, listenerId: string): AgentState => {
  if (!state.intents.listeners[listenerId]) return state

  return produce(state, draft => {
    delete draft.intents.listeners[listenerId]
  })
}

export const removeListenersForInstance = (state: AgentState, instanceId: string): AgentState => {
  const toRemove = Object.values(state.intents.listeners)
    .filter(l => l.instanceId === instanceId)
    .map(l => l.listenerId)

  if (toRemove.length === 0) return state

  return produce(state, draft => {
    toRemove.forEach(id => delete draft.intents.listeners[id])
  })
}

export const updateIntentListenerActivity = (state: AgentState, listenerId: string): AgentState => {
  if (!state.intents.listeners[listenerId]) return state

  return produce(state, draft => {
    draft.intents.listeners[listenerId]!.lastActivity = new Date()
  })
}

export const setIntentListenerActive = (
  state: AgentState,
  listenerId: string,
  active: boolean,
): AgentState => {
  if (!state.intents.listeners[listenerId]) return state

  return produce(state, draft => {
    draft.intents.listeners[listenerId]!.active = active
    draft.intents.listeners[listenerId]!.lastActivity = new Date()
  })
}

export const addPendingIntent = (
  state: AgentState,
  pending: Omit<PendingIntent, "raisedAt">,
): AgentState => {
  return produce(state, draft => {
    draft.intents.pending[pending.requestId] = {
      ...pending,
      raisedAt: new Date(),
    }
  })
}

export const updatePendingIntentTarget = (
  state: AgentState,
  requestId: string,
  targetInstanceId: string,
  targetAppId: string,
): AgentState => {
  if (!state.intents.pending[requestId]) return state

  return produce(state, draft => {
    draft.intents.pending[requestId]!.targetInstanceId = targetInstanceId
    draft.intents.pending[requestId]!.targetAppId = targetAppId
  })
}

export const markPendingIntentDelivered = (state: AgentState, requestId: string): AgentState => {
  if (!state.intents.pending[requestId]) return state

  return produce(state, draft => {
    draft.intents.pending[requestId]!.delivered = true
  })
}

export const resolvePendingIntent = (state: AgentState, requestId: string): AgentState => {
  if (!state.intents.pending[requestId]) return state

  return produce(state, draft => {
    delete draft.intents.pending[requestId]
  })
}
