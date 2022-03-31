import { FDC3Message } from './FDC3Message';
import { ChannelData } from './FDC3Data';
import { Runtime } from '../runtime';
import { Context, AppIntent, IntentResolution } from '@finos/fdc3';

export interface Listener {
  name: string;
  handler: (
    runtime: Runtime,
    msg: FDC3Message,
  ) => Promise<
    | void
    | null
    | boolean
    | Context
    | ChannelData
    | Array<ChannelData>
    | AppIntent
    | Array<AppIntent>
    | IntentResolution
  >;
}
