import { contextBridge } from 'electron';
import utils from '../../../main/src/utils';
import { Listener as fdc3Listener } from '@finos/fdc3';
import {
  Context,
  DisplayMetadata,
  ContextHandler,
  Channel,
  ImplementationMetadata,
  TargetApp,
} from '@finos/fdc3';
import { FDC3Event, FDC3EventDetail } from '../../../main/src/types/FDC3Event';
import { FDC3EventEnum } from '../../../main/src/types/FDC3Event';
import { TOPICS } from '../../../main/src/constants';

/**
 * This file is injected into each Chrome tab by the Content script to make the FDC3 API available as a global
 */

export function createAPI() {
  /**
   *  the Listener class
   */
  class Listener implements fdc3Listener {
    private id: string;

    type: string;

    intent: string | null = null;

    constructor(type: string, listenerId: string, intent?: string) {
      this.id = listenerId;
      this.type = type;
      if (type === 'intent' && intent) {
        this.intent = intent;
      }
    }

    unsubscribe() {
      if (this.type === 'context') {
        _contextListeners.delete(this.id);
        //notify the background script
        document.dispatchEvent(
          utils.fdc3Event(FDC3EventEnum.DropContextListener, { id: this.id }),
        );
      } else if (this.type === 'intent' && this.intent) {
        const listeners = _intentListeners.get(this.intent);
        if (listeners) {
          listeners.delete(this.id);
        }
        //notify the background script
        document.dispatchEvent(
          utils.fdc3Event(FDC3EventEnum.DropIntentListener, {
            id: this.id,
            intent: this.intent,
          }),
        );
      }
    }
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
          true,
        );
      },
      getCurrentContext: (contextType?: string) => {
        return wireMethod('getCurrentContext', {
          channel: channel.id,
          contextType: contextType,
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
        const listenerId: string = utils.guid();

        _contextListeners.set(
          listenerId,
          createListenerItem(listenerId, thisListener, thisContextType),
        );
        document.dispatchEvent(
          utils.fdc3Event(FDC3EventEnum.AddContextListener, {
            id: listenerId,
            channel: channel.id,
            contextType: thisContextType,
          }),
        );
        return new Listener('context', listenerId);
      },
    };

    return channel;
  };

  //type instanceStatus = 'ready' | 'loading' | 'unregistered';
  /**
   * the AppInstance class
   */
  /*const createAppInstance = (
    id: string,
    status: instanceStatus,
  ): AppInstance => {
    const instance: any = {};
    instance.instanceId = id;
    instance.status = status;

    instance.addContextListener = (
      contextType: string | ContextHandler,
      handler?: ContextHandler,
    ) => {
      const thisListener: ContextHandler = handler ? handler : (contextType as ContextHandler);
      const thisContextType = handler ? (contextType as string) : undefined;

      const listenerId: string = utils.guid();
      _contextListeners.set(
        listenerId,
        createListenerItem(listenerId, thisListener, thisContextType),
      );
      document.dispatchEvent(
        utils.fdc3Event(FDC3EventEnum.AddContextListener, {
          id: listenerId,
          instanceId: instance.instanceId,
          contextType: thisContextType,
        }),
      );
      return new Listener('context', listenerId);
    };

    instance.broadcast = (context: Context) => {
      wireMethod(
        'broadcast',
        { context: context, instanceId: instance.instanceId },
        true,
      );
    };

    /* instance.onStatusChanged = (
      handler: (newVal: string, oldVal: string) => {},
    ) => {};*/

  /*
    return instance as AppInstance;
  };
*/
  const wireMethod = (
    method: string,
    detail: FDC3EventDetail,
    config?: any,
  ): Promise<any | null> => {
    const ts: number = Date.now();
    const _guid: string = utils.guid();
    const eventId = `${method}_${_guid}`;
    detail.eventId = eventId;
    detail.ts = ts;
    if (config && config.void) {
      document.dispatchEvent(utils.fdc3Event(method, detail));
      return new Promise((resolve) => {
        resolve(null);
      });
    } else {
      return new Promise((resolve) => {
        document.addEventListener(
          `FDC3:return_${eventId}`,
          ((event: FDC3Event) => {
            let r = event.detail;
            if (r !== null && config && config.resultHandler) {
              r = config.resultHandler.call(document, r);
            }
            resolve(r);
          }) as EventListener,
          { once: true },
        );

        document.dispatchEvent(utils.fdc3Event(method, detail));
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
      const listenerId: string = utils.guid();
      console.log('add context listener', listenerId);
      _contextListeners.set(
        listenerId,
        createListenerItem(listenerId, thisListener, thisContextType),
      );
      document.dispatchEvent(
        utils.fdc3Event(FDC3EventEnum.AddContextListener, {
          id: listenerId,
          contextType: thisContextType,
        }),
      );
      return new Listener('context', listenerId);
    },

    addIntentListener: (intent: string, listener: ContextHandler) => {
      const listenerId: string = utils.guid();
      if (!_intentListeners.has(intent)) {
        _intentListeners.set(intent, new Map());
      }
      const listeners = _intentListeners.get(intent);
      if (listeners) {
        listeners.set(listenerId, createListenerItem(listenerId, listener));
        document.dispatchEvent(
          utils.fdc3Event(FDC3EventEnum.AddIntentListener, {
            id: listenerId,
            intent: intent,
          }),
        );
        return new Listener('intent', listenerId, intent);
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
          resultHandler: (r: any) => {
            const channels = r.map((c: any) => {
              return createChannelObject(c.id, 'system', c.displayMetadata);
            });
            return channels;
          },
        },
      );
    },

    getOrCreateChannel: (channelId: string) => {
      return wireMethod(
        'getOrCreateChannel',
        { channelId: channelId },
        {
          resultHandler: (r: any) => {
            return createChannelObject(r.id, r.type, r.displayMetadata);
          },
        },
      );
    },

    joinChannel: (channel: string) => {
      return new Promise<void>((resolve) => {
        document.addEventListener(
          TOPICS.CONFIRM_JOIN,
          (() => {
            resolve();
          }) as EventListener,
          { once: true },
        );
        document.dispatchEvent(
          utils.fdc3Event(FDC3EventEnum.JoinChannel, { channel: channel }),
        );
      });
    },

    leaveCurrentChannel: () => {
      return wireMethod('leaveCurrentChannel', {});
    },

    getCurrentChannel: () => {
      return wireMethod(
        'getCurrentChannel',
        {},
        {
          resultHandler: (r: any) => {
            return createChannelObject(r.id, r.type, r.displayMetadata);
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

  (document as any).addEventListener(TOPICS.FDC3_INTENT, (event: FDC3Event) => {
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
        utils.fdc3Event(FDC3EventEnum.IntentComplete, { data: result }),
      );
    }
  });

  //map of context listeners by id
  const _contextListeners: Map<string, ListenerItem> = new Map();

  //map of intents holding map of listeners for each intent
  const _intentListeners: Map<string, Map<string, ListenerItem>> = new Map();

  /* expose the fdc3 api across the context isolation divide...*/
  contextBridge.exposeInMainWorld('fdc3', DesktopAgent);
}
