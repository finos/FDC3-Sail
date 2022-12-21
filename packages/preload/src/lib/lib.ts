import { ipcRenderer } from 'electron';
import { ContextHandler } from '@finos/fdc3';
import {
  FDC3Message,
  FDC3MessageData,
  FDC3Response,
} from '/@main/types/FDC3Message';

//send messages to main, handle responses, queue messages if not connected yet

//queue of pending events - accumulate until the background is ready

export type QueueItem = {
  data: FDC3MessageData;
  topic: string;
  resolve: (x: unknown) => void;
  reject: (x: string) => void;
};

export interface ListenerItem {
  id?: string;
  handler?: ContextHandler;
  contextType?: string;
}

export const processQueueItem = (qi: QueueItem, instanceId: string) => {
  const { port1, port2 } = new MessageChannel();

  port1.onmessage = (event: MessageEvent<FDC3Response>) => {
    //is there a returnlistener registered for the event?
    const response: FDC3Response = event.data;
    console.log('send message - returned ', response);
    if (response.error) {
      qi.reject(response.error);
    } else {
      qi.resolve(response.data);
    }
  };

  const eventId = `${qi.topic}_${guid()}`;

  const msg: FDC3Message = {
    topic: qi.topic,
    data: qi.data,
    eventId: eventId,
    source: instanceId,
  };

  ipcRenderer.postMessage(qi.topic, msg, [port2]);
  console.log('sent message to main', msg);
};

export const sendMessage = (
  topic: string,
  data: FDC3MessageData,
  instanceId: string,
  eventQ: Array<QueueItem>,
): Promise<any> => {
  console.log('Beginning send message:', topic, data);
  //set up a return listener and assign as eventId
  return new Promise((resolve, reject) => {
    const queueItem: QueueItem = {
      data: data,
      topic: topic,
      resolve: resolve,
      reject: reject,
    };

    if (instanceId) {
      processQueueItem(queueItem, instanceId);
    } else {
      eventQ.push(queueItem);
      console.log('queued message', topic, data);
    }
  });
};

/** generate pseudo-random ids for handlers created on the client */
export const guid = (): string => {
  const gen = (n?: number): string => {
    const rando = (): string => {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    };
    let r = '';
    let i = 0;
    n = n ? n : 1;
    while (i < n) {
      r += rando();
      i++;
    }
    return r;
  };

  return `${gen(2)}-${gen()}-${gen()}-${gen()}-${gen(3)}`;
};

/**
 * generates a CustomEvent for FDC3 eventing in the DOM
 * @param type
 * @param detail
 */
export const fdc3Event = (type: string, detail: unknown): CustomEvent => {
  return new CustomEvent(`FDC3:${type}`, { detail: detail });
};

export const channels = [
  {
    id: 'red',
    type: 'user',
    displayMetadata: { color: '#da2d2d', color2: '#9d0b0b', name: 'Red' },
  },
  {
    id: 'orange',
    type: 'user',
    displayMetadata: { color: '#eb8242', color2: '#e25822', name: 'Orange' },
  },
  {
    id: 'yellow',
    type: 'user',
    displayMetadata: { color: '#f6da63', color2: '#e3c878', name: 'Yellow' },
  },
  {
    id: 'green',
    type: 'user',
    displayMetadata: { color: '#42b883', color2: '#347474', name: 'Green' },
  },
  {
    id: 'blue',
    type: 'user',
    displayMetadata: { color: '#1089ff', color2: '#505BDA', name: 'Blue' },
  },
  {
    id: 'purple',
    type: 'user',
    displayMetadata: { color: '#C355F5', color2: '#AA26DA', name: 'Purple' },
  },
];

export enum TARGETS {
  SEARCH_RESULTS = 'searchResults',
  INTENT_RESOLVER = 'intentResolver',
  CHANNEL_PICKER = 'channelPicker',
}
