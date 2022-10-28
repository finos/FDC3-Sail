import { getRuntime } from '/@/index';
import { RuntimeMessage } from '/@/handlers/runtimeMessage';
import { View } from '/@/view';
import { FDC3_1_2_TOPICS } from './topics';
import { Pending } from '/@/types/Pending';

export const dropContextListener = async (message: RuntimeMessage) => {
  const runtime = getRuntime();
  const id = message.data && message.data?.id;
  const view = runtime.getView(message.source);
  if (view && id) {
    view.listeners = view.listeners.filter((l) => {
      return l.listenerId !== id;
    });
  }
};

export const addContextListener = async (message: RuntimeMessage) => {
  const runtime = getRuntime();
  const source = message.source; //this is the app instance calling addContextListener

  //if there is an instanceId specified, this call is to listen to context from a specific app instance
  const view = runtime.getView(message.source);

  const instanceId = message.data && message.data.instanceId;
  if (instanceId && view) {
    const target: View | undefined = runtime.getView(instanceId);
    if (target) {
      //add a listener for the specific target (instanceId)
      target.listeners.push({
        viewId: view.id,
        source: instanceId,
        listenerId: (message.data && message.data.id) || '',
        contextType: (message.data && message.data.contextType) || '',
      });
      const pendingContexts = target.getPendingContexts();
      if (pendingContexts && pendingContexts.length > 0) {
        pendingContexts.forEach((pending, i) => {
          //does the source of the pending context match the target?
          if (pending && pending.source && pending.source === view.id) {
            //is there a match on contextType (if specified...)
            if (
              pending.context &&
              pending.context.type &&
              pending.context.type === message.data &&
              message.data.type
            ) {
              console.log('send pending context');
              view.content.webContents.postMessage(FDC3_1_2_TOPICS.CONTEXT, {
                topic: FDC3_1_2_TOPICS.CONTEXT,
                data: pending.context,
                source: source,
              });
              target.removePendingContext(i);
            }
          }
        });
      }
    }
  }

  //use channel from the event message first, or use the channel of the sending app, or use default
  const channel: string =
    message.data && message.data.channel
      ? message.data.channel
      : view && view.channel
      ? view.channel
      : 'default'; //: (c && c.channel) ? c.channel

  if (view) {
    view.listeners.push({
      listenerId: (message.data && message.data.id) || '',
      viewId: view.id,
      contextType: (message.data && message.data.contextType) || undefined,
      channel: channel,
      isChannel: channel !== 'default',
    });

    /*
              are there any pending contexts for the listener just added? 
              */
    const pending = view.getPendingContexts();
    if (pending && pending.length > 0) {
      pending.forEach((pending: Pending, i: number) => {
        //is there a match on contextType (if specified...)

        if (
          message.data === undefined ||
          (message.data && message.data.type === undefined) ||
          (pending.context &&
            pending.context.type &&
            pending.context.type === message.data &&
            message.data.type)
        ) {
          view.content.webContents.send(FDC3_1_2_TOPICS.CONTEXT, {
            topic: 'context',
            listenerId: message.data && message.data.id,
            data: {
              context: pending.context,
              listenerId: message.data && message.data.id,
            },
            source: source,
          });

          view.removePendingContext(i);
        }
      });
    }
  }
};
