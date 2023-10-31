import { getRuntime } from '/@/index';
import {
  FDC3Message,
  CurrentContextData,
  ChannelMessageData,
  Context,
} from '/@/types/FDC3Message';
import { systemChannels } from './systemChannels';
import { AccessDenied, CreationFailed } from '/@/types/FDC3Errors';
import { SailChannelData } from '/@/types/FDC3Data';

export const getSystemChannels = async () => {
  return systemChannels;
};

export const getCurrentChannel = async (message: FDC3Message) => {
  const runtime = getRuntime();

  const view = runtime.getView(message.source);
  return view?.channel ? getChannelMeta(view.channel) : null;
};

export const getCurrentContext = async (message: FDC3Message) => {
  const runtime = getRuntime();
  const data: CurrentContextData = message.data as CurrentContextData;

  const channel = data.channel;
  const type = data.contextType;
  let ctx: Context | null = null;

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

  return ctx;
};

export const getOrCreateChannel = async (message: FDC3Message) => {
  const runtime = getRuntime();

  const data: ChannelMessageData = message.data as ChannelMessageData;
  const id = data.channel;
  //reject with error is reserved 'default' term
  if (id === 'default') {
    throw new Error(CreationFailed);
  }
  let channel: SailChannelData | null = getChannelMeta(id);

  //if not found... create as an app channel
  if (!channel) {
    channel = { id: id, type: 'app', owner: message.source };
    //add an entry for the context listeners
    runtime.getContexts().set(id, []);
    runtime.setAppChannel(channel);
    return channel;
  } else if (channel.type == 'app') {
    return channel;
  } else {
    throw new Error(AccessDenied);
  }
};

export const leaveCurrentChannel = async (message: FDC3Message) => {
  const runtime = getRuntime();
  //'default' means we have left all channels
  const view = runtime.getView(message.source);
  if (view) {
    view.parent?.joinViewToChannel('default', view);
    return;
  } else {
    throw new Error('View not found');
  }
};

export const joinChannel = async (message: FDC3Message) => {
  const runtime = getRuntime();
  const data: ChannelMessageData = message.data as ChannelMessageData;
  const channel = data.channel;
  const view = runtime.getView(message.source);
  if (channel && view && view.parent) {
    await view.parent.joinViewToChannel(channel, view);
    return true;
  }
};

//generate / get full channel object from an id - returns null if channel id is not a system channel or a registered app channel
const getChannelMeta = (id: string): SailChannelData | null => {
  const runtime = getRuntime();
  let channel: SailChannelData | null = null;
  //is it a system channel?
  const sChannels: Array<SailChannelData> = systemChannels;
  const sc = sChannels.find((c) => {
    return c.id === id;
  });

  if (sc) {
    return sc;
  }

  //is it an app channel?
  if (!channel) {
    const ac = runtime.getAppChannel(id);
    if (ac) {
      channel = { id: id, type: 'app', owner: ac.owner };
    }
  }

  // is it a private channel?
  if (!channel) {
    const pc = runtime.getPrivateChannel(id);
    if (pc) {
      channel = { id: id, type: 'private', owner: pc.owner };
    }
  }

  return channel;
};
