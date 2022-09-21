/**
 * connect from HTML content to main process
 */

import { fdc3Event, TOPICS } from '../lib/lib';
import { FDC3Event } from '../../../main/src/types/FDC3Event';
import { FDC3Message } from '../../../main/src/types/FDC3Message';
import { ipcRenderer } from 'electron';

//const {port1, port2} = new MessageChannel();

//flag to indicate the background script is ready for fdc3!
let connected = false;
let id = '';

//queue of pending events - accumulate until the background is ready
const eventQ: Array<FDC3Message> = [];

/**
 * listen for start event - assigning id for the instance
 */

ipcRenderer.on(TOPICS.FDC3_START, async (event, args) => {
  console.log('fdc3 start', args);
  if (args.id) {
    id = args.id;
    connected = true;
    //send any queued messages
    eventQ.forEach((msg) => {
      msg.source = id;
      //ipcRenderer.postMessage(`FDC3:${msg.topic}`, msg, [port2]);
      sendMessage(msg);
    });
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', () => {
        document.dispatchEvent(new CustomEvent('fdc3Ready', {}));
      });
    } else {
      document.dispatchEvent(new CustomEvent('fdc3Ready', {}));
    }
  }
});

/**
 * return listeners
 * most fdc3 api calls are promise based and many require resolution/rejection following complex interaction that may involve end user input, app loading times etc
 * so, we need to a symetrical return event when events are dispatched to the background script and to uniquely identifiy the event
 * also, need to support timeout/expiration of the event, for example, if an app takes too long to load or an end user never responds to a prompt
 *
 * all promise based FDC3 methods send an event to the background script and listens for an event of "return" + eventName
 * a unique identifier is assigned to the event (timestamp)
 * the return handler will route back to correct handler function via the timestamp identifier
 * handlers will be routinely cleaned up by finding all events that have expired (check timestamp) and rejecting those items
 */
//collection of listeners for api calls coming back from the background script
const returnListeners: Map<string, FDC3ReturnListener> = new Map();
//const returnTimeout = 1000 * 60 * 2;

const sendMessage = (msg: FDC3Message) => {
  const { port1, port2 } = new MessageChannel();

  port1.onmessage = (event: MessageEvent) => {
    const msg = event.data;
    //is there a returnlistener registered for the event?
    const listenerEntry = returnListeners.get(msg.topic);
    const listener = listenerEntry ? listenerEntry.listener : null;
    if (listener) {
      listener.call(window, msg);
      returnListeners.delete(msg.name);
    }
  };
  console.log('send message to main', msg.topic, msg);
  ipcRenderer.postMessage(`FDC3:${msg.topic}`, msg, [port2]);
};

interface FDC3ReturnListener {
  ts: number;
  listener: { (msg: FDC3Message): void };
}

interface TopicConfig {
  isVoid?: boolean;
  cb?: { (event: FDC3Event): void };
}

const wireTopic = (topic: string, config?: TopicConfig): void => {
  document.addEventListener(`FDC3:${topic}`, ((e: FDC3Event) => {
    console.log('contentConnect event', e);
    const cb = config ? config.cb : null;
    const isVoid = config ? config.isVoid : null;

    //get eventId and timestamp from the event
    if (!isVoid) {
      const eventId: string | null | undefined =
        e.detail !== null ? e.detail.eventId : null;

      if (eventId) {
        returnListeners.set(eventId, {
          ts: e.ts,
          listener: function (msg: FDC3Message) {
            if (msg) {
              //handle errors
              if (msg.error) {
                document.dispatchEvent(
                  fdc3Event(`return_${eventId}`, {
                    error: msg.error,
                  }),
                );
              } else {
                document.dispatchEvent(
                  fdc3Event(
                    `return_${eventId}`,
                    msg && msg.data ? msg.data : {},
                  ),
                );
              }
            }
          },
        });
      }
      if (cb) {
        cb.call(document, e);
      }
    }
    //if  background script isn't ready yet, queue these messages...
    const msg: FDC3Message = { topic: topic, source: id, data: e.detail };

    // (Seb) commented out to satisfy Static code analysis
    // console.log(`FDC3:${topic} - connected state`, connected);

    if (!connected) {
      eventQ.push(msg);
    } else {
      sendMessage(msg);
    }
  }) as EventListener);
};

//listen for FDC3 events
export const listen = () => {
  const topics = [
    'open',
    'raiseIntent',
    'raiseIntentForContext',
    'addContextListener',
    'addIntentListener',
    'findIntent',
    'findIntentsByContext',
    'getCurrentContext',
    'getSystemChannels',
    'getOrCreateChannel',
    'getCurrentChannel',
    'getAppInstance',
  ];
  topics.forEach((t) => {
    wireTopic(t);
  });
  //set the custom ones...
  wireTopic('joinChannel', {
    cb: () => {
      //  currentChannel = e.detail && e.detail.channel ? e.detail.channel : null;
    },
  });
  wireTopic('leaveCurrentChannel', {
    cb: () => {
      //  currentChannel = 'default';
    },
  });
  wireTopic('broadcast', { isVoid: true });
  wireTopic('dropContextListener', { isVoid: true });
  wireTopic('dropIntentListener', { isVoid: true });
};

export const connect = () => {
  console.log('connected');
  /**
   * listen for incomming contexts
   */
  ipcRenderer.on(TOPICS.FDC3_CONTEXT, async (event, args) => {
    console.log('ipcrenderer event', event.type, args);
    //check for handlers at the content script layer (automatic handlers) - if not, dispatch to the API layer...
    //   let contextSent = false;
    if (args.data && args.data.context) {
      if (args.listenerIds) {
        const listeners: Array<string> = args.listenerIds;
        listeners.forEach((listenerId) => {
          const data = args.data;
          data.listenerId = listenerId;
          console.log(
            'connection dispatch context',
            JSON.stringify(data),
            args.source,
          );
          document.dispatchEvent(
            new CustomEvent(TOPICS.FDC3_CONTEXT, {
              detail: { data: data, source: args.source },
            }),
          );
        });
      } else if (args.listenerId) {
        const data = args.data;
        data.listenerId = args.listenerId;
        document.dispatchEvent(
          new CustomEvent(TOPICS.FDC3_CONTEXT, {
            detail: { data: data, source: args.source },
          }),
        );
      }

      // }
    }
  });

  /**
   * listen for incoming intents
   */
  ipcRenderer.on(TOPICS.FDC3_INTENT, (event, args) => {
    console.log('ipcrenderer event', event.type);
    document.dispatchEvent(
      new CustomEvent(TOPICS.FDC3_INTENT, {
        detail: { data: args.data, source: args.source },
      }),
    );
  });

  /**
   * listen for channel state update
   * to do: do we need this?
   */
  ipcRenderer.on(TOPICS.FDC3_SET_CURRENT_CHANEL, (event, args) => {
    console.log('ipcrenderer event', event.type);
    if (args.data.channel) {
      //  currentChannel = args.data.channel;
    }
  });
};

//prevent timing issues from very first load of the preload
ipcRenderer.send(TOPICS.FDC3_INITIATE, {});
