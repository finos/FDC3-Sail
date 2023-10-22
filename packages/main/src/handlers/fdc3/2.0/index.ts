import { getAppId, getAppMetadata } from '../lib/metadata';
import { FDC3_2_0_TOPICS } from './topics';
import { Runtime } from '/@/runtime';

import { findInstances } from './findInstances'
import { createPrivateChannel } from './channels';
import { FDC3_TOPICS } from '../topics';
import { resultCreated } from '../lib/results';

export const register = (runtime: Runtime) => {
        runtime.addHandler(FDC3_2_0_TOPICS.GET_APP_METADATA, getAppMetadata);
        runtime.addHandler(FDC3_2_0_TOPICS.FIND_INSTANCES, findInstances);
        runtime.addHandler(FDC3_2_0_TOPICS.GET_APP_ID, getAppId);
        runtime.addHandler(FDC3_2_0_TOPICS.CREATE_PRIVATE_CHANNEL, createPrivateChannel);
        runtime.addHandler(FDC3_TOPICS.RESULT_CREATED, resultCreated);
};
