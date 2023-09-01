import { fdc3Event } from "../lib/lib";
import { MessagingSupport } from "../message";
import { contextListeners, intentListeners } from "./listeners";
import { FDC3_2_0_TOPICS } from "/@main/handlers/fdc3/2.0/topics";
import { FDC3_TOPICS } from "/@main/handlers/fdc3/topics";
import { FDC3EventEnum } from "/@main/types/FDC3Event";
import { Context } from "/@main/types/FDC3Message";

const callIntentListener = (intent: string, context?: Context | undefined) => {
    if (intent) {
        const listeners = intentListeners.get(intent);
        const result = null;
        if (listeners) {
            listeners.forEach((l) => {
                if (l.handler && context) {
                    l.handler.call(document, context);
                }
            });
        }

        //emit return event
        document.dispatchEvent(
            fdc3Event(FDC3EventEnum.IntentComplete, { data: result }),
        );
    }
};

const callContextListener = (listenerId: string, context: Context) => {
    console.log('Context', JSON.stringify(contextListeners));
    const listeners = contextListeners;
    if (listeners.has(listenerId)) {
        const listener = listeners.get(listenerId);
        if (listener?.handler && context) {
            listener.handler.call(document, context);
        }
    }
};

export const connect = (ipc: MessagingSupport) => {
    /**
     * listen for incomming contexts
     */
    ipc.on(FDC3_TOPICS.CONTEXT, async (event, args) => {
        console.log('ipc event', event.type, args);
        //check for handlers at the content script layer (automatic handlers) - if not, dispatch to the API layer...
        //   let contextSent = false;

        if (args.data && args.data.context) {
            if (args.listenerIds) {
                const listeners: Array<string> = args.listenerIds;
                listeners.forEach((listenerId) => {
                    const context: Context = args.data.context as Context;
                    const lId = listenerId;
                    callContextListener(lId, context);
                });
            } else if (args.listenerId) {
                const data = args.data;
                callContextListener(args.listenerId, data.context as Context);
            }

            // }
        }
    });

    /**
     * listen for incoming intents
     */
    ipc.on(FDC3_TOPICS.INTENT, (event, args) => {
        callIntentListener(args.data.intent, args.data.context as Context);
    });

    ipc.on(FDC3_2_0_TOPICS.RESOLVE_INTENT, (event, args) => {
        console.log('ipc event', event.type);
        document.dispatchEvent(
            new CustomEvent(FDC3_2_0_TOPICS.RESOLVE_INTENT, {
                detail: { data: args.data, source: args.source },
            }),
        );
    });

    /**
     * listen for channel state update
     * to do: do we need this?
     */
    /*ipc.on(RUNT.SET_CURRENT_CHANEL, (event, args) => {
      console.log('ipc event', event.type);
      if (args.data.channel) {
        //  currentChannel = args.data.channel;
      }
    });*/
};


