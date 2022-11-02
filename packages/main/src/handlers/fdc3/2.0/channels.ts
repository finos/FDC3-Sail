import { getRuntime } from '/@/index';
import { RuntimeMessage } from '/@/handlers/runtimeMessage';
import { ChannelData } from '/@/types/Channel';
import { Context, ChannelError } from '@finos/fdc3';
import { userChannels } from '../userChannels';

/** deprecate */
export const getSystemChannels = async () => {
  return userChannels.map((c) => {
    return { ...c, type: 'system' };
  });
};

export const getUserChannels = async () => {
  return userChannels;
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
    let channel: ChannelData | undefined = getChannelMeta(id);

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

export const joinUserChannel = async (message: RuntimeMessage) => {
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

//generate / get full channel object from an id - returns null if channel id is not a user channel or a registered app channel
const getChannelMeta = (id: string): ChannelData | undefined => {
  let channel: ChannelData | undefined;
  //is it a user channel?
  const sChannels = userChannels;
  channel = sChannels.find((c) => {
    return c.id === id;
  });

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
