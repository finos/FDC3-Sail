import { Channel as Channel1_2 } from 'fdc3-1.2';
import { Context, DisplayMetadata } from '/@main/types/FDC3Message';
import { guid } from '../lib/lib';
import { SendMessage } from '../message';
import { FDC3_2_0_TOPICS } from '/@main/handlers/fdc3/2.0/topics';
import { FDC3Listener, SailContextHandler, contextListeners, createListenerItem } from './listeners';
import { FDC3_TOPICS } from '/@main/handlers/fdc3/topics';
import { CreationFailed } from '/@main/types/FDC3Errors';

export const createChannelObject = (
  sendMessage: SendMessage,
  id: string,
  type: string,
  displayMetadata: DisplayMetadata,
): Channel1_2 => {

  const channel: Channel1_2 = {

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
      contextType: SailContextHandler | string | null,
      handler?: SailContextHandler,
    ) => {
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
};

