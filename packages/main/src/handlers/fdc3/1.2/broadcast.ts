import { getRuntime } from '/@/index';
import { RuntimeMessage } from '/@/handlers/runtimeMessage';
import { View } from '/@/view';
import { FDC3Listener } from '/@/types/FDC3Listener';
import { FDC3_TOPICS } from './topics';

interface ViewListener {
  view: View;
  listenerId: string;
}

export const broadcast = async (message: RuntimeMessage) => {
  const runtime = getRuntime();
  const contexts = runtime.getContexts();
  const source = message.source ? runtime.getView(message.source) : null;

  //if there is an instanceId provided on the message - this is the instance target of the broadcast
  //meaning this is a point-to-point com between two instances
  //if the target listener is registered for the source instance, then dispatch the context
  //else, add to the pending queue for instances
  const targetId: string | undefined =
    (message.data && message.data.instanceId) || undefined;
  if (targetId) {
    console.log(
      `broadcast message = '${JSON.stringify(
        message,
      )}' target = '${targetId}' source = '${message.source}'`,
    );
    let setPending = false;
    const target = runtime.getView(targetId);
    const viewListeners: Array<ViewListener> = [];
    if (target) {
      target.listeners.forEach((l: FDC3Listener) => {
        if (!l.intent) {
          if (
            !l.contextType ||
            (l.contextType &&
              l.contextType === message.data &&
              message.data.context &&
              message.data.context.type)
          ) {
            viewListeners.push({
              view: target,
              listenerId: l.listenerId,
            });
          }
        }
      });
      if (viewListeners.length > 0) {
        viewListeners.forEach((viewL: ViewListener) => {
          const data = {
            listenerId: viewL.listenerId,
            eventId: message.data && message.data.eventId,
            ts: message.data && message.data.ts,
            context: message.data && message.data.context,
          };
          viewL.view.content.webContents.send(FDC3_TOPICS.CONTEXT, {
            topic: 'context',
            listenerId: viewL.listenerId,
            data: data,
            source: message.source,
          });
        });
      } else {
        setPending = true;
      }
    }
    const pendingContext = message.data && message.data.context;
    if (setPending && pendingContext && target) {
      target.setPendingContext(pendingContext);
    }
    //if we have a target, we aren't going to go to other channnels - so resolve
    return;
  }

  //use channel on message first - if one is specified
  const channel =
    (message.data && message.data.channel) ||
    (source && source.channel) ||
    'default';

  if (channel !== 'default') {
    //is the app on a channel?
    // update the channel state
    const channelContext = contexts.get(channel);
    const context = message.data && message.data.context;
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
          const contextType =
            message.data && message.data.context && message.data.context.type;
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
        v.content.webContents.send(FDC3_TOPICS.CONTEXT, {
          topic: 'context',
          listenerIds: viewListeners,
          data: {
            eventId: message.data && message.data.eventId,
            ts: message.data && message.data.ts,
            context: message.data && message.data.context,
          },
          source: message.source,
        });
      }
    });
  }
};
