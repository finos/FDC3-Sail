import { ipcRenderer } from 'electron';
import {
  fdc3Event,
  sendMessage,
  setInstanceId,
  getEventQ,
  processQueueItem,
  guid,
  ListenerItem,
  convertTarget,
  INTENT_TIMEOUT,
} from '../lib/lib';

import {
  DesktopAgent,
  Listener,
  AppIntent,
  Context,
  DisplayMetadata,
  ContextHandler,
  TargetApp,
  Channel,
  ImplementationMetadata,
  IntentResolution,
  ResolveError,
} from 'fdc3-1.2';

import { FDC3EventEnum } from '/@main/types/FDC3Event';
import { ChannelData } from '/@main/types/Channel';
import { FDC3_2_0_TOPICS } from '/@main/handlers/fdc3/2.0/topics';
import { FDC3_TOPICS } from '/@main/handlers/fdc3/topics';
import { RUNTIME_TOPICS, SAIL_TOPICS } from '/@main/handlers/runtime/topics';

//map of context listeners by id
const _contextListeners: Map<string, ListenerItem> = new Map();

//map of intents holding map of listeners for each intent
const _intentListeners: Map<string, Map<string, ListenerItem>> = new Map();

const callIntentListener = (intent: string, context?: Context | undefined) => {
  if (intent) {
    const listeners = _intentListeners.get(intent);
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
  console.log('Context', JSON.stringify(_contextListeners));
  const listeners = _contextListeners;
  if (listeners.has(listenerId)) {
    const listener = listeners.get(listenerId);
    if (listener?.handler && context) {
      listener.handler.call(document, context);
    }
  }
};

export const connect = () => {
  /**
   * listen for incomming contexts
   */
  ipcRenderer.on(FDC3_TOPICS.CONTEXT, async (event, args) => {
    console.log('ipcrenderer event', event.type, args);
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
  ipcRenderer.on(FDC3_TOPICS.INTENT, (event, args) => {
    callIntentListener(args.data.intent, args.data.context as Context);
  });

  ipcRenderer.on(FDC3_2_0_TOPICS.RESOLVE_INTENT, (event, args) => {
    console.log('ipcrenderer event', event.type);
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
  /*ipcRenderer.on(RUNT.SET_CURRENT_CHANEL, (event, args) => {
    console.log('ipcrenderer event', event.type);
    if (args.data.channel) {
      //  currentChannel = args.data.channel;
    }
  });*/
};

//handshake with main and get instanceId assigned
ipcRenderer.on(RUNTIME_TOPICS.WINDOW_START, async (event, args) => {
  console.log('api FDC3 start', args.id);
  if (args.id) {
    setInstanceId(args.id);
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', () => {
        document.dispatchEvent(new CustomEvent('fdc3Ready', {}));
        //send any queued messages
        getEventQ().forEach((msg) => {
          processQueueItem(msg);
        });
      });
    } else {
      document.dispatchEvent(new CustomEvent('fdc3Ready', {}));
      //send any queued messages
      getEventQ().forEach((msg) => {
        processQueueItem(msg);
      });
    }
  }
});

export const createAPI = (): DesktopAgent => {
  /**
   *  the Listener class
   */
  class FDC3Listener implements Listener {
    private id: string;

    type: string;

    intent: string | null = null;

    constructor(type: string, listenerId: string, intent?: string) {
      this.id = listenerId;
      this.type = type;
      if (type === 'intent' && intent) {
        this.intent = intent;
      }

      this.unsubscribe = () => {
        if (this.type === 'context') {
          _contextListeners.delete(this.id);

          sendMessage(FDC3_2_0_TOPICS.DROP_CONTEXT_LISTENER, {
            listenerId: this.id,
          });
        } else if (this.type === 'intent' && this.intent) {
          const listeners = _intentListeners.get(this.intent);
          if (listeners) {
            listeners.delete(this.id);
          }

          sendMessage(FDC3_2_0_TOPICS.DROP_INTENT_LISTENER, {
            listenerId: this.id,
            intent: intent,
          });
        }
      };
    }

    unsubscribe: () => void;
  }

  interface ListenerItem {
    id?: string;
    handler?: ContextHandler;
    contextType?: string;
  }

  const createListenerItem = (
    id: string,
    handler: ContextHandler,
    contextType?: string,
  ): ListenerItem => {
    const listener: ListenerItem = {};
    listener.id = id;
    listener.handler = handler;
    listener.contextType = contextType;

    return listener;
  };

  const createChannelObject = (
    id: string,
    type: string,
    displayMetadata: DisplayMetadata,
  ): Channel => {
    const channel: Channel = {
      id: id,
      type: type,
      displayMetadata: displayMetadata,
      broadcast: async (context: Context) => {
        return await sendMessage(FDC3_2_0_TOPICS.BROADCAST, {
          context: context,
          channel: channel.id,
        });
      },
      getCurrentContext: (contextType?: string) => {
        return new Promise((resolve, reject) => {
          sendMessage(FDC3_2_0_TOPICS.GET_CURRENT_CONTEXT, {
            channel: channel.id,
            contextType: contextType,
          }).then(
            (r) => {
              const result: Context = r as Context;
              resolve(result);
            },
            (err) => {
              reject(err);
            },
          );
        });
      },

      addContextListener: (
        contextType: ContextHandler | string | null,
        handler?: ContextHandler,
      ) => {
        const thisListener: ContextHandler = handler
          ? handler
          : (contextType as ContextHandler);
        const thisContextType = handler ? (contextType as string) : undefined;
        const listenerId: string = guid();

        _contextListeners.set(
          listenerId,
          createListenerItem(listenerId, thisListener, thisContextType),
        );

        sendMessage(FDC3_2_0_TOPICS.ADD_CONTEXT_LISTENER, {
          listenerId: listenerId,
          channel: channel.id,
          contextType: thisContextType,
        });
        return new FDC3Listener(FDC3_TOPICS.CONTEXT, listenerId);
      },
    };

    return channel;
  };

  const desktopAgent: DesktopAgent = {
    getInfo(): ImplementationMetadata {
      return {
        fdc3Version: '1.2',
        provider: 'fdc3-sail',
      };
    },

    open: async (app: TargetApp, context?: Context) => {
      return await sendMessage(FDC3_2_0_TOPICS.OPEN, {
        target: convertTarget(app),
        context: context,
      });
    },

    broadcast: async (context: Context) => {
      //void
      return await sendMessage(FDC3_2_0_TOPICS.BROADCAST, { context: context });
    },

    raiseIntent: (
      intent: string,
      context: Context,
      app?: TargetApp,
    ): Promise<IntentResolution> => {
      return new Promise((resolve, reject) => {
        let intentTimeout = -1;
        //listen for resolve intent
        document.addEventListener(
          FDC3_2_0_TOPICS.RESOLVE_INTENT,
          (event: Event) => {
            const cEvent = event as CustomEvent;
            console.log('***** intent resolution received', cEvent.detail);
            if (intentTimeout) {
              window.clearTimeout(intentTimeout);
            }

            resolve({
              version: '1.2',
              source: cEvent.detail?.source || { name: 'unknown' },
            });
          },
          { once: true },
        );

        sendMessage(FDC3_2_0_TOPICS.RAISE_INTENT, {
          intent: intent,
          context: context,
          target: app ? convertTarget(app) : undefined,
        }).then(
          (result) => {
            console.log('***** got intent result ', result);
            if (result) {
              if (result.error) {
                reject(new Error(result.error));
              } else {
                resolve(result as IntentResolution);
              }
            }
          },
          (error) => {
            reject(error);
          },
        );

        //timeout the intent resolution
        intentTimeout = window.setTimeout(() => {
          reject(new Error(ResolveError.ResolverTimeout));
        }, INTENT_TIMEOUT);
      });
    },

    raiseIntentForContext: async (context: Context, app?: TargetApp) => {
      return await sendMessage(FDC3_2_0_TOPICS.RAISE_INTENT_FOR_CONTEXT, {
        context: context,
        target: app ? convertTarget(app) : undefined,
      });
    },

    addContextListener: (
      contextType: ContextHandler | string | null,
      handler?: ContextHandler,
    ): Listener => {
      const thisListener: ContextHandler = handler
        ? handler
        : (contextType as ContextHandler);
      const thisContextType: string | undefined =
        contextType && handler ? (contextType as string) : undefined;
      const listenerId: string = guid();
      console.log('add context listener', listenerId);
      _contextListeners.set(
        listenerId,
        createListenerItem(listenerId, thisListener, thisContextType),
      );

      sendMessage(FDC3_2_0_TOPICS.ADD_CONTEXT_LISTENER, {
        listenerId: listenerId,
        contextType: thisContextType,
      });

      return new FDC3Listener('context', listenerId);
    },

    addIntentListener: (intent: string, listener: ContextHandler): Listener => {
      const listenerId: string = guid();

      if (!_intentListeners.has(intent)) {
        _intentListeners.set(intent, new Map());
      }
      const listeners = _intentListeners.get(intent);
      if (listeners) {
        listeners.set(listenerId, createListenerItem(listenerId, listener));

        sendMessage(FDC3_2_0_TOPICS.ADD_INTENT_LISTENER, {
          listenerId: listenerId,
          intent: intent,
        });
      }
      return new FDC3Listener('intent', listenerId, intent);
    },

    findIntent: async (
      intent: string,
      context: Context,
    ): Promise<AppIntent> => {
      return await sendMessage(FDC3_2_0_TOPICS.FIND_INTENT, {
        intent: intent,
        context: context,
      });
    },

    findIntentsByContext: async (
      context: Context,
    ): Promise<Array<AppIntent>> => {
      return await sendMessage(FDC3_2_0_TOPICS.FIND_INTENTS_BY_CONTEXT, {
        context: context,
      });
    },

    getSystemChannels: async (): Promise<Array<Channel>> => {
      const r: Array<ChannelData> = await sendMessage(
        FDC3_2_0_TOPICS.GET_USER_CHANNELS,
        {},
      );
      console.log('result', r);
      const channels = r.map((c: ChannelData) => {
        return createChannelObject(
          c.id,
          'system',
          c.displayMetadata || { name: c.id },
        );
      });
      return channels;
    },

    getOrCreateChannel: async (channelId: string) => {
      const result: ChannelData = await sendMessage(
        FDC3_2_0_TOPICS.GET_OR_CREATE_CHANNEL,
        { channel: channelId },
      );
      return createChannelObject(
        result.id,
        result.type,
        result.displayMetadata || { name: result.id },
      );
    },

    joinChannel: async (channel: string) => {
      return await sendMessage(FDC3_2_0_TOPICS.JOIN_CHANNEL, {
        channel: channel,
      });
    },

    leaveCurrentChannel: async () => {
      return await sendMessage(FDC3_2_0_TOPICS.LEAVE_CURRENT_CHANNEL, {});
    },

    getCurrentChannel: async () => {
      const result: ChannelData = await sendMessage(
        FDC3_2_0_TOPICS.GET_CURRENT_CHANNEL,
        {},
      );

      return result == null
        ? null
        : createChannelObject(
            result.id,
            result.type,
            result.displayMetadata || { name: result.id },
          );
    },
  };

  /* document.addEventListener(FDC3_2_0_TOPICS.CONTEXT, ((event: FDC3Event) => {
    console.log('Context', JSON.stringify(_contextListeners));
    const listeners = _contextListeners;
    if (
      event.detail &&
      event.detail.data &&
      event.detail.data.listenerId &&
      listeners.has(event.detail.data.listenerId)
    ) {
      const listener = listeners.get(event.detail.data.listenerId);
      const context = event.detail.data && event.detail.data.context;
      if (listener && listener.handler && context) {
        listener.handler.call(document, context);
      }
    }
  }) as EventListener);

  document.addEventListener(FDC3_2_0_TOPICS.INTENT, ((event: FDC3Event) => {
    const intent = event.detail.data && event.detail.data.intent;
    const context = event.detail.data && event.detail.data.context;
    if (intent) {
      const listeners = _intentListeners.get(intent);
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
  }) as EventListener);*/

  //prevent timing issues from very first load of the preload
  ipcRenderer.send(SAIL_TOPICS.INITIATE, {});

  return desktopAgent;
};
