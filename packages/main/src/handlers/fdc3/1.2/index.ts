import { getRuntime } from '/@/index';
import { dropContextListener, addContextListener } from './contextListeners';
import { broadcast } from './broadcast';
import { open } from './open';
import { FDC3_TOPICS } from './topics';
import {
  getCurrentContext,
  getOrCreateChannel,
  getSystemChannels,
  leaveCurrentChannel,
  joinChannel,
  getCurrentChannel,
} from './channels';
import { dropIntentListener, addIntentListener } from './intentListeners';
import { findIntent, findIntentsByContext } from './findIntent';
import { raiseIntent, raiseIntentsForContext } from './raiseIntent';

export const register = () => {
  const runtime = getRuntime();

  runtime.addHandler(FDC3_TOPICS.DROP_CONTEXT_LISTENER, dropContextListener);
  runtime.addHandler(FDC3_TOPICS.ADD_CONTEXT_LISTENER, addContextListener);
  runtime.addHandler(FDC3_TOPICS.BROADCAST, broadcast);
  runtime.addHandler(FDC3_TOPICS.OPEN, open);
  runtime.addHandler(FDC3_TOPICS.GET_CURRENT_CONTEXT, getCurrentContext);
  runtime.addHandler(FDC3_TOPICS.GET_OR_CREATE_CHANNEL, getOrCreateChannel);
  runtime.addHandler(FDC3_TOPICS.GET_SYSTEM_CHANNELS, getSystemChannels);
  runtime.addHandler(FDC3_TOPICS.LEAVE_CURRENT_CHANNEL, leaveCurrentChannel);
  runtime.addHandler(FDC3_TOPICS.JOIN_CHANNEL, joinChannel);
  runtime.addHandler(FDC3_TOPICS.GET_CURRENT_CHANNEL, getCurrentChannel);
  runtime.addHandler(FDC3_TOPICS.ADD_INTENT_LISTENER, addIntentListener);
  runtime.addHandler(FDC3_TOPICS.DROP_INTENT_LISTENER, dropIntentListener);
  runtime.addHandler(FDC3_TOPICS.FIND_INTENT, findIntent);
  runtime.addHandler(FDC3_TOPICS.FIND_INTENTS_BY_CONTEXT, findIntentsByContext);
  runtime.addHandler(FDC3_TOPICS.RAISE_INTENT, raiseIntent);
  runtime.addHandler(
    FDC3_TOPICS.RAISE_INTENTS_FOR_CONTEXT,
    raiseIntentsForContext,
  );
};
