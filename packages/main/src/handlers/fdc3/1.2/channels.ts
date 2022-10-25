import { getRuntime } from '/@/index';
import { RuntimeMessage } from '/@/handlers/runtimeMessage';
import { ChannelData } from '/@/handlers/fdc3/1.2/types/FDC3Data';
import { Context, ChannelError } from 'fdc3-1.2';
import { systemChannels } from './systemChannels';

export const getSystemChannels = async () => {
  return systemChannels;
};

export const getCurrentChannel = async (message: RuntimeMessage) => {
  const runtime = getRuntime();

  const view = runtime.getView(message.source);
  return view?.channel ? getChannelMeta(view.channel) : null;
};

export const getCurrentContext = async (message: RuntimeMessage) => {
  const runtime = getRuntime();

  const channel = (message.data && message.data.channel) || undefined;
  const type = (message.data && message.data.contextType) || undefined;
  let ctx: Context | null = null;
  if (channel) {
    const contexts = runtime.getContexts();
    const channelContext = contexts.get(channel);
    if (type) {
      if (channelContext) {
        ctx =
          channelContext.find((c) => {
            return c.type === type;
          }) || null;
      }
    } else {
      ctx = channelContext && channelContext[0] ? channelContext[0] : ctx;
    }
  }
  return ctx;
};

export const getOrCreateChannel = async (message: RuntimeMessage) => {
  const runtime = getRuntime();
  const id = (message.data && message.data.channelId) || 'default';
  //reject with error is reserved 'default' term
  if (id === 'default') {
    throw ChannelError.CreationFailed;
  } else {
    let channel: ChannelData | null = getChannelMeta(id);

    //if not found... create as an app channel
    if (!channel) {
      channel = { id: id, type: 'app' };
      //add an entry for the context listeners
      //contextListeners.set(id, new Map());
      runtime.getContexts().set(id, []);
      runtime.setAppChannel(channel);
    }
    if (channel) {
      return channel;
    } else {
      return;
    }
  }
};

export const leaveCurrentChannel = async (message: RuntimeMessage) => {
  const runtime = getRuntime();
  //'default' means we have left all channels
  const view = runtime.getView(message.source);
  if (view) {
    view.parent?.joinViewToChannel('default', view);
    return;
  } else {
    throw 'View not found';
  }
};

export const joinChannel = async (message: RuntimeMessage) => {
  const runtime = getRuntime();
  const channel = message.data && message.data.channel;
  const view = runtime.getView(message.source);
  if (channel && view) {
    await view.parent?.joinViewToChannel(
      channel,
      view,
      (message.data && message.data.restoreOnly) || undefined,
    );
    return true;
  }
};

//generate / get full channel object from an id - returns null if channel id is not a system channel or a registered app channel
const getChannelMeta = (id: string): ChannelData | null => {
  let channel: ChannelData | null = null;
  //is it a system channel?
  const sChannels: Array<ChannelData> = systemChannels;
  const sc = sChannels.find((c) => {
    return c.id === id;
  });

  if (sc) {
    channel = { id: id, type: 'system', displayMetadata: sc.displayMetadata };
  }
  //is it already an app channel?
  if (!channel) {
    const runtime = getRuntime();
    const ac = runtime.getAppChannels().find((c) => {
      return c.id === id;
    });
    if (ac) {
      channel = { id: id, type: 'app' };
    }
  }
  return channel;
};
