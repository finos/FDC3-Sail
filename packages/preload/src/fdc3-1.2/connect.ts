import { ContextMetadata, IntentResult } from "fdc3-2.0";
import { fdc3Event } from "../lib/lib";
import { MessagingSupport, SendMessage } from "../message";
import { getContextListeners, getIntentListeners } from "./listeners";
import { FDC3_2_0_TOPICS } from "/@main/handlers/fdc3/2.0/topics";
import { FDC3EventEnum } from "/@main/types/FDC3Event";
import { Context, IntentResultData } from "/@main/types/FDC3Message";
import { Channel } from "fdc3-1.2";
import { SailChannelData, SailContextMetadata } from "/@main/types/FDC3Data";
import { FDC3_TOPICS_CONTEXT, FDC3_TOPICS_INTENT, FDC3_TOPICS_RESULT_CREATED } from "/@main/handlers/fdc3/topics";

export const connect = (ipc: MessagingSupport, sendMessage: SendMessage) => {

    function sendChannelResult(res: Channel, meta: SailContextMetadata) {
        const ird : IntentResultData = {
            type: "channel",
            resultId: meta.resultId,
            result: {
                id: res.id,
                type: res.type,
                displayMetadata: res.displayMetadata
            } as SailChannelData
        }
        sendMessage(FDC3_TOPICS_RESULT_CREATED, ird);
    }

    function sendContextResult(res: Context, meta: SailContextMetadata) {
        const ird : IntentResultData = {
            type: "context",
            resultId: meta.resultId,
            result: res
        }
        sendMessage(FDC3_TOPICS_RESULT_CREATED, ird);
    }

    const callIntentListener = (intent: string, meta: SailContextMetadata, context?: Context | undefined, ) => {
        if (intent) {
            console.log('Intent (Connect)', getIntentListeners());
            console.log('Context (Connect)', getContextListeners());
            
            const listeners = getIntentListeners().get(intent);
            console.log("Intent listeners for ", intent, listeners);
    
            if (listeners) {
                listeners.forEach((l) => {
                    if (l.handler && context) {
                        console.log("Handling: ", l, intent)
                        const p = l.handler.call(document, context, meta);
                        if (p) {
                            p.then(res => {
                                if (res != null) {
                                    switch (res?.type ) {
                                        case 'app':
                                        case 'private':
                                        case 'user':
                                        case 'system':
                                            sendChannelResult(res as any as Channel, meta);
                                            break;
                                        default:
                                            sendContextResult(res as any as Context, meta);
                                            break;
                                    }

                                }
                            })
                        }
                    }
                });
            }
    
            // emit return event
            document.dispatchEvent(
                fdc3Event(FDC3EventEnum.IntentComplete, { data: null }),
            );

        }
    };
    
    const callContextListener = (listenerId: string, meta: SailContextMetadata, context: Context) => {
        console.log('Intent (CL)', getIntentListeners());
        console.log('Context (CL)', getContextListeners());
        const listeners = getContextListeners();
        if (listeners.has(listenerId)) {
            const listener = listeners.get(listenerId);
            if (listener?.handler && context) {
                console.log("Handling: ", listener, context)
                listener.handler.call(document, context, meta);
            }
        }
    };


    /**
     * listen for incomming contexts
     */
    ipc.on(FDC3_TOPICS_CONTEXT, async (event, args) => {
        console.log('ipc event', event.type, args);

        if (args.data && args.data.context) {
            const meta : SailContextMetadata = {
                source: {
                    appId: "something"
                },
                resultId: "not for context"                
            }

            if (args.listenerIds) {
                const listeners: Array<string> = args.listenerIds;
                listeners.forEach((listenerId) => {
                    const context: Context = args.data.context as Context;
                    const lId = listenerId;
                    callContextListener(lId, meta, context);
                });
            } else if (args.listenerId) {
                const data = args.data;
                callContextListener(args.listenerId, meta, data.context as Context);
            }
        }
    });

    /**
     * listen for incoming intents
     */
    ipc.on(FDC3_TOPICS_INTENT, (event, args) => {
        console.log("Somehow, we need to find the resultId in ", event, args)
        const data = args.data as IntentResultData
        const meta : SailContextMetadata = {
            source: {
                appId: "something"
            },
            resultId: data.resultId               
        }
        callIntentListener(args.data.intent, meta, args.data.context as Context);
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


