/**
 * Utility functions for constructing DACP messages
 * Used by Sail UI to send messages on behalf of app instances
 */

/**
 * Create a joinUserChannelRequest DACP message
 */
export function createJoinUserChannelRequest(channelId: string) {
  return {
    type: "joinUserChannelRequest" as const,
    payload: {
      channelId,
    },
    meta: {
      requestUuid: crypto.randomUUID(),
      timestamp: new Date(),
    },
  }
}

/**
 * Create a leaveCurrentChannelRequest DACP message
 */
export function createLeaveCurrentChannelRequest() {
  return {
    type: "leaveCurrentChannelRequest" as const,
    payload: {},
    meta: {
      requestUuid: crypto.randomUUID(),
      timestamp: new Date(),
    },
  }
}
