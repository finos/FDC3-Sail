/**
 * Channel Control Interface
 *
 * Defines the contract for host-owned channel selection when the platform
 * controls channel chrome (i.e., channelSelectorUrl returns false in WCP handshake).
 */

import type { Channel } from "@finos/fdc3"

/**
 * Request for channel selection
 */
export interface ChannelSelectionRequest {
  /** The instance ID of the app requesting channel selection */
  instanceId: string

  /** The app ID */
  appId: string

  /** Currently selected channel (null if none) */
  currentChannel: string | null

  /** Available channels to choose from */
  availableChannels: Channel[]
}

/**
 * Channel Control Interface
 *
 * Implementations provide UI for users to select a channel for an app.
 * This is used when the platform controls the channel selector UI
 * (i.e., channelSelectorUrl returns false in WCP handshake).
 *
 * @example
 * ```typescript
 * const channelControl: ChannelControl = {
 *   selectChannel: async (request) => {
 *     // Show channel dropdown/dialog
 *     const selected = await showChannelPicker(request)
 *     return selected?.id ?? null
 *   }
 * }
 * ```
 */
export interface ChannelControl {
  /**
   * Called when user needs to select a channel for an app.
   *
   * @param request - The selection request with available channels
   * @returns The selected channel ID, or null to leave/not join a channel
   */
  selectChannel(request: ChannelSelectionRequest): Promise<string | null>
}
