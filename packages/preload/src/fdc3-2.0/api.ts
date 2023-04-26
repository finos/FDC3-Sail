import { ipcRenderer } from 'electron';
import {
  fdc3Event,
  sendMessage,
  guid,
  ListenerItem,
  IntentListenerItem,
  ContextTypeListenerItem,
  VoidListenerItem,
  convertTarget,
  setInstanceId,
  getEventQ,
  INTENT_TIMEOUT,
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
  ResolveError,
  IntentResult,
} from '@finos/fdc3';
import { ChannelData } from '/@main/types/Channel';
import { FDC3EventEnum } from '/@main/types/FDC3Event';
import { FDC3_2_0_TOPICS } from '/@main/handlers/fdc3/2.0/topics';
import { SAIL_TOPICS } from '/@main/handlers/runtime/topics';
import { IntentResultData } from '/@main/types/FDC3Message';

const toChannelData = (channel: Channel): ChannelData | null => {
  if (channel) {
    return {
      type: channel.type,
      id: channel.id,
      displayMetadata: channel.displayMetadata,
    };
  } else {
    return null;
  }
};

const callIntentListener = async (
  intent: string,
  resultId: string,
  context?: Context | undefined,
) => {
  if (intent) {
    const listeners = _intentListeners.get(intent);
    const result = null;
    if (listeners) {
      const items = listeners.values();
      for (let i = 0; i < listeners.size; i++) {
        const l: IntentListenerItem = items.next().value;
        if (l.handler && context) {
          const result = await l.handler.call(document, context);
          //if it's a channel, convert to channeldata type before sending
          const channelData = toChannelData(result as Channel);
          const contextData = result as Context;
          let resultData: ChannelData | Context | null | undefined;
          if (channelData) {
            resultData = channelData;
          } else if (contextData) {
            resultData = contextData;
          } else if (result) {
            resultData = null;
          }
          //  const messageData : IntentResultData = {resultId: resultId, result: resultData };
          sendMessage(FDC3_2_0_TOPICS.SET_INTENT_RESULT, {
            result: resultData,
            resultId: resultId,
          });
        }
      }
      /* listeners.forEach((l) => {
        if (l.handler && context) {
          l.handler.call(document, context);
        }
      });*/
    }
    //emit return event
    document.dispatchEvent(
      fdc3Event(FDC3EventEnum.IntentComplete, { data: result }),
    );

    return;
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
const _intentListeners: Map<
  string,
  Map<string, IntentListenerItem>
> = new Map();

//map of listeners for when a contextListener is added to a private channel
const _addContextListeners: Map<string, ContextTypeListenerItem> = new Map();

//map of listeners for unsubscribing on a private channel
const _unsubscribeListeners: Map<string, ContextTypeListenerItem> = new Map();

//map of listeners for disconnecting on a private channel
const _disconnectListeners: Map<string, VoidListenerItem> = new Map();

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
    console.log('************** intent', args.data);
    callIntentListener(
      args.data.intent,
      args.data.resultId,
      args.data.context as Context,
    );
  });
};

//handshake with main and get instanceId assigned
ipcRenderer.on(SAIL_TOPICS.START, async (event, args) => {
  console.log('api FDC3 start', args.id);
  if (args.id) {
    setInstanceId(args.id);
    //send any queued messages
    getEventQ().forEach((msg) => {
      sendMessage(msg.topic, msg.data);
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

const createContextTypeListenerItem = (
  id: string,
  handler: (contextType: string) => void,
  contextType?: string,
): ContextTypeListenerItem => {
  const listener: ContextTypeListenerItem = {};
  listener.id = id;
  listener.handler = handler;
  listener.contextType = contextType;

  return listener;
};

const createVoidListenerItem = (
  id: string,
  handler: () => void,
  contextType?: string,
): VoidListenerItem => {
  const listener: VoidListenerItem = {};
  listener.id = id;
  listener.handler = handler;
  listener.contextType = contextType;

  return listener;
};

class ContextListener implements Listener {
  private id: string;

  constructor(listenerId: string) {
    this.id = listenerId;

    this.unsubscribe = () => {
      _contextListeners.delete(this.id);

      sendMessage(FDC3_2_0_TOPICS.DROP_CONTEXT_LISTENER, {
        listenerId: this.id,
      });
    };
  }

  unsubscribe: () => void;
}

class IntentListener implements Listener {
  private id: string;

  intent = '';

  constructor(listenerId: string, intent: string) {
    this.id = listenerId;
    this.intent = intent;

    this.unsubscribe = () => {
      const listeners = _intentListeners.get(this.intent);
      if (listeners) {
        listeners.delete(this.id);
      }

      sendMessage(FDC3_2_0_TOPICS.DROP_INTENT_LISTENER, {
        listenerId: this.id,
        intent: intent,
      });
    };
  }

  unsubscribe: () => void;
}

class AddContextListener implements Listener {
  private id: string;

  constructor(listenerId: string) {
    this.id = listenerId;

    this.unsubscribe = () => {
      _addContextListeners.delete(this.id);

      sendMessage(FDC3_2_0_TOPICS.DROP_ONADDCONTEXT_LISTENER, {
        listenerId: this.id,
      });
    };
  }

  unsubscribe: () => void;
}

class UnsubscribeListener implements Listener {
  private id: string;

  constructor(listenerId: string) {
    this.id = listenerId;

    this.unsubscribe = () => {
      _unsubscribeListeners.delete(this.id);

      sendMessage(FDC3_2_0_TOPICS.DROP_ONUNSUBSCRIBE_LISTENER, {
        listenerId: this.id,
      });
    };
  }

  unsubscribe: () => void;
}

class DisconnectListener implements Listener {
  private id: string;

  constructor(listenerId: string) {
    this.id = listenerId;

    this.unsubscribe = () => {
      _disconnectListeners.delete(this.id);

      sendMessage(FDC3_2_0_TOPICS.DROP_ONDISCONNECT_LISTENER, {
        listenerId: this.id,
      });
    };
  }

  unsubscribe: () => void;
}

/**
 * This file is injected into each Chrome tab by the Content script to make the FDC3 API available as a global
 */

export const createAPI = (): DesktopAgent => {
  const createPrivateChannelObject = (id: string): PrivateChannel => {
    const privateChannel: Channel = createChannelObject(id, 'private', {});

    return {
      ...privateChannel,
      ...{
        onAddContextListener: (
          handler: (contextType?: string) => void,
        ): Listener => {
          const listenerId: string = guid();

          _addContextListeners.set(
            listenerId,
            createContextTypeListenerItem(listenerId, handler),
          );

          sendMessage(FDC3_2_0_TOPICS.ADD_ONADDCONTEXT_LISTENER, {
            listenerId: listenerId,
            channel: id,
          });
          return new AddContextListener(listenerId);
        },

        onDisconnect: (handler: () => void) => {
          const listenerId: string = guid();

          _disconnectListeners.set(
            listenerId,
            createVoidListenerItem(listenerId, handler),
          );

          sendMessage(FDC3_2_0_TOPICS.ADD_ONDISCONNECT_LISTENER, {
            listenerId: listenerId,
            channel: id,
          });
          return new DisconnectListener(listenerId);
        },

        onUnsubscribe: (handler: (contextType?: string) => void): Listener => {
          const listenerId: string = guid();

          _unsubscribeListeners.set(
            listenerId,
            createContextTypeListenerItem(listenerId, handler),
          );

          sendMessage(FDC3_2_0_TOPICS.ADD_ONUNSUBSCRIBE_LISTENER, {
            listenerId: listenerId,
            channel: id,
          });
          return new UnsubscribeListener(listenerId);
        },

        disconnect: (): void => {
          sendMessage(FDC3_2_0_TOPICS.PRIVATE_CHANNEL_DISCONNECT, {
            channel: id,
          });
        },
      },
    } as PrivateChannel;
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
        sendMessage('broadcast', { context: context, channel: channel.id });
        return;
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

        sendMessage(FDC3_2_0_TOPICS.ADD_CONTEXT_LISTENER, {
          listenerId: listenerId,
          channel: channel.id,
          contextType: thisContextType,
        });
        return new ContextListener(listenerId);
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
    await sendMessage(FDC3_2_0_TOPICS.OPEN, {
      target: convertTarget(appArg as AppIdentifier),
      context: contextArg,
    });

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
    return new Promise((resolve, reject) => {
      console.log('***** raise intent ', intent);
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
            version: '2.0',
            source: (cEvent.detail?.source as AppIdentifier) || {
              appId: 'unknown',
            },
            intent: cEvent.detail?.intent,
            getResult: () => {
              return new Promise(() => {
                console.log('in getResult');
              });
            },
          });
        },
        { once: true },
      );

      if (typeof appIdentity === 'string') {
        appIdentity = { appId: appIdentity };
      }

      sendMessage(FDC3_2_0_TOPICS.RAISE_INTENT, {
        intent: intent,
        context: context,
        target: appIdentity
          ? convertTarget(appIdentity as AppIdentifier)
          : undefined,
      }).then(
        (result) => {
          if (result) {
            if (result.error) {
              reject(new Error(result.error));
            } else {
              const getResultMsg: IntentResultData = {
                resultId: result.resultId,
              };
              resolve({
                version: '2.0',
                source: (result.source as AppIdentifier) || {
                  appId: 'unknown',
                },
                intent: result.intent,
                getResult: () => {
                  return new Promise((resolve, reject) => {
                    sendMessage(
                      FDC3_2_0_TOPICS.GET_INTENT_RESULT,
                      getResultMsg,
                    ).then(
                      (intentResult) => {
                        console.log('got intent result', intentResult);
                        const iResult: IntentResult = { type: 'empty' };
                        resolve(iResult);
                      },
                      (err) => {
                        reject(err);
                      },
                    );
                  });
                },
              });
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

    return await sendMessage(FDC3_2_0_TOPICS.RAISE_INTENT_FOR_CONTEXT, {
      context: context,
      target: convertTarget(identity),
    });
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
      return await sendMessage(FDC3_2_0_TOPICS.BROADCAST, { context: context });
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

      sendMessage(FDC3_2_0_TOPICS.ADD_CONTEXT_LISTENER, {
        listenerId: listenerId,
        contextType: thisContextType,
      });

      return new ContextListener(listenerId);
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

        sendMessage(FDC3_2_0_TOPICS.ADD_INTENT_LISTENER, {
          listenerId: listenerId,
          intent: intent,
        });
      }
      return new IntentListener(listenerId, intent);
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
        FDC3_2_0_TOPICS.GET_SYSTEM_CHANNELS,
        {},
      );

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
      const result: ChannelData = await sendMessage(
        FDC3_2_0_TOPICS.CREATE_PRIVATE_CHANNEL,
        {},
      );
      return createPrivateChannelObject(result.id);
    },

    getOrCreateChannel: async (channelId: string) => {
      const result: ChannelData = await sendMessage(
        FDC3_2_0_TOPICS.GET_OR_CREATE_CHANNEL,
        { channel: channelId },
      );
      return createChannelObject(
        result.id,
        result.type as 'user' | 'app' | 'private',
        result.displayMetadata || { name: result.id },
      );
    },

    joinUserChannel: async (channel: string) => {
      return await sendMessage(FDC3_2_0_TOPICS.JOIN_USER_CHANNEL, {
        channel: channel,
      });
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
