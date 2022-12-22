import { getRuntime } from '/@/index';
import { FDC3Message, BroadcastData } from '/@/types/FDC3Message';
import { View } from '/@/view';
import { FDC3Listener } from '/@/types/FDC3Listener';
import { FDC3_1_2_TOPICS } from '../1.2/topics';
import { FDC3_2_0_TOPICS } from '../2.0/topics';

export const broadcast = async (message: FDC3Message) => {
  const runtime = getRuntime();
  const contexts = runtime.getContexts();
  const source = message.source ? runtime.getView(message.source) : null;
  const data: BroadcastData = message.data as BroadcastData;

  //use channel on message first - if one is specified
  const channel = data.channel || (source && source.channel) || 'default';

  if (channel !== 'default') {
    //is the app on a channel?
    if (!contexts.has(channel)) {
      contexts.set(channel, []);
    }
    // update the channel state
    const channelContext = contexts.get(channel);
    const context = data.context;
    if (channelContext && context) {
      channelContext.unshift(context);
    }

    //if there is a channel, filter on channel
    //to filter on channel, check the listener channel andthe view channel (its channel member)
    //loop through all views
    runtime.getViews().forEach((v: View) => {
      //for each view, aggregate applicable listener ids
      //listener must match on channel and context type
      const viewListeners: Array<string> = [];
      v.listeners.forEach((l: FDC3Listener) => {
        console.log('viewListener (1st pass)', l);
        const matchChannel =
          l.channel && l.channel !== 'default'
            ? l.channel
            : v.channel
            ? v.channel
            : 'default';
        if (matchChannel === channel) {
          console.log(
            'broadcast - matched channel, contextType ',
            l.contextType,
          );
          const contextType = data.context.type;
          if (l.contextType && contextType) {
            console.log('contextType match', l.contextType === contextType);
            if (
              l.contextType === contextType &&
              viewListeners.indexOf(l.listenerId) === -1
            ) {
              viewListeners.push(l.listenerId);
            }
          } else if (viewListeners.indexOf(l.listenerId) === -1) {
            console.log('push listener ', l.listenerId);
            viewListeners.push(l.listenerId);
          }
        }
      });
      //if there are listeners found, broadcast the context to the view (with all listenerIds)
      if (viewListeners.length > 0) {
        const topic =
          v.fdc3Version === '2.0'
            ? FDC3_2_0_TOPICS.CONTEXT
            : FDC3_1_2_TOPICS.CONTEXT;

        v.content.webContents.send(topic, {
          topic: topic,
          listenerIds: viewListeners,
          data: {
            eventId: message.eventId,
            ts: message.ts,
            context: data.context,
          },
          source: message.source,
        });
      }
    });
  }
};
