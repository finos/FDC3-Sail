import { FDC3App, SailChannelData } from './FDC3Data';

import {
  Context as Context2_0,
  IntentMetadata as IntentMetadata2_0,
  DisplayMetadata as DisplayMetadata2_0,
} from 'fdc3-2.0';



import { RuntimeMessage } from '/@/handlers/runtimeMessage';
import { DirectoryApp } from '../directory/directory';

// Context is the same in 1.2 and 2.0
export type Context = Context2_0;

export interface FDC3Message extends RuntimeMessage {
  topic: string;
  source: string;
  data: FDC3MessageData;
  eventId: string;
}

export type FDC3MessageData =
  | ContextListenerData
  | IntentListenerData
  | BroadcastData
  | CurrentContextData
  | ChannelMessageData
  | ListenerMessageData
  | FindInstancesData
  | FindIntentData
  | FindIntentContextData
  | OpenData
  | RaiseIntentData
  | RaiseIntentContextData
  | ResolveIntentData
  | IntentResultData
  | AppIdData
  | EmptyMessage;

export interface EmptyMessage {
  context?: Context;
}

/*
  describes data for creating a context listener
*/
export interface ContextListenerData {
  listenerId: string;
  contextType?: string;
  channel?: string; //id of channel scope (if scoped)
}

/*
  describes data for creating an intent listener
*/
export interface IntentListenerData {
  listenerId: string;
  intent: string;
}

/*
  describes data for a broadcast message
*/
export interface BroadcastData {
  context: Context;
  channel?: string; //id of channel scope (if scoped)
}

/*
  describes data for a getCurrentContext message
*/
export interface CurrentContextData {
  contextType?: string;
  channel: string; //id of channel scope
}

/*
  describes data for a message only identifiying a channel (e.g. joinChannel, getOrCreateChannel)
*/
export interface ChannelMessageData {
  channel: string; //id of channel scope
}

/*
  describes data for identifiying a listener 
*/
export interface ListenerMessageData {
  listenerId: string;
}

/*
  describes data for identifiying a listener scoped to a channel
*/
export interface ChannelListenerData {
  listenerId: string;
  channel: string;
}

export interface FindInstancesData {
  app: SailTargetIdentifier;
}

/*
  descibes data for the find intent API
*/
export interface FindIntentData {
  intent: string;
  context?: Context;
  resultType?: string; //2.0 only
}

/*
  descibes data for the find intent by context API
*/
export interface FindIntentContextData {
  context: Context;
  resultType?: string; //2.0 only
}

/*
  describe data for the open API
*/
export interface OpenData {
  target: SailTargetIdentifier;
  context?: Context | undefined;
}

/*
  describe data for raiseIntent API
*/
export interface RaiseIntentData {
  intent: string;
  context?: Context | undefined;
  fdc3Version: string;
  target?: SailTargetIdentifier | undefined;
}

/*
  describe data for raiseIntentForContext API
*/
export interface RaiseIntentContextData {
  context: Context;
  target?: SailTargetIdentifier | undefined;
}

/*
  data for intent resolution (from the end user)
*/
export interface ResolveIntentData {
  selected: FDC3App;
  intent: string;
  context?: Context | undefined;
}

/*
  data for retrieving/setting an intent result
*/
export interface IntentResultData {
  resultId: string;
  type: "channel" | "context";
  result?: SailChannelData | Context | null;
}

export interface AppIdData {
  app: SailTargetIdentifier
}

// same in 2.0 and 1.2
export type IntentMetadata = IntentMetadata2_0;

// same in 2.0 and 1.2
export type DisplayMetadata = DisplayMetadata2_0;

export interface SailAppIntent {
  intent: IntentMetadata;
  apps: DirectoryApp[];
}

/*
    abstraction over 1.2 TargetApp and 2.0 AppIdentifier
*/
export interface SailTargetIdentifier {
  name?: string;
  appId?: string;
  instanceId?: string;
  appMetadata?: DirectoryApp;
}

export interface FDC3Response {
  error?: string;
  data: object;
  topic: string;
}
