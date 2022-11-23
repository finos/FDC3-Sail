import { Runtime } from '/@/runtime';
import { FDC3_2_0_TOPICS } from './topics';
import {
  getCurrentContext,
  getOrCreateChannel,
  getUserChannels,
  getSystemChannels,
  leaveCurrentChannel,
  joinUserChannel,
  getCurrentChannel,
} from './channels';

//1.2...
import {
  dropContextListener,
  addContextListener,
} from '/@/handlers/fdc3/1.2/contextListeners';
import { broadcast } from '/@/handlers/fdc3/1.2/broadcast';
import { open } from './open';
import {
  dropIntentListener,
  addIntentListener,
} from '/@/handlers/fdc3/2.0/intentListeners';
import {
  findIntent,
  findIntentsByContext,
} from '/@/handlers/fdc3/1.2/findIntent';

import {
  raiseIntent,
  raiseIntentForContext,
  resolveIntent,
} from './raiseIntent';

export const register = (runtime: Runtime) => {
  runtime.addHandler(FDC3_2_0_TOPICS.GET_CURRENT_CONTEXT, getCurrentContext);
  runtime.addHandler(FDC3_2_0_TOPICS.GET_OR_CREATE_CHANNEL, getOrCreateChannel);
  runtime.addHandler(FDC3_2_0_TOPICS.GET_USER_CHANNELS, getUserChannels);
  runtime.addHandler(FDC3_2_0_TOPICS.GET_SYSTEM_CHANNELS, getSystemChannels);
  runtime.addHandler(
    FDC3_2_0_TOPICS.LEAVE_CURRENT_CHANNEL,
    leaveCurrentChannel,
  );
  runtime.addHandler(FDC3_2_0_TOPICS.JOIN_USER_CHANNEL, joinUserChannel);
  runtime.addHandler(FDC3_2_0_TOPICS.JOIN_CHANNEL, joinUserChannel);
  runtime.addHandler(FDC3_2_0_TOPICS.GET_CURRENT_CHANNEL, getCurrentChannel);

  //1.2
  runtime.addHandler(
    FDC3_2_0_TOPICS.DROP_CONTEXT_LISTENER,
    dropContextListener,
  );
  runtime.addHandler(FDC3_2_0_TOPICS.ADD_CONTEXT_LISTENER, addContextListener);
  runtime.addHandler(FDC3_2_0_TOPICS.BROADCAST, broadcast);
  runtime.addHandler(FDC3_2_0_TOPICS.OPEN, open);
  runtime.addHandler(FDC3_2_0_TOPICS.ADD_INTENT_LISTENER, addIntentListener);
  runtime.addHandler(FDC3_2_0_TOPICS.DROP_INTENT_LISTENER, dropIntentListener);
  runtime.addHandler(FDC3_2_0_TOPICS.FIND_INTENT, findIntent);
  runtime.addHandler(
    FDC3_2_0_TOPICS.FIND_INTENTS_BY_CONTEXT,
    findIntentsByContext,
  );
  runtime.addHandler(FDC3_2_0_TOPICS.RAISE_INTENT, raiseIntent);
  runtime.addHandler(FDC3_2_0_TOPICS.RESOLVE_INTENT, resolveIntent);
  runtime.addHandler(
    FDC3_2_0_TOPICS.RAISE_INTENT_FOR_CONTEXT,
    raiseIntentForContext,
  );
};
