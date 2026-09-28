/**
 * Mutators Index
 *
 * Re-exports all mutator functions for convenient importing.
 */

// Instance mutators
export {
  connectInstance,
  updateInstanceState,
  updateInstanceActivity,
  removeInstance,
  joinUserChannel,
  addContextListener,
  removeContextListener,
  addPrivateChannel,
  removePrivateChannel,
} from "./instance"

// Intent mutators
export {
  registerIntentListener,
  unregisterIntentListener,
  removeListenersForInstance,
  updateIntentListenerActivity,
  setIntentListenerActive,
  addPendingIntent,
  updatePendingIntentTarget,
  markPendingIntentDelivered,
  resolvePendingIntent,
} from "./intent"

// Channel mutators
export { createAppChannel, removeAppChannel, storeContext, clearChannelContexts } from "./channel"

// App directory mutators
export {
  addApp,
  addApplications,
  addDirectoryUrl,
  loadDirectoryIntoState,
  replaceDirectoriesInState,
  removeDirectoryUrl,
  clearDirectoryUrls,
} from "./app-directory"

// Private channel mutators
export {
  createPrivateChannel,
  connectInstanceToPrivateChannel,
  disconnectInstanceFromPrivateChannel,
  addPrivateChannelContextListener,
  addPrivateChannelAddContextListenerListener,
  removePrivateChannelAddContextListenerListener,
  addPrivateChannelUnsubscribeListener,
  removePrivateChannelUnsubscribeListener,
  removePrivateChannelContextListener,
  addPrivateChannelDisconnectListener,
  removePrivateChannelDisconnectListener,
  addPrivateChannelLifecycleCatchAllListener,
  removePrivateChannelLifecycleCatchAllListener,
  setPrivateChannelLastContext,
} from "./private-channel"

// Event mutators
export { addEventListener, removeEventListener, removeEventListenersForInstance } from "./event"

// Heartbeat mutators
export {
  startHeartbeat,
  acknowledgeHeartbeat,
  updateHeartbeatSent,
  stopHeartbeat,
} from "./heartbeat"

// Open-with-context mutators
export {
  addPendingOpenWithContext,
  setPendingOpenWithContextForInstance,
  removePendingOpenWithContextByRequest,
  migratePendingOpenWithContextTarget,
} from "./open-with-context"

export {
  linkHandshakeRoutingId,
  clearHandshakeRoutingIdsForInstance,
} from "./wcp-handshake-routing"
