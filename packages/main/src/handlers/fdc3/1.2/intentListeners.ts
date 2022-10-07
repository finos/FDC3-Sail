import { getRuntime } from '/@/index';
import { RuntimeMessage } from '/@/handlers/runtimeMessage';
import { FDC3_TOPICS } from './topics';

export const dropIntentListener = async (message: RuntimeMessage) => {
  const runtime = getRuntime();
  const id = message.data?.id;
  const view = runtime.getView(message.source);
  if (view && id) {
    view.listeners = view.listeners.filter((l) => {
      return l.listenerId !== id;
    });
  }
};

//wait 2 minutes for pending intents to connect
const pendingTimeout: number = 2 * 60 * 1000;

export const addIntentListener = async (message: RuntimeMessage) => {
  const runtime = getRuntime();
  const name = message.data && message.data.intent;
  const listenerId = message.data && message.data.id;
  const view = runtime.getView(message.source);

  if (name && listenerId && view) {
    runtime.setIntentListener(name, listenerId, message.source);

    //check for pending intents
    const pending_intents = view.getPendingIntents();
    if (pending_intents.length > 0) {
      //first cleanup anything old
      const n = Date.now();

      //next, match on tab and intent
      pending_intents.forEach((pIntent, index) => {
        if (n - pIntent.ts < pendingTimeout && pIntent.intent === name) {
          console.log('applying pending intent', pIntent);
          //refactor with other instances of this logic
          if (view && view.content) {
            view.content.webContents.send(FDC3_TOPICS.INTENT, {
              topic: 'intent',
              data: {
                intent: pIntent.intent,
                context: pIntent.context,
              },
              source: pIntent.source,
            });
          }
          //bringing the tab to front conditional on the type of intent
          /* if (! utils.isDataIntent(pIntent.intent)){
                                utils.bringToFront(port.sender.tab);
                            }*/
          //remove the applied intent
          view.removePendingIntent(index);
        }
      });
    }

    return;
  }
};
