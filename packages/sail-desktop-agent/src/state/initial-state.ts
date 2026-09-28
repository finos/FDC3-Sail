/**
 * Initial State Factory
 *
 * Creates the default agent state with all required structures initialized.
 */

import type { AgentState } from "./types"
import type { BrowserTypes } from "@finos/fdc3"

/**
 * Creates the initial agent state with default values.
 * @param userChannels - Custom user channels (required - DesktopAgent provides defaults)
 */
export function createInitialState(userChannels: BrowserTypes.Channel[]): AgentState {
  const channels = userChannels

  return {
    instances: {},
    nextInstanceSequence: 0,
    intents: {
      listeners: {},
      pending: {},
    },
    channels: {
      user: Object.fromEntries(channels.map(channel => [channel.id, channel])),
      app: {},
      private: {},
      contexts: {},
    },
    events: {
      listeners: {},
      byEventType: {},
    },
    heartbeats: {},
    open: {
      pendingWithContext: {},
    },
    appDirectory: {
      apps: [],
      directoryUrls: [],
    },
    wcpHandshakeRouting: {
      handshakeRoutingIdToInstanceId: {},
    },
  }
}

/**
 * Merges partial state into initial state (for testing/initialization).
 * @param overrides - Partial state to merge
 * @param userChannels - User channels to use (required - DesktopAgent provides defaults)
 */
export function createStateWithOverrides(
  overrides: Partial<AgentState>,
  userChannels: BrowserTypes.Channel[],
): AgentState {
  return deepMerge(createInitialState(userChannels), overrides)
}

/**
 * Deep merges source into target, recursively merging nested objects.
 * Arrays and non-object values from source replace target values.
 * This could be replaced with a more robust merge function from lodash if needed.
 */
function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target }
  for (const key of Object.keys(source) as (keyof T)[]) {
    const sourceVal = source[key]
    const targetVal = target[key]
    if (
      sourceVal &&
      typeof sourceVal === "object" &&
      !Array.isArray(sourceVal) &&
      targetVal &&
      typeof targetVal === "object" &&
      !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(targetVal, sourceVal as Partial<typeof targetVal>)
    } else if (sourceVal !== undefined) {
      result[key] = sourceVal as T[keyof T]
    }
  }
  return result
}
