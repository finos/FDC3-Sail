import { getAppMetadata } from '../lib/metadata';
import { FDC3_2_0_TOPICS } from './topics';
import { Runtime } from '/@/runtime';
// import { FDC3_2_0_TOPICS } from './topics';
// import {
//   getCurrentContext,
//   getOrCreateChannel,
//   getSystemChannels,
//   leaveCurrentChannel,
//   joinChannel,
//   getCurrentChannel,
// } from '../lib/channels';
// //1.2...
// import {
//   dropContextListener,
//   addContextListener,
// } from '/@/handlers/fdc3/lib/contextListeners';
// import { broadcast } from '/@/handlers/fdc3/lib/broadcast';
// import { open } from './open';
// import {
//   dropIntentListener,
//   addIntentListener,
// } from '/@/handlers/fdc3/lib/intentListeners';
// import {
//   findIntent,
//   findIntentsByContext,
// } from '/@/handlers/fdc3/lib/findIntent';
// import { resolveIntent } from '../lib/raiseIntent';
// import {
//   raiseIntent,
//   raiseIntentForContext,
//   getIntentResult,
//   setIntentResult,
// } from './raiseIntent';
// import { createPrivateChannel } from './channels';

import {findInstances } from './findInstances'

export const register = (runtime: Runtime) => {
        runtime.addHandler(FDC3_2_0_TOPICS.GET_APP_METADATA, getAppMetadata);
        runtime.addHandler(FDC3_2_0_TOPICS.FIND_INSTANCES, findInstances);
};

// export const register = (runtime: Runtime) => {
//   runtime.addHandler(FDC3_2_0_TOPICS.GET_CURRENT_CONTEXT, getCurrentContext);
//   runtime.addHandler(FDC3_2_0_TOPICS.GET_OR_CREATE_CHANNEL, getOrCreateChannel);
//   runtime.addHandler(FDC3_2_0_TOPICS.GET_USER_CHANNELS, getSystemChannels);
//   runtime.addHandler(
//     FDC3_2_0_TOPICS.LEAVE_CURRENT_CHANNEL,
//     leaveCurrentChannel,
//   );
//   runtime.addHandler(FDC3_2_0_TOPICS.JOIN_USER_CHANNEL, joinChannel);
//   runtime.addHandler(FDC3_2_0_TOPICS.JOIN_CHANNEL, joinChannel);
//   runtime.addHandler(FDC3_2_0_TOPICS.GET_CURRENT_CHANNEL, getCurrentChannel);
//   runtime.addHandler(
//     FDC3_2_0_TOPICS.CREATE_PRIVATE_CHANNEL,
//     createPrivateChannel,
//   );

//   //1.2
//   runtime.addHandler(
//     FDC3_2_0_TOPICS.DROP_CONTEXT_LISTENER,
//     dropContextListener,
//   );
//   runtime.addHandler(FDC3_2_0_TOPICS.ADD_CONTEXT_LISTENER, addContextListener);
//   runtime.addHandler(FDC3_2_0_TOPICS.BROADCAST, broadcast);
//   runtime.addHandler(FDC3_2_0_TOPICS.OPEN, open);
//   runtime.addHandler(FDC3_2_0_TOPICS.ADD_INTENT_LISTENER, addIntentListener);
//   runtime.addHandler(FDC3_2_0_TOPICS.DROP_INTENT_LISTENER, dropIntentListener);
//   runtime.addHandler(FDC3_2_0_TOPICS.FIND_INTENT, findIntent);
//   runtime.addHandler(
//     FDC3_2_0_TOPICS.FIND_INTENTS_BY_CONTEXT,
//     findIntentsByContext,
//   );
//   runtime.addHandler(FDC3_2_0_TOPICS.RAISE_INTENT, raiseIntent);
//   runtime.addHandler(FDC3_2_0_TOPICS.RESOLVE_INTENT, resolveIntent);
//   runtime.addHandler(FDC3_2_0_TOPICS.GET_INTENT_RESULT, getIntentResult);
//   runtime.addHandler(FDC3_2_0_TOPICS.SET_INTENT_RESULT, setIntentResult);
//   runtime.addHandler(
//     FDC3_2_0_TOPICS.RAISE_INTENT_FOR_CONTEXT,
//     raiseIntentForContext,
//   );
// };
