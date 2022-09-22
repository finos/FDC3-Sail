import { contextBridge } from 'electron';
import { fdc3Event, TOPICS } from '../lib/lib';
import { Listener } from '@finos/fdc3';
import {
  Context,
  DisplayMetadata,
  ContextHandler,
  Channel,
  ImplementationMetadata,
  TargetApp,
} from '@finos/fdc3';
import { FDC3Event, FDC3EventDetail } from '../../../main/src/types/FDC3Event';
import { ChannelData } from '../../../main/src/types/FDC3Data';
import { FDC3EventEnum } from '../../../main/src/types/FDC3Event';

/** generate pseudo-random ids for handlers created on the client */
const guid = (): string => {
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
 * This file is injected into each Chrome tab by the Content script to make the FDC3 API available as a global
 */

export function createAPI() {
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
          //notify the background script
          document.dispatchEvent(
            fdc3Event(FDC3EventEnum.DropContextListener, { id: this.id }),
          );
        } else if (this.type === 'intent' && this.intent) {
          const listeners = _intentListeners.get(this.intent);
          if (listeners) {
            listeners.delete(this.id);
          }
          //notify the background script
          document.dispatchEvent(
            fdc3Event(FDC3EventEnum.DropIntentListener, {
              id: this.id,
              intent: this.intent,
            }),
          );
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
      broadcast: (context: Context) => {
        wireMethod(
          'broadcast',
          { context: context, channel: channel.id },
          { void: true },
        );
      },
      getCurrentContext: (contextType?: string) => {
        return new Promise((resolve, reject) => {
          wireMethod('getCurrentContext', {
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
        document.dispatchEvent(
          fdc3Event(FDC3EventEnum.AddContextListener, {
            id: listenerId,
            channel: channel.id,
            contextType: thisContextType,
          }),
        );
        return new FDC3Listener('context', listenerId);
      },
    };

    return channel;
  };

  interface MethodConfig {
    void?: boolean;
    resultHandler?: { (result: FDC3Result): FDC3Result };
  }

  type FDC3Result =
    | FDC3EventDetail
    | Array<ChannelData>
    | ChannelData
    | Array<Channel>
    | Channel
    | Context
    | null
    | void;

  const wireMethod = (
    method: string,
    detail: FDC3EventDetail,
    config?: MethodConfig,
  ): Promise<FDC3Result> => {
    const ts: number = Date.now();
    const _guid: string = guid();
    const eventId = `${method}_${_guid}`;
    detail.eventId = eventId;
    detail.ts = ts;
    if (config && config.void) {
      document.dispatchEvent(fdc3Event(method, detail));
      return new Promise((resolve) => {
        resolve();
      });
    } else {
      return new Promise((resolve, reject) => {
        document.addEventListener(
          `FDC3:return_${eventId}`,
          ((event: FDC3Event) => {
            let r: FDC3Result = event.detail;
            if (r.error) {
              reject(r.error);
            }
            if (r !== null && config && config.resultHandler) {
              r = config.resultHandler.call(document, r);
            }
            resolve(r);
          }) as EventListener,
          { once: true },
        );

        document.dispatchEvent(fdc3Event(method, detail));
      });
    }
  };

  const DesktopAgent = {
    getInfo(): ImplementationMetadata {
      return {
        fdc3Version: '1.2',
        provider: 'electron-fdc3',
      };
    },

    open: (app: TargetApp, context?: Context) => {
      return wireMethod('open', { target: app, context: context });
    },

    broadcast: (context: Context) => {
      //void
      wireMethod('broadcast', { context: context }, { void: true });
    },

    raiseIntent: (intent: string, context: Context, app?: TargetApp) => {
      return wireMethod('raiseIntent', {
        intent: intent,
        context: context,
        target: app,
      });
    },

    raiseIntentForContext(context: Context, app?: TargetApp) {
      return wireMethod('raiseIntentForContext', {
        context: context,
        target: app,
      });
    },

    addContextListener: (
      contextType: ContextHandler | string | null,
      handler?: ContextHandler,
    ) => {
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
      document.dispatchEvent(
        fdc3Event(FDC3EventEnum.AddContextListener, {
          id: listenerId,
          contextType: thisContextType,
        }),
      );
      return new FDC3Listener('context', listenerId);
    },

    addIntentListener: (intent: string, listener: ContextHandler) => {
      const listenerId: string = guid();
      if (!_intentListeners.has(intent)) {
        _intentListeners.set(intent, new Map());
      }
      const listeners = _intentListeners.get(intent);
      if (listeners) {
        listeners.set(listenerId, createListenerItem(listenerId, listener));
        document.dispatchEvent(
          fdc3Event(FDC3EventEnum.AddIntentListener, {
            id: listenerId,
            intent: intent,
          }),
        );
        return new FDC3Listener('intent', listenerId, intent);
      } else {
        console.error('listener could not be created');
        return null;
      }
    },

    findIntent: (intent: string, context: Context) => {
      return wireMethod('findIntent', { intent: intent, context: context });
    },

    findIntentsByContext: (context: Context) => {
      return wireMethod('findIntentsByContext', { context: context });
    },

    getSystemChannels: () => {
      return wireMethod(
        'getSystemChannels',
        {},
        {
          resultHandler: (r: FDC3Result) => {
            r = r as Array<ChannelData>;
            const channels = r.map((c: ChannelData) => {
              return createChannelObject(
                c.id,
                'system',
                c.displayMetadata || { name: c.id },
              );
            });
            return channels as FDC3Result;
          },
        },
      );
    },

    getOrCreateChannel: (channelId: string) => {
      return wireMethod(
        'getOrCreateChannel',
        { channelId: channelId },
        {
          resultHandler: (r: FDC3Result) => {
            const result: ChannelData = r as ChannelData;
            if (result.id && result.type) {
              return createChannelObject(
                result.id,
                result.type,
                result.displayMetadata || { name: result.id },
              );
            } else {
              return null;
            }
          },
        },
      );
    },

    joinChannel: (channel: string) => {
      return wireMethod('joinChannel', { channel: channel });
    },

    leaveCurrentChannel: () => {
      return wireMethod('leaveCurrentChannel', {});
    },

    getCurrentChannel: () => {
      return wireMethod(
        'getCurrentChannel',
        {},
        {
          resultHandler: (r: FDC3Result) => {
            const result: ChannelData = r as ChannelData;
            return createChannelObject(
              result.id,
              result.type,
              result.displayMetadata || { name: result.id },
            );
          },
        },
      );
    },

    /*  getAppInstance: (instanceId: string): Promise<AppInstance> => {
      return wireMethod(
        'getAppInstance',
        { instanceId: instanceId },
        {
          resultHandler: (r: any) => {
            return createAppInstance(r.instanceId, r.status) as AppInstance;
          },
        },
      );
    },*/
  };

  document.addEventListener(TOPICS.FDC3_CONTEXT, ((event: FDC3Event) => {
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

  document.addEventListener(TOPICS.FDC3_INTENT, ((event: FDC3Event) => {
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
  }) as EventListener);

  //map of context listeners by id
  const _contextListeners: Map<string, ListenerItem> = new Map();

  //map of intents holding map of listeners for each intent
  const _intentListeners: Map<string, Map<string, ListenerItem>> = new Map();

  /* expose the fdc3 api across the context isolation divide...*/
  contextBridge.exposeInMainWorld('fdc3', DesktopAgent);
}
