/**
 * Instance Mutators
 *
 * Pure functions that transform instance-related state using Immer.
 */

import { produce } from "immer"
import type { AgentState, AppInstance, AppInstanceMetadata } from "../types"
import { AppInstanceState } from "../types"

export const connectInstance = (
  state: AgentState,
  params: {
    instanceId: string
    appId: string
    metadata: AppInstanceMetadata
    instanceMetadata?: AppInstance["instanceMetadata"]
  },
): AgentState => {
  if (state.instances[params.instanceId]) {
    throw new Error(`Instance ${params.instanceId} already exists`)
  }

  return produce(state, draft => {
    const now = new Date()
    const registrationSequence = draft.nextInstanceSequence++
    draft.instances[params.instanceId] = {
      instanceId: params.instanceId,
      appId: params.appId,
      metadata: params.metadata,
      state: AppInstanceState.PENDING,
      createdAt: now,
      registrationSequence,
      lastActivity: now,
      currentUserChannel: null,
      contextListeners: {},
      privateChannels: [],
      instanceMetadata: params.instanceMetadata,
    }
  })
}

export const updateInstanceState = (
  state: AgentState,
  instanceId: string,
  instanceState: AppInstanceState,
): AgentState => {
  if (!state.instances[instanceId]) return state

  return produce(state, draft => {
    draft.instances[instanceId]!.state = instanceState
    draft.instances[instanceId]!.lastActivity = new Date()
  })
}

export const updateInstanceActivity = (state: AgentState, instanceId: string): AgentState => {
  if (!state.instances[instanceId]) return state

  return produce(state, draft => {
    draft.instances[instanceId]!.lastActivity = new Date()
  })
}

export const removeInstance = (state: AgentState, instanceId: string): AgentState => {
  if (!state.instances[instanceId]) return state

  return produce(state, draft => {
    delete draft.instances[instanceId]
  })
}

export const joinUserChannel = (
  state: AgentState,
  instanceId: string,
  channelId: string | null,
): AgentState => {
  if (!state.instances[instanceId]) return state

  return produce(state, draft => {
    draft.instances[instanceId]!.currentUserChannel = channelId
    draft.instances[instanceId]!.lastActivity = new Date()
  })
}

export const addContextListener = (
  state: AgentState,
  instanceId: string,
  listenerId: string,
  contextType: string,
  channelId?: string | null,
): AgentState => {
  if (!state.instances[instanceId]) return state

  return produce(state, draft => {
    const instance = draft.instances[instanceId]!
    const entry =
      channelId != null && channelId !== "" ? { contextType, channelId } : { contextType }
    instance.contextListeners[listenerId] = entry
    instance.lastActivity = new Date()
  })
}

export const removeContextListener = (
  state: AgentState,
  instanceId: string,
  listenerId: string,
): AgentState => {
  if (!state.instances[instanceId]) return state

  return produce(state, draft => {
    const instance = draft.instances[instanceId]!
    delete instance.contextListeners[listenerId]
    instance.lastActivity = new Date()
  })
}

export const addPrivateChannel = (
  state: AgentState,
  instanceId: string,
  channelId: string,
): AgentState => {
  if (!state.instances[instanceId]) return state

  return produce(state, draft => {
    const instance = draft.instances[instanceId]!
    if (!instance.privateChannels.includes(channelId)) {
      instance.privateChannels.push(channelId)
    }
    instance.lastActivity = new Date()
  })
}

export const removePrivateChannel = (
  state: AgentState,
  instanceId: string,
  channelId: string,
): AgentState => {
  if (!state.instances[instanceId]) return state

  return produce(state, draft => {
    const instance = draft.instances[instanceId]!
    instance.privateChannels = instance.privateChannels.filter(pc => pc !== channelId)
    instance.lastActivity = new Date()
  })
}
