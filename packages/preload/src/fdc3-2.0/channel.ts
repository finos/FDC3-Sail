import { Channel as Channel2_0, PrivateChannel } from 'fdc3-2.0';
import { createChannelObject as createChannelObject1_2 } from '../fdc3-1.2/channel';

import { Context, DisplayMetadata } from '/@main/types/FDC3Message';
import { guid } from '../lib/lib';
import { SendMessage } from '../message';
import { FDC3_2_0_TOPICS } from '/@main/handlers/fdc3/2.0/topics';
import { FDC3Listener, SailContextHandler, SailListener, contextListeners, createListenerItem } from '../fdc3-1.2/listeners';
import { FDC3_TOPICS } from '/@main/handlers/fdc3/topics';
import { CreationFailed } from '/@main/types/FDC3Errors';
import { AddContextListener, DisconnectListener, UnsubscribeListener, addContextListeners, createContextTypeListenerItem, createVoidListenerItem, disconnectListeners, unsubscribeListeners } from './listeners';


/**
 * This overrides the one from the 1.2 implementation as the addContextListener returns a promise in this version 
 * and broadcast returns a void promise.
 */
export const createChannelObject = (
  sendMessage: SendMessage,
  id: string,
  type: string,
  displayMetadata: DisplayMetadata,
): Channel2_0 => {

  if ((type !== "user") && (type !== "app") && (type !=="private")) {
    throw new Error(CreationFailed);
  } else {
    const orig = createChannelObject1_2(sendMessage, id, type, displayMetadata);
    const limitedType :  "user" | "app" | "private" = type;

    const channel: Channel2_0 = {
      ...orig,

      type: limitedType,

      broadcast: (context: Context) => {
        return sendMessage(FDC3_2_0_TOPICS.BROADCAST, {
          context: context,
          channel: channel.id,
        });
      },
  
      async addContextListener(
        contextType: SailContextHandler | string | null,
        handler?: SailContextHandler,
      ) {
        const thisListener: SailContextHandler = handler
          ? handler
          : (contextType as SailContextHandler);
        const thisContextType = handler ? (contextType as string) : undefined;
        const listenerId: string = guid();
  
        contextListeners.set(
          listenerId,
          createListenerItem(listenerId, thisListener, thisContextType),
        );
  
        sendMessage(FDC3_2_0_TOPICS.ADD_CONTEXT_LISTENER, {
          listenerId: listenerId,
          channel: channel.id,
          contextType: thisContextType,
        });
        return new FDC3Listener(FDC3_TOPICS.CONTEXT, listenerId, sendMessage);
      },
    };
  
    return channel;
  }
}

export const createPrivateChannelObject = (sendMessage: SendMessage, id: string): PrivateChannel => {
  const privateChannel: Channel2_0 = createChannelObject(sendMessage, id, 'private', {});

  return {
    ...privateChannel,

    onAddContextListener(handler: (contextType?: string) => void) {
      const listenerId: string = guid();

      addContextListeners.set(
        listenerId,
        createContextTypeListenerItem(listenerId, handler),
      );

      sendMessage(FDC3_2_0_TOPICS.ADD_ONADDCONTEXT_LISTENER, {
        listenerId: listenerId,
        channel: id,
      });

      return new AddContextListener(sendMessage, listenerId);
    },

    onDisconnect(handler: () => void)  {
      const listenerId: string = guid();

      disconnectListeners.set(
        listenerId,
        createVoidListenerItem(listenerId, handler),
      );

      sendMessage(FDC3_2_0_TOPICS.ADD_ONDISCONNECT_LISTENER, {
        listenerId: listenerId,
        channel: id,
      });
      return new DisconnectListener(sendMessage, listenerId);
    },

    onUnsubscribe(handler: (contextType?: string) => void) {
      const listenerId: string = guid();

      unsubscribeListeners.set(
        listenerId,
        createContextTypeListenerItem(listenerId, handler),
      );

      sendMessage(FDC3_2_0_TOPICS.ADD_ONUNSUBSCRIBE_LISTENER, {
        listenerId: listenerId,
        channel: id,
      });
      return new UnsubscribeListener(sendMessage, listenerId);
    },

    disconnect: (): void => {
      sendMessage(FDC3_2_0_TOPICS.PRIVATE_CHANNEL_DISCONNECT, {
        channel: id,
      });
    }

  } as PrivateChannel;
};
