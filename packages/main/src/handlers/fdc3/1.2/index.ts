import { Runtime } from '/@/runtime';
import {
  dropContextListener,
  addContextListener,
} from '../lib/contextListeners';
import { broadcast } from '../lib/broadcast';
import { open } from '../lib/open';
//import { FDC3_1_2_TOPICS } from './topics';
import { FDC3_2_0_TOPICS } from '../2.0/topics';
import {
  getCurrentContext,
  getOrCreateChannel,
  getSystemChannels,
  leaveCurrentChannel,
  joinChannel,
  getCurrentChannel,
} from '../lib/channels';
import { dropIntentListener, addIntentListener } from '../lib/intentListeners';
import { findIntent, findIntentsByContext } from '../lib/findIntent';
import { resolveIntent } from '../lib/resolveIntent';
import { raiseIntent, raiseIntentForContext } from '../lib/raiseIntent';

export const register = (runtime: Runtime) => {
  runtime.addHandler(
    FDC3_2_0_TOPICS.DROP_CONTEXT_LISTENER,
    dropContextListener,
  );
  runtime.addHandler(FDC3_2_0_TOPICS.ADD_CONTEXT_LISTENER, addContextListener);
  runtime.addHandler(FDC3_2_0_TOPICS.BROADCAST, broadcast);
  runtime.addHandler(FDC3_2_0_TOPICS.OPEN, open);
  runtime.addHandler(FDC3_2_0_TOPICS.GET_CURRENT_CONTEXT, getCurrentContext);
  runtime.addHandler(FDC3_2_0_TOPICS.GET_OR_CREATE_CHANNEL, getOrCreateChannel);
  runtime.addHandler(FDC3_2_0_TOPICS.GET_USER_CHANNELS, getSystemChannels);
  runtime.addHandler(
    FDC3_2_0_TOPICS.LEAVE_CURRENT_CHANNEL,
    leaveCurrentChannel,
  );
  runtime.addHandler(FDC3_2_0_TOPICS.JOIN_CHANNEL, joinChannel);
  runtime.addHandler(FDC3_2_0_TOPICS.GET_CURRENT_CHANNEL, getCurrentChannel);
  runtime.addHandler(FDC3_2_0_TOPICS.ADD_INTENT_LISTENER, addIntentListener);
  runtime.addHandler(FDC3_2_0_TOPICS.DROP_INTENT_LISTENER, dropIntentListener);
  runtime.addHandler(FDC3_2_0_TOPICS.FIND_INTENT, findIntent);
  runtime.addHandler(
    FDC3_2_0_TOPICS.FIND_INTENTS_BY_CONTEXT,
    findIntentsByContext,
  );
  runtime.addHandler(FDC3_2_0_TOPICS.RAISE_INTENT, raiseIntent);
  runtime.addHandler(
    FDC3_2_0_TOPICS.RAISE_INTENT_FOR_CONTEXT,
    raiseIntentForContext,
  );
  runtime.addHandler(FDC3_2_0_TOPICS.RESOLVE_INTENT, resolveIntent);
};
