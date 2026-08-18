/**
 * Private Channel Mutators
 *
 * Pure functions that transform private channel-related state using Immer.
 */

import { produce } from "immer"
import type { Context } from "@finos/fdc3"
import type { AgentState } from "../types"

export const createPrivateChannel = (
  state: AgentState,
  channelId: string,
  creatorAppId: string,
  creatorInstanceId: string,
): AgentState => {
  if (state.channels.private[channelId]) return state

  return produce(state, draft => {
    draft.channels.private[channelId] = {
      id: channelId,
      type: "private",
      creatorAppId,
      creatorInstanceId,
      createdAt: new Date(),
      connectedInstances: [creatorInstanceId],
      contextListeners: {},
      addContextListenerListeners: {},
      unsubscribeListeners: {},
      disconnectListeners: {},
      lifecycleCatchAllListeners: {},
      lastContextByType: {},
      displayMetadata: {
        name: channelId,
      },
    }
    const creator = draft.instances[creatorInstanceId]
    if (creator && !creator.privateChannels.includes(channelId)) {
      creator.privateChannels.push(channelId)
    }
  })
}

export const connectInstanceToPrivateChannel = (
  state: AgentState,
  channelId: string,
  instanceId: string,
): AgentState => {
  const channel = state.channels.private[channelId]
  if (!channel) return state
  if (channel.connectedInstances.includes(instanceId)) return state

  return produce(state, draft => {
    const privateChannel = draft.channels.private[channelId]
    if (privateChannel) {
      privateChannel.connectedInstances.push(instanceId)
    }
    const instance = draft.instances[instanceId]
    if (instance && !instance.privateChannels.includes(channelId)) {
      instance.privateChannels.push(channelId)
    }
  })
}

export const disconnectInstanceFromPrivateChannel = (
  state: AgentState,
  channelId: string,
  instanceId: string,
): AgentState => {
  const channel = state.channels.private[channelId]
  if (!channel) return state

  return produce(state, draft => {
    const privateChannel = draft.channels.private[channelId]
    if (!privateChannel) return

    privateChannel.connectedInstances = privateChannel.connectedInstances.filter(
      id => id !== instanceId,
    )

    // Remove listeners for this instance
    Object.keys(privateChannel.contextListeners).forEach(listenerId => {
      if (privateChannel.contextListeners[listenerId]?.instanceId === instanceId) {
        delete privateChannel.contextListeners[listenerId]
      }
    })

    Object.keys(privateChannel.addContextListenerListeners).forEach(listenerId => {
      if (privateChannel.addContextListenerListeners[listenerId]?.instanceId === instanceId) {
        delete privateChannel.addContextListenerListeners[listenerId]
      }
    })

    Object.keys(privateChannel.unsubscribeListeners).forEach(listenerId => {
      if (privateChannel.unsubscribeListeners[listenerId]?.instanceId === instanceId) {
        delete privateChannel.unsubscribeListeners[listenerId]
      }
    })

    Object.keys(privateChannel.disconnectListeners).forEach(listenerId => {
      if (privateChannel.disconnectListeners[listenerId]?.instanceId === instanceId) {
        delete privateChannel.disconnectListeners[listenerId]
      }
    })

    Object.keys(privateChannel.lifecycleCatchAllListeners).forEach(listenerId => {
      if (privateChannel.lifecycleCatchAllListeners[listenerId]?.instanceId === instanceId) {
        delete privateChannel.lifecycleCatchAllListeners[listenerId]
      }
    })

    const disconnectedInstance = draft.instances[instanceId]
    if (disconnectedInstance) {
      disconnectedInstance.privateChannels = disconnectedInstance.privateChannels.filter(
        id => id !== channelId,
      )
    }

    // Remove channel if no more connections or creator disconnected
    if (
      privateChannel.connectedInstances.length === 0 ||
      !privateChannel.connectedInstances.includes(privateChannel.creatorInstanceId)
    ) {
      delete draft.channels.private[channelId]
      for (const instance of Object.values(draft.instances)) {
        instance.privateChannels = instance.privateChannels.filter(id => id !== channelId)
      }
    }
  })
}

export const addPrivateChannelContextListener = (
  state: AgentState,
  channelId: string,
  listenerId: string,
  instanceId: string,
  contextType: string | null,
): AgentState => {
  const channel = state.channels.private[channelId]
  if (!channel) return state
  if (!channel.connectedInstances.includes(instanceId)) return state

  return produce(state, draft => {
    const privateChannel = draft.channels.private[channelId]
    if (privateChannel) {
      privateChannel.contextListeners[listenerId] = {
        listenerId,
        instanceId,
        contextType,
      }
    }
  })
}

export const addPrivateChannelLifecycleCatchAllListener = (
  state: AgentState,
  channelId: string,
  listenerId: string,
  instanceId: string,
): AgentState => {
  const channel = state.channels.private[channelId]
  if (!channel) return state
  if (!channel.connectedInstances.includes(instanceId)) return state

  return produce(state, draft => {
    const privateChannel = draft.channels.private[channelId]
    if (privateChannel) {
      privateChannel.lifecycleCatchAllListeners[listenerId] = {
        listenerId,
        instanceId,
      }
    }
  })
}

export const removePrivateChannelLifecycleCatchAllListener = (
  state: AgentState,
  channelId: string,
  listenerId: string,
): AgentState => {
  const channel = state.channels.private[channelId]
  if (!channel) return state

  return produce(state, draft => {
    const privateChannel = draft.channels.private[channelId]
    if (privateChannel) {
      delete privateChannel.lifecycleCatchAllListeners[listenerId]
    }
  })
}

export const addPrivateChannelAddContextListenerListener = (
  state: AgentState,
  channelId: string,
  listenerId: string,
  instanceId: string,
): AgentState => {
  const channel = state.channels.private[channelId]
  if (!channel) return state
  if (!channel.connectedInstances.includes(instanceId)) return state

  return produce(state, draft => {
    const privateChannel = draft.channels.private[channelId]
    if (privateChannel) {
      privateChannel.addContextListenerListeners[listenerId] = {
        listenerId,
        instanceId,
      }
    }
  })
}

export const removePrivateChannelAddContextListenerListener = (
  state: AgentState,
  channelId: string,
  listenerId: string,
): AgentState => {
  const channel = state.channels.private[channelId]
  if (!channel) return state

  return produce(state, draft => {
    const privateChannel = draft.channels.private[channelId]
    if (privateChannel) {
      delete privateChannel.addContextListenerListeners[listenerId]
    }
  })
}

export const addPrivateChannelUnsubscribeListener = (
  state: AgentState,
  channelId: string,
  listenerId: string,
  instanceId: string,
): AgentState => {
  const channel = state.channels.private[channelId]
  if (!channel) return state
  if (!channel.connectedInstances.includes(instanceId)) return state

  return produce(state, draft => {
    const privateChannel = draft.channels.private[channelId]
    if (privateChannel) {
      privateChannel.unsubscribeListeners[listenerId] = {
        listenerId,
        instanceId,
      }
    }
  })
}

export const removePrivateChannelUnsubscribeListener = (
  state: AgentState,
  channelId: string,
  listenerId: string,
): AgentState => {
  const channel = state.channels.private[channelId]
  if (!channel) return state

  return produce(state, draft => {
    const privateChannel = draft.channels.private[channelId]
    if (privateChannel) {
      delete privateChannel.unsubscribeListeners[listenerId]
    }
  })
}

export const removePrivateChannelContextListener = (
  state: AgentState,
  channelId: string,
  listenerId: string,
): AgentState => {
  const channel = state.channels.private[channelId]
  if (!channel) return state

  return produce(state, draft => {
    const privateChannel = draft.channels.private[channelId]
    if (privateChannel) {
      delete privateChannel.contextListeners[listenerId]
    }
  })
}

export const addPrivateChannelDisconnectListener = (
  state: AgentState,
  channelId: string,
  listenerId: string,
  instanceId: string,
): AgentState => {
  const channel = state.channels.private[channelId]
  if (!channel) return state
  if (!channel.connectedInstances.includes(instanceId)) return state

  return produce(state, draft => {
    const privateChannel = draft.channels.private[channelId]
    if (privateChannel) {
      privateChannel.disconnectListeners[listenerId] = {
        listenerId,
        instanceId,
      }
    }
  })
}

export const removePrivateChannelDisconnectListener = (
  state: AgentState,
  channelId: string,
  listenerId: string,
): AgentState => {
  const channel = state.channels.private[channelId]
  if (!channel) return state

  return produce(state, draft => {
    const privateChannel = draft.channels.private[channelId]
    if (privateChannel) {
      delete privateChannel.disconnectListeners[listenerId]
    }
  })
}

export const setPrivateChannelLastContext = (
  state: AgentState,
  channelId: string,
  contextType: string,
  context: Context,
): AgentState => {
  const channel = state.channels.private[channelId]
  if (!channel) return state

  return produce(state, draft => {
    const privateChannel = draft.channels.private[channelId]
    if (privateChannel) {
      privateChannel.lastContextByType[contextType] = context
    }
  })
}
