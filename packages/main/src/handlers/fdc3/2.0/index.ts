import { getAppId, getAppMetadata } from '../lib/metadata';
import { FDC3_2_0_TOPICS } from './topics';
import { Runtime } from '/@/runtime';

import { findInstances } from './findInstances';
import {
  createPrivateChannel,
  disconnect,
  onAddContextListener,
  onDisconnect,
  onUnsubscribe,
} from './channels';
import { resultCreated } from '../lib/results';
import { FDC3_TOPICS_RESULT_CREATED } from '../topics';

export const register = (runtime: Runtime) => {
  runtime.addHandler(FDC3_2_0_TOPICS.GET_APP_METADATA, getAppMetadata);
  runtime.addHandler(FDC3_2_0_TOPICS.FIND_INSTANCES, findInstances);
  runtime.addHandler(FDC3_2_0_TOPICS.GET_APP_ID, getAppId);
  runtime.addHandler(
    FDC3_2_0_TOPICS.CREATE_PRIVATE_CHANNEL,
    createPrivateChannel,
  );
  runtime.addHandler(FDC3_TOPICS_RESULT_CREATED, resultCreated);
  runtime.addHandler(
    FDC3_2_0_TOPICS.ADD_ONADDCONTEXT_LISTENER,
    onAddContextListener,
  );
  runtime.addHandler(FDC3_2_0_TOPICS.ADD_ONUNSUBSCRIBE_LISTENER, onUnsubscribe);
  runtime.addHandler(FDC3_2_0_TOPICS.ADD_ONDISCONNECT_LISTENER, onDisconnect);
  runtime.addHandler(FDC3_2_0_TOPICS.PRIVATE_CHANNEL_DISCONNECT, disconnect);
};
