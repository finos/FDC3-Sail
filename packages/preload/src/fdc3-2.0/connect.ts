import { Context, IntentResult } from "fdc3-2.0";
import { MessagingSupport, SendMessage } from "../message";
import { createChannelObject } from "./channel";
import { IntentResultData } from "/@main/types/FDC3Message";
import { SailChannelData } from "/@main/types/FDC3Data";
import { FDC3_2_0_TOPICS } from "/@main/handlers/fdc3/2.0/topics";
import { addContextListeners, disconnectListeners, unsubscribeListeners } from "./listeners";
import { FDC3_TOPICS_RESULT_DELIVERY } from "/@main/handlers/fdc3/topics";


const resultPromises: Map<string, (a : IntentResult) => void> = new Map();

export const connect = (ipc: MessagingSupport, sendMessage : SendMessage) => {
    /**
     * listen for incomming results
     */
    ipc.on(FDC3_TOPICS_RESULT_DELIVERY, async (event, a) => {
        console.log('ipc event', event.type, a);
        console.log("RESULT DELIVERY");
        const ird = a as IntentResultData
        const id = ird.resultId;
        const ir = resultPromises.get(id);
        if (ir) {
            let data : IntentResult;
            if (a.type == 'channel') {
                // convert to channel
                const scd = ird.result as SailChannelData
                data = createChannelObject(sendMessage, scd.id, scd.type, undefined);
            } else if (a.type == 'context') {
                data = ird.result as Context;
            } else {
                data = undefined;
            }

            ir(data);
        }
    });

    ipc.on(FDC3_2_0_TOPICS.ADD_CONTEXT_LISTENER, async (event, a) => {
        console.log("on add context listener", event, a);
        const ctli = addContextListeners.get(a.listenerId);
        if (ctli) {
            ctli.handler(a.contextType)
        }
    })

    ipc.on(FDC3_2_0_TOPICS.PRIVATE_CHANNEL_DISCONNECT, async (event, a) => {
        console.log("private channnel disconnect", event, a); 
        const dl = disconnectListeners.get(a.listenerId);
        if (dl) {
            dl.handler();
        }
    })

    ipc.on(FDC3_2_0_TOPICS.PRIVATE_CHANNEL_UNSUBSCRIBE, async (event, a) => {
        console.log("private channnel disconnect", event, a);
        const ul = unsubscribeListeners.get(a.listenerId);
        if (ul) {
            ul.handler();
        }
    })


};

export function createResultPromise(id: string) : Promise<IntentResult> {
    return new Promise<IntentResult>((resolve, reject) => {
        resultPromises.set(id, resolve);
    });
}


