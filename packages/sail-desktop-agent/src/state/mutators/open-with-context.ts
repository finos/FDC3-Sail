/**
 * Open-with-context Mutators
 *
 * Pure functions that manage pending open-with-context state.
 */

import { produce } from "immer"
import type { AgentState, PendingOpenWithContext } from "../types"

// Add a pending open-with-context request for a target instance.
export const addPendingOpenWithContext = (
  state: AgentState,
  targetInstanceId: string,
  pending: PendingOpenWithContext,
): AgentState => {
  return produce(state, draft => {
    const pendingByInstance = draft.open.pendingWithContext
    if (!pendingByInstance[targetInstanceId]) {
      pendingByInstance[targetInstanceId] = []
    }
    pendingByInstance[targetInstanceId].push(pending)
  })
}

// Replace pending list for a target instance (or clear if empty).
export const setPendingOpenWithContextForInstance = (
  state: AgentState,
  targetInstanceId: string,
  pendingList: PendingOpenWithContext[],
): AgentState => {
  return produce(state, draft => {
    if (pendingList.length === 0) {
      delete draft.open.pendingWithContext[targetInstanceId]
    } else {
      draft.open.pendingWithContext[targetInstanceId] = pendingList
    }
  })
}

// Move pending open-with-context entries from one instance bucket to another.
export const migratePendingOpenWithContextTarget = (
  state: AgentState,
  fromInstanceId: string,
  toInstanceId: string,
): AgentState => {
  const pendingList = state.open.pendingWithContext[fromInstanceId]
  if (!pendingList || pendingList.length === 0) {
    return state
  }

  return produce(state, draft => {
    const fromList = draft.open.pendingWithContext[fromInstanceId]
    if (!fromList || fromList.length === 0) {
      return
    }

    delete draft.open.pendingWithContext[fromInstanceId]

    if (!draft.open.pendingWithContext[toInstanceId]) {
      draft.open.pendingWithContext[toInstanceId] = []
    }

    for (const pending of fromList) {
      draft.open.pendingWithContext[toInstanceId].push({
        ...pending,
        appIdentifier: {
          ...pending.appIdentifier,
          instanceId: toInstanceId,
        },
      })
    }
  })
}

// Remove a pending entry by request UUID for a specific target instance.
export const removePendingOpenWithContextByRequest = (
  state: AgentState,
  targetInstanceId: string,
  requestUuid: string,
): AgentState => {
  const pendingList = state.open.pendingWithContext[targetInstanceId]
  if (!pendingList) {
    return state
  }

  return produce(state, draft => {
    const list = draft.open.pendingWithContext[targetInstanceId]
    if (!list) {
      return
    }

    const remaining = list.filter(pending => pending.message.meta.requestUuid !== requestUuid)

    if (remaining.length === 0) {
      delete draft.open.pendingWithContext[targetInstanceId]
    } else {
      draft.open.pendingWithContext[targetInstanceId] = remaining
    }
  })
}
