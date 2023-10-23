import { getRuntime } from '/@/index';
import { FDC3_TOPICS } from '../topics';
import { Pending } from '/@/types/Pending';
import {
  FDC3Message,
  ListenerMessageData,
  ContextListenerData,
} from '/@/types/FDC3Message';
import { FDC3_2_0_TOPICS } from '../2.0/topics';

export const dropContextListener = async (message: FDC3Message) => {
  const runtime = getRuntime();
  const data: ListenerMessageData = message.data as ListenerMessageData;
  const id = data.listenerId;
  const view = runtime.getView(message.source);
  if (view && id) {
    view.listeners = view.listeners.filter((l) => {
      return l.listenerId !== id;
    });
  }
};

export const addContextListener = async (message: FDC3Message) => {
  const runtime = getRuntime();
  const source = message.source; //this is the app instance calling addContextListener
  const data: ContextListenerData = message.data as ContextListenerData;
  const view = runtime.getView(message.source);

  //use channel from the event message first, or use the channel of the sending app, or use default
  const channel: string = data.channel
    ? data.channel
    : view && view.channel
    ? view.channel
    : 'default'; //: (c && c.channel) ? c.channel

  const contextType = data.contextType;

  if (view) {
    view.listeners.push({
      listenerId: data.listenerId || '',
      viewId: view.id,
      contextType: contextType,
      channel: channel,
      isChannel: channel !== 'default',
    });

    /* notify any onAddContextListeners */
    const channelObject = runtime.getPrivateChannel(channel);
    if (channelObject) {
      channelObject.onAddContextListeners.forEach(oacl => {
        const viewId = oacl.viewId;
        const notifyView = viewId && runtime.getView(viewId);
        if (notifyView) {
          notifyView.content.webContents.send(FDC3_2_0_TOPICS.ADD_CONTEXT_LISTENER, {
            ...oacl,
            contextType
          });
        }
      });
    }

    /* are there any pending contexts for the listener just added? */
    const pending = view.getPendingContexts();
    if (pending && pending.length > 0) {
      pending.forEach((pending: Pending, i: number) => {
        //is there a match on contextType (if specified...)

        if (
          contextType === undefined ||
          pending?.context?.type === contextType
        ) {
          const topic = FDC3_TOPICS.CONTEXT;
          view.content.webContents.send(topic, {
            topic: topic,
            listenerId: data.listenerId,
            data: {
              context: pending.context,
              listenerId: data.listenerId,
            },
            source: source,
          });

          view.removePendingContext(i);
        }
      });
    }
  }
};
