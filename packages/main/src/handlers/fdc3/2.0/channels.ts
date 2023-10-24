import { FDC3Message, ChannelListenerData } from '/@/types/FDC3Message';
import { SailPrivateChannelData } from '/@/types/FDC3Data';
import { randomUUID } from 'crypto';
import { getRuntime } from '../../../index';
import { FDC3Listener } from '/@/types/FDC3Listener';
import { FDC3_2_0_TOPICS } from './topics';

export const createPrivateChannel = async (message: FDC3Message) => {
  const id = randomUUID();

  const channel: SailPrivateChannelData = {
    id: id,
    owner: message.source,
    type: 'private',
    unsubscribeListeners: new Map(),
    disconnectListeners: new Map(),
    onAddContextListeners: new Map()
  };

  getRuntime().setPrivateChannel(channel);

  return channel;
};

export const onUnsubscribe = async (message: FDC3Message) => {
  const messageData: ChannelListenerData = message.data as ChannelListenerData;
  const runtime = getRuntime();
  //get the channel
  const channel = runtime.getPrivateChannel(messageData.channel);
  //set the unsubscribe listener
  if (channel) {
    const listener: FDC3Listener = {
      listenerId: messageData.listenerId,
      viewId: message.source,
      channel: messageData.channel,
    };
    channel.unsubscribeListeners.set(messageData.listenerId, listener);
  }

  return;
};

export const onDisconnect = async (message: FDC3Message) => {
  const messageData: ChannelListenerData = message.data as ChannelListenerData;
  const runtime = getRuntime();
  //get the channel
  const channel = runtime.getPrivateChannel(messageData.channel);
  //set the unsubscribe listener
  if (channel) {
    const listener: FDC3Listener = {
      listenerId: messageData.listenerId,
      viewId: message.source,
      channel: messageData.channel,
    };
    channel.disconnectListeners.set(messageData.listenerId, listener);
  }

  return;
};

export const disconnect = async (message: FDC3Message) => {
  const messageData: ChannelListenerData = message.data as ChannelListenerData;
  const runtime = getRuntime();
  const channel = runtime.getPrivateChannel(messageData.channel);
  if (channel) {
    console.log('in disconnect', channel);
  }

  channel?.unsubscribeListeners.forEach(ul => {
      const viewId = ul.viewId;
      const notifyView = viewId && runtime.getView(viewId);
      if (notifyView) {
        notifyView.content.webContents.send(FDC3_2_0_TOPICS.PRIVATE_CHANNEL_UNSUBSCRIBE, ul);
      }
  })

  channel?.disconnectListeners.forEach(dl => {
    const viewId = dl.viewId;
    const notifyView = viewId && runtime.getView(viewId);
    if (notifyView) {
      notifyView.content.webContents.send(FDC3_2_0_TOPICS.PRIVATE_CHANNEL_DISCONNECT, dl);
    }
})
  //is it the host view or remote view that is disconnecting?
  //if the host..
  //destroy the private channel
  //if remote
  //drop subscriptions for the view calling onUnsubscribe for each one, then call onDisconnect
};

export const onAddContextListener = async (message: FDC3Message) => {
  //only gets called back to the host view
  //
  const messageData: ChannelListenerData = message.data as ChannelListenerData;
  const runtime = getRuntime();
  const channel = runtime.getPrivateChannel(messageData.channel);
  if (channel) {
    console.log('in onAddContextListener', channel);
  }

  const listener: FDC3Listener = {
    listenerId: messageData.listenerId,
    viewId: message.source,
    channel: messageData.channel,
  };
  channel?.onAddContextListeners.set(messageData.listenerId, listener);
};
