import { FDC3App } from './FDC3Data';
import { Context, AppIdentifier } from '@finos/fdc3';
import { RuntimeMessage } from '/@/handlers/runtimeMessage';
import { AppMetadata } from 'fdc3-1.2';
import { ChannelData } from './Channel';

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
  | FindIntentData
  | FindIntentContextData
  | OpenData
  | RaiseIntentData
  | RaiseIntentContextData
  | ResolveIntentData
  | IntentResultData
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
  target: TargetIdentifier;
  context?: Context | undefined;
}

/*
  describe data for raiseIntent API
*/
export interface RaiseIntentData {
  intent: string;
  context?: Context | undefined;
  target?: TargetIdentifier | undefined;
}

/*
  describe data for raiseIntentForContext API
*/
export interface RaiseIntentContextData {
  context: Context;
  target?: TargetIdentifier | undefined;
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
  result?: ChannelData | Context | null;
}

/*
    abstraction over 1.2 TargetApp and 2.0 AppIdentifier
*/
export interface TargetIdentifier {
  key: string; //either name or appId
  name?: string;
  appId?: string;
  appMetadata?: AppMetadata;
  appIdentifier?: AppIdentifier;
}

export interface FDC3Response {
  error?: string;
  data: any;
  topic: string;
}
