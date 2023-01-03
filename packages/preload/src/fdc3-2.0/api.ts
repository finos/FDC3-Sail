import { ipcRenderer } from 'electron';
import {
  fdc3Event,
  sendMessage,
  QueueItem,
  guid,
  ListenerItem,
  convertTarget,
} from '../lib/lib';
import {
  AppIntent,
  Context,
  DesktopAgent,
  Listener,
  DisplayMetadata,
  ContextHandler,
  Channel,
  PrivateChannel,
  ImplementationMetadata,
  IntentResolution,
  AppIdentifier,
  AppMetadata,
} from '@finos/fdc3';
import { ChannelData } from '/@main/types/FDC3Data';
import { FDC3EventEnum } from '/@main/types/FDC3Event';
import { FDC3_2_0_TOPICS } from '/@main/handlers/fdc3/2.0/topics';
import { SAIL_TOPICS } from '/@main/handlers/runtime/topics';

//flag to indicate the background script is ready for fdc3!
let instanceId = '';

//queue of pending events - accumulate until the background is ready
const eventQ: Array<QueueItem> = [];

//backwards compatability support for fdc3 namespaced intents
const stripNS = (intent: string): string => {
  if (intent.startsWith('fdc3.')) {
    intent = intent.substring(5);
  }
  return intent;
};

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

//map of context listeners by id
const _contextListeners: Map<string, ListenerItem> = new Map();

//map of intents holding map of listeners for each intent
const _intentListeners: Map<string, Map<string, ListenerItem>> = new Map();

export const connect = () => {
  /**
   * listen for incomming contexts
   */
  ipcRenderer.on(FDC3_2_0_TOPICS.CONTEXT, async (event, args) => {
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
    }
  });

  /**
   * listen for incoming intents
   */
  ipcRenderer.on(FDC3_2_0_TOPICS.INTENT, (event, args) => {
    callIntentListener(args.data.intent, args.data.context as Context);
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
ipcRenderer.on(SAIL_TOPICS.START, async (event, args) => {
  console.log('api FDC3 start', args);
  if (args.id) {
    instanceId = args.id;
    //send any queued messages
    eventQ.forEach((msg) => {
      sendMessage(msg.topic, msg.data, instanceId, eventQ);
    });
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', () => {
        console.log('fdc3Ready');
        document.dispatchEvent(new CustomEvent('fdc3Ready', {}));
      });
    } else {
      console.log('fdc3Ready');
      document.dispatchEvent(new CustomEvent('fdc3Ready', {}));
    }
  }
});

/**
 * This file is injected into each Chrome tab by the Content script to make the FDC3 API available as a global
 */

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

          sendMessage(
            FDC3EventEnum.DropContextListener,
            {
              listenerId: this.id,
            },
            instanceId,
            eventQ,
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
    type: 'user' | 'app' | 'private',
    displayMetadata: DisplayMetadata,
  ): Channel => {
    const channel: Channel = {
      id: id,
      type: type,
      displayMetadata: displayMetadata,
      broadcast: async (context: Context): Promise<void> => {
        sendMessage(
          'broadcast',
          { context: context, channel: channel.id },
          instanceId,
          eventQ,
        );
        return;
      },
      getCurrentContext: (contextType?: string) => {
        return new Promise((resolve, reject) => {
          sendMessage(
            'getCurrentContext',
            {
              channel: channel.id,
              contextType: contextType,
            },
            instanceId,
            eventQ,
          ).then(
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

      addContextListener: async (
        contextType: ContextHandler | string | null,
        handler?: ContextHandler,
      ): Promise<Listener> => {
        const thisListener: ContextHandler = handler
          ? handler
          : (contextType as ContextHandler);
        const thisContextType = handler ? (contextType as string) : undefined;
        const listenerId: string = guid();

        _contextListeners.set(
          listenerId,
          createListenerItem(listenerId, thisListener, thisContextType),
        );

        sendMessage(
          FDC3_2_0_TOPICS.ADD_CONTEXT_LISTENER,
          {
            listenerId: listenerId,
            channel: channel.id,
            contextType: thisContextType,
          },
          instanceId,
          eventQ,
        );
        return new FDC3Listener('context', listenerId);
      },
    };

    return channel;
  };

  function openFunc(
    name: string,
    context?: Context | undefined,
  ): Promise<AppIdentifier>;
  function openFunc(
    app: AppIdentifier,
    context?: Context | undefined,
  ): Promise<AppIdentifier>;
  async function openFunc(
    appArg: unknown,
    contextArg?: Context | undefined,
  ): Promise<AppIdentifier> {
    await sendMessage(
      FDC3_2_0_TOPICS.OPEN,
      {
        target: convertTarget(appArg as AppIdentifier),
        context: contextArg,
      },
      instanceId,
      eventQ,
    );

    return new Promise((resolve) => {
      resolve(appArg as AppIdentifier);
    });
  }

  function raiseIntent(
    intent: string,
    context: Context,
    app?: AppIdentifier | undefined,
  ): Promise<IntentResolution>;
  function raiseIntent(
    intent: string,
    context: Context,
    name?: string,
  ): Promise<IntentResolution>;
  async function raiseIntent(
    intent: string,
    context: Context,
    appIdentity?: unknown,
  ): Promise<IntentResolution> {
    const identity: AppIdentifier =
      typeof appIdentity === 'string'
        ? ({ appId: appIdentity } as AppIdentifier)
        : (appIdentity as AppIdentifier);

    return await sendMessage(
      FDC3_2_0_TOPICS.RAISE_INTENT,
      {
        intent: intent,
        context: context,
        target: convertTarget(identity),
      },
      instanceId,
      eventQ,
    );
  }

  function raiseIntentForContext(
    context: Context,
    app?: AppIdentifier | undefined,
  ): Promise<IntentResolution>;
  function raiseIntentForContext(
    context: Context,
    name?: string,
  ): Promise<IntentResolution>;
  async function raiseIntentForContext(
    context: Context,
    appIdentity?: unknown,
  ): Promise<IntentResolution> {
    const identity: AppIdentifier =
      typeof appIdentity === 'string'
        ? ({ appId: appIdentity } as AppIdentifier)
        : (appIdentity as AppIdentifier);

    return await sendMessage(
      FDC3_2_0_TOPICS.RAISE_INTENT_FOR_CONTEXT,
      {
        context: context,
        target: convertTarget(identity),
      },
      instanceId,
      eventQ,
    );
  }

  const desktopAgent: DesktopAgent = {
    getInfo: async (): Promise<ImplementationMetadata> => {
      return {
        fdc3Version: '2.0',
        provider: 'fdc3-sail',
        optionalFeatures: {
          OriginatingAppMetadata: true,
          UserChannelMembershipAPIs: true,
        },
        appMetadata: {
          appId: 'unknown',
        },
      };
    },

    findInstances: async (
      app: AppIdentifier,
    ): Promise<Array<AppIdentifier>> => {
      const result: Array<AppIdentifier> = [app];
      return result;
    },

    getAppMetadata: async (app: AppIdentifier): Promise<AppMetadata> => {
      return {
        name: '',
        appId: app.appId,
      };
    },

    open: openFunc,

    broadcast: async (context: Context) => {
      //void
      return await sendMessage(
        FDC3_2_0_TOPICS.BROADCAST,
        { context: context },
        instanceId,
        eventQ,
      );
    },

    raiseIntent: raiseIntent,

    raiseIntentForContext: raiseIntentForContext,

    addContextListener: async (
      contextType: ContextHandler | string | null,
      handler?: ContextHandler,
    ): Promise<Listener> => {
      const thisListener: ContextHandler = handler
        ? handler
        : (contextType as ContextHandler);
      const thisContextType: string | undefined =
        contextType && handler ? (contextType as string) : undefined;
      const listenerId: string = guid();
      _contextListeners.set(
        listenerId,
        createListenerItem(listenerId, thisListener, thisContextType),
      );

      sendMessage(
        FDC3_2_0_TOPICS.ADD_CONTEXT_LISTENER,
        {
          listenerId: listenerId,
          contextType: thisContextType,
        },
        instanceId,
        eventQ,
      );

      return new FDC3Listener('context', listenerId);
    },

    addIntentListener: async (
      intent: string,
      listener: ContextHandler,
    ): Promise<Listener> => {
      const listenerId: string = guid();
      if (!_intentListeners.has(intent)) {
        _intentListeners.set(intent, new Map());
      }
      const listeners = _intentListeners.get(intent);
      if (listeners) {
        listeners.set(listenerId, createListenerItem(listenerId, listener));

        sendMessage(
          FDC3_2_0_TOPICS.ADD_INTENT_LISTENER,
          {
            listenerId: listenerId,
            intent: stripNS(intent),
          },
          instanceId,
          eventQ,
        );
      }
      return new FDC3Listener('intent', listenerId, intent);
    },

    findIntent: async (
      intent: string,
      context: Context,
    ): Promise<AppIntent> => {
      return await sendMessage(
        FDC3_2_0_TOPICS.FIND_INTENT,
        {
          intent: intent,
          context: context,
        },
        instanceId,
        eventQ,
      );
    },

    findIntentsByContext: async (
      context: Context,
    ): Promise<Array<AppIntent>> => {
      return await sendMessage(
        FDC3_2_0_TOPICS.FIND_INTENTS_BY_CONTEXT,
        {
          context: context,
        },
        instanceId,
        eventQ,
      );
    },

    getSystemChannels: async (): Promise<Array<Channel>> => {
      const r: Array<ChannelData> = await sendMessage(
        FDC3_2_0_TOPICS.GET_SYSTEM_CHANNELS,
        {},
        instanceId,
        eventQ,
      );
      console.log('result', r);
      const channels = r.map((c: ChannelData) => {
        return createChannelObject(
          c.id,
          'user',
          c.displayMetadata || { name: c.id },
        );
      });
      return channels;
    },

    getUserChannels: async (): Promise<Array<Channel>> => {
      const r: Array<ChannelData> = await sendMessage(
        FDC3_2_0_TOPICS.GET_USER_CHANNELS,
        {},
        instanceId,
        eventQ,
      );
      console.log('result', r);
      const channels = r.map((c: ChannelData) => {
        return createChannelObject(
          c.id,
          'user',
          c.displayMetadata || { name: c.id },
        );
      });
      return channels;
    },

    createPrivateChannel: async (): Promise<PrivateChannel> => {
      const channelId = guid();
      return createChannelObject(channelId, 'private', {
        name: channelId,
      }) as PrivateChannel;
    },

    getOrCreateChannel: async (channelId: string) => {
      const result: ChannelData = await sendMessage(
        FDC3_2_0_TOPICS.GET_OR_CREATE_CHANNEL,
        { channel: channelId },
        instanceId,
        eventQ,
      );
      return createChannelObject(
        result.id,
        result.type as 'user' | 'app' | 'private',
        result.displayMetadata || { name: result.id },
      );
    },

    joinUserChannel: async (channel: string) => {
      return await sendMessage(
        FDC3_2_0_TOPICS.JOIN_USER_CHANNEL,
        {
          channel: channel,
        },
        instanceId,
        eventQ,
      );
    },

    joinChannel: async (channel: string) => {
      return await sendMessage(
        FDC3_2_0_TOPICS.JOIN_CHANNEL,
        {
          channel: channel,
        },
        instanceId,
        eventQ,
      );
    },

    leaveCurrentChannel: async () => {
      return await sendMessage(
        FDC3_2_0_TOPICS.LEAVE_CURRENT_CHANNEL,
        {},
        instanceId,
        eventQ,
      );
    },

    getCurrentChannel: async () => {
      const result: ChannelData = await sendMessage(
        FDC3_2_0_TOPICS.GET_CURRENT_CHANNEL,
        {},
        instanceId,
        eventQ,
      );

      return createChannelObject(
        result.id,
        result.type as 'user' | 'app' | 'private',
        result.displayMetadata || { name: result.id },
      );
    },
  };

  //prevent timing issues from very first load of the preload
  ipcRenderer.send(SAIL_TOPICS.INITIATE, {});

  return desktopAgent;
};
