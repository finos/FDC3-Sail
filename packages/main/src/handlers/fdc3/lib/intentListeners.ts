import { getRuntime } from '/@/index';
import { FDC3_TOPICS } from '../topics';
import {
  FDC3Message,
  ListenerMessageData,
  IntentListenerData,
} from '/@/types/FDC3Message';

export const dropIntentListener = async (message: FDC3Message) => {
  const runtime = getRuntime();
  const data: ListenerMessageData = message.data as ListenerMessageData;
  const id = data.listenerId;
  const view = runtime.getView(message.source);
  if (view && id) {
    view.listeners = view.listeners.filter((l) => {
      return l.listenerId !== id;
    });
  }
};

//wait 2 minutes for pending intents to connect
const pendingTimeout: number = 2 * 60 * 1000;

export const addIntentListener = async (message: FDC3Message) => {
  const runtime = getRuntime();
  const data: IntentListenerData = message.data as IntentListenerData;
  const intent = data.intent;
  const listenerId = data.listenerId;
  const view = runtime.getView(message.source);

  if (intent && listenerId && view) {
    runtime.setIntentListener(intent, listenerId, message.source);

    //check for pending intents
    const pending_intents = view.getPendingIntents();
    if (pending_intents.length > 0) {
      //first cleanup anything old
      const n = Date.now();

      //next, match on tab and intent
      pending_intents.forEach((pIntent, index) => {
        if (n - pIntent.ts < pendingTimeout && pIntent.intent === intent) {
          //refactor with other instances of this logic
          if (view && view.content) {
            const topic =FDC3_TOPICS.INTENT
            view.content.webContents.send(topic, {
              topic: topic,
              data: {
                intent: pIntent.intent,
                context: pIntent.context,
                resultId: pIntent.resultId,
              },
              source: pIntent.source,
            });
          }

          //remove the applied intent
          view.removePendingIntent(index);
        }
      });
    }

    return;
  }
};
/*
export const intentListenerCalled = async (message: FDC3Message) => {
  const runtime = getRuntime();
  const data: ListenerMessageData = message.data as ListenerMessageData;
  //get the listener
  
  //is there a pending intent for the listener?

  //if so, then resolve it and remove the pending intent
};
*/
