/**
 * Event Mutators
 *
 * Pure functions that transform event-related state using Immer.
 */

import { produce } from "immer"
import type { AgentState, AgentEventListener } from "../types"

export const addEventListener = (state: AgentState, listener: AgentEventListener): AgentState => {
  return produce(state, draft => {
    draft.events.listeners[listener.listenerId] = listener

    if (!draft.events.byEventType[listener.eventType]) {
      draft.events.byEventType[listener.eventType] = []
    }
    if (!draft.events.byEventType[listener.eventType]!.includes(listener.listenerId)) {
      draft.events.byEventType[listener.eventType]!.push(listener.listenerId)
    }
  })
}

export const removeEventListener = (state: AgentState, listenerId: string): AgentState => {
  const listener = state.events.listeners[listenerId]
  if (!listener) return state

  return produce(state, draft => {
    // Remove from byEventType index
    const typeListeners = draft.events.byEventType[listener.eventType]
    if (typeListeners) {
      draft.events.byEventType[listener.eventType] = typeListeners.filter(id => id !== listenerId)
      // Clean up empty arrays
      if (draft.events.byEventType[listener.eventType]!.length === 0) {
        delete draft.events.byEventType[listener.eventType]
      }
    }

    delete draft.events.listeners[listenerId]
  })
}

export const removeEventListenersForInstance = (
  state: AgentState,
  instanceId: string,
): AgentState => {
  const toRemove = Object.values(state.events.listeners)
    .filter(l => l.instanceId === instanceId)
    .map(l => l.listenerId)

  if (toRemove.length === 0) return state

  return produce(state, draft => {
    toRemove.forEach(listenerId => {
      const listener = draft.events.listeners[listenerId]
      if (listener) {
        // Remove from byEventType index
        const typeListeners = draft.events.byEventType[listener.eventType]
        if (typeListeners) {
          draft.events.byEventType[listener.eventType] = typeListeners.filter(
            id => id !== listenerId,
          )
          if (draft.events.byEventType[listener.eventType]!.length === 0) {
            delete draft.events.byEventType[listener.eventType]
          }
        }
      }
      delete draft.events.listeners[listenerId]
    })
  })
}
