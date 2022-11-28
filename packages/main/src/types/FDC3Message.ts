import { FDC3App } from './FDC3Data';
import { Context, AppIdentifier } from '@finos/fdc3';
import { RuntimeMessage } from '../handlers/runtimeMessage';
import { TargetApp } from 'fdc3-1.2';

export interface FDC3Message extends RuntimeMessage {
  data: FDC3MessageData;
}

export interface FDC3MessageData {
  id?: string;
  appIdentifier?: AppIdentifier;
  eventId?: string;
  context?: Context;
  name?: string;
  intent?: string;
  source?: string; //the viewId (internal instance identifier) of the sender of the message
  channel?: string; //name of source/related channel
  contextType?: string;
  instanceId?: string;
  ts?: number; //timestamp (for pending contexts/intents)
  target?: TargetApp;
  channelId?: string; //to do : refactor with channel prop
  type?: string;
  restoreOnly?: boolean;
  selectedIntent?: string;
  selected?: FDC3App;
}

export interface FDC3Response {
  error?: string;
  data: any;
  topic: string;
}
