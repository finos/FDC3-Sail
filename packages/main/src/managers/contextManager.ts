/**
 *  manages state of view context and listeners including
 * context broadcast
 * intents
 * channels
 * appInstances
 *
 *
 * collections:
 *
 * contexts
 *  - context state of each channel (including 'default')
 *
 * contextListeners
 *  - listeners from views
 *  - contextType
 *  - channel
 *  - instance
 *
 * pending
 *  - context pending a view before its content loads
 *
 * channels
 *  - app channels
 *  - is this for a channel manager?
 *
 *
 *
 */

import { Context } from '@finos/fdc3';
import { channels } from '../system-channels';
import { Runtime } from '../runtime';
import { getRuntime } from '../index';
/**
 *
 * @param context
 * @param target
 *
 * If no target is specified
 *
 */
export const broadcast = (sourceId: string, context: Context) => {
  const runtime = getRuntime();
  if (runtime) {
    const views = runtime.getViews();
    views.forEach((view, viewId) => {
      if (sourceId !== viewId) {
        view.content.webContents.postMessage('FDC3:context', context);
      }
    });
  }
};

/**
 * represents an event listener
 */
interface Listener {
  appId: string;
  contextType?: string;
  isChannel?: boolean;
  listenerId: string;
}

// map of all running contexts keyed by channel
const contexts: Map<string, Array<Context>> = new Map([['default', []]]);

//map of listeners for each context channel
const contextListeners: Map<string, Map<string, Listener>> = new Map([
  ['default', new Map()],
]);

export class ContextManager {
  constructor(runtime: Runtime) {
    this.runtime = runtime;

    //initialize the active channels
    //need to map channel membership to tabs, listeners to apps, and contexts to channels
    channels.forEach((chan) => {
      contextListeners.set(chan.id, new Map());
      contexts.set(chan.id, []);
    });
  }

  runtime: Runtime;

  getContextListeners() {
    return contextListeners;
  }
}

/**
 *
 * drop all of the listeners for an app (when disconnecting)
 */
/*const dropContextListeners = (appId: string) => {
  //iterate through the listeners dictionary and delete any associated with the tab (appId)
  Object.keys(contextListeners).forEach((channel) => {
    const channelMap = contextListeners.get(channel);
    if (channelMap) {
      channelMap.forEach((listener, key) => {
        if (listener.appId === appId) {
          channelMap.delete(key);
        }
      });
    }
  });
};

const setIntentListener = (
  intent: string,
  listenerId: string,
  appId: string,
) => {
  if (!intentListeners.has(intent)) {
    intentListeners.set(intent, new Map());
  }
  const listener = intentListeners.get(intent);
  if (listener) {
    listener.set(listenerId, { appId: appId, listenerId: listenerId });
  }
};*/

/** pending handlers */
/*
export const setPendingContext = function (
  viewId: string,
  source: string,
  context: Context,
) {
  console.log("set pending context", viewId, context);
  pending_contexts.push(new Pending(viewId, source, { context: context }));
};
*/
/*
const getTabChannel = (id: number): string | null => {
  return tabChannels.get(id) || null;
};*/
