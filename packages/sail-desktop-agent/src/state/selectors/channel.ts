/**
 * Channel Selectors
 *
 * Pure functions for querying channel-related state.
 */

import type { Context, BrowserTypes } from "@finos/fdc3"
import type { AgentState, PrivateChannelState, StoredContext } from "../types"

export const getUserChannel = (
  state: AgentState,
  channelId: string,
): BrowserTypes.Channel | undefined => state.channels.user[channelId]

export const getAllUserChannels = (state: AgentState): BrowserTypes.Channel[] =>
  Object.values(state.channels.user)

export const getAppChannel = (
  state: AgentState,
  channelId: string,
): BrowserTypes.Channel | undefined => state.channels.app[channelId]

export const getAllAppChannels = (state: AgentState): BrowserTypes.Channel[] =>
  Object.values(state.channels.app)

export const getPrivateChannel = (
  state: AgentState,
  channelId: string,
): PrivateChannelState | undefined => state.channels.private[channelId]

export const getAllPrivateChannels = (state: AgentState): PrivateChannelState[] =>
  Object.values(state.channels.private)

export const getChannelContext = (
  state: AgentState,
  channelId: string,
  contextType?: string,
): Context | null => {
  const channelContexts = state.channels.contexts[channelId]
  if (!channelContexts) return null

  if (contextType) {
    return channelContexts[contextType]?.context ?? null
  }

  // Return most recent context
  const allContexts = Object.values(channelContexts)
  if (allContexts.length === 0) return null
  return allContexts.reduce((latest, current) => {
    if (current.timestampMs !== latest.timestampMs) {
      return current.timestampMs > latest.timestampMs ? current : latest
    }
    return current.sequence > latest.sequence ? current : latest
  }).context
}

export const getStoredContext = (
  state: AgentState,
  channelId: string,
  contextType: string,
): StoredContext | null => {
  const channelContexts = state.channels.contexts[channelId]
  if (!channelContexts) return null
  return channelContexts[contextType] ?? null
}

export const getChannelContextTypes = (state: AgentState, channelId: string): string[] => {
  const channelContexts = state.channels.contexts[channelId]
  if (!channelContexts) return []
  return Object.keys(channelContexts)
}

export const hasChannelContext = (state: AgentState, channelId: string): boolean => {
  const channelContexts = state.channels.contexts[channelId]
  return channelContexts !== undefined && Object.keys(channelContexts).length > 0
}
