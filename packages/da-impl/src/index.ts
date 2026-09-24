import {
  InstanceID,
  State,
  AppRegistration,
  Fdc3ApiVersion,
} from "./AppRegistration"
import {
  ChannelState,
  ChannelType,
  ContextListenerRegistration,
  PrivateChannelEventListener,
  DesktopAgentEventListener,
  IntentListenerRegistration,
  FDC3ServerInstance,
  HandlersByVersion,
  StoredContext,
  StoredContextMetadata,
} from "./FDC3ServerInstance"
import { PendingApp, AppState } from "./PendingApp"
import {
  Directory,
  DirectoryApp,
  DirectoryIntent,
  WebAppDetails,
} from "./directory/DirectoryInterface"
import { BasicDirectory } from "./directory/BasicDirectory"
import {
  BroadcastHandler as BroadcastHandlerV2,
  IntentHandler as IntentHandlerV2,
  OpenHandler as OpenHandlerV2,
  HeartbeatHandler as HeartbeatHandlerV2,
} from "./handlers/v2"
import {
  BroadcastHandler as BroadcastHandlerV3,
  IntentHandler as IntentHandlerV3,
  OpenHandler as OpenHandlerV3,
  HeartbeatHandler as HeartbeatHandlerV3,
} from "./handlers/v3"
import { LogFunction, MessageHandler } from "./handlers/MessageHandler"
import { AbstractFDC3ServerInstance } from "./AbstractFDC3ServerInstance"
import {
  FDC3ServerInstanceEvent,
  ChannelChangedServerInstanceEvent,
  PrivateChannelDisconnectServerInstanceEvent,
  ShutdownServerInstanceEvent,
} from "./FDC3ServerInstanceEvents"

// Default exports keep prior names pointing at v2 for backward compatibility
export {
  type InstanceID,
  type Fdc3ApiVersion,
  type FDC3ServerInstance,
  type HandlersByVersion,
  type StoredContext,
  type StoredContextMetadata,
  State,
  type AppRegistration,
  type ChannelState,
  ChannelType,
  type ContextListenerRegistration,
  type PrivateChannelEventListener,
  type DesktopAgentEventListener,
  type IntentListenerRegistration,
  AbstractFDC3ServerInstance,
  type Directory,
  BasicDirectory,
  type DirectoryApp,
  type DirectoryIntent,
  BroadcastHandlerV2 as BroadcastHandler,
  IntentHandlerV2 as IntentHandler,
  OpenHandlerV2 as OpenHandler,
  HeartbeatHandlerV2 as HeartbeatHandler,
  BroadcastHandlerV2,
  IntentHandlerV2,
  OpenHandlerV2,
  HeartbeatHandlerV2,
  BroadcastHandlerV3,
  IntentHandlerV3,
  OpenHandlerV3,
  HeartbeatHandlerV3,
  type MessageHandler,
  type LogFunction,
  PendingApp,
  AppState,
  type WebAppDetails,
  type FDC3ServerInstanceEvent,
  PrivateChannelDisconnectServerInstanceEvent,
  ChannelChangedServerInstanceEvent,
  ShutdownServerInstanceEvent,
}
