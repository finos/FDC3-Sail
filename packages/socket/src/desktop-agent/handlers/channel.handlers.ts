import { v4 as uuid } from 'uuid';
import {
  SAIL_CHANNEL_CHANGE,
  CHANNEL_RECEIVER_HELLO,
  SAIL_INTENT_RESOLVE_ON_CHANNEL,
  SailChannelChangeArgs,
  ChannelReceiverHelloRequest,
  ChannelReceiverUpdate,
  SailIntentResolveOpenChannelArgs,
} from '@finos/fdc3-sail-common';
import { BrowserTypes } from '@finos/fdc3';
import { SailData } from '../SailServerContext';
import { 
  SocketIOCallback, 
  HandlerContext, 
  SocketType,
  getFdc3ServerInstance 
} from './types';

/**
 * Handles channel change requests
 */
export async function handleChannelChange(
  props: SailChannelChangeArgs,
  callback: SocketIOCallback<boolean>,
  { sessions }: HandlerContext,
): Promise<void> {
  console.log(`SAIL CHANNEL CHANGE: ${JSON.stringify(props)}`);
  
  try {
    const session = await getFdc3ServerInstance(sessions, props.userSessionId);
    
    const joinChannelRequest: BrowserTypes.JoinUserChannelRequest = {
      type: 'joinUserChannelRequest',
      payload: {
        channelId: props.channel || '',
      },
      meta: {
        requestUuid: uuid(),
        timestamp: new Date(),
      },
    };

    const response = await session.receive(joinChannelRequest, props.instanceId);
    console.log(`SAIL JOIN USER CHANNEL RESPONSE: ${JSON.stringify(response)}`);
    
    await session.serverContext.notifyUserChannelsChanged(
      props.instanceId,
      props.channel,
    );
    
    callback(true);
  } catch (error) {
    console.error('SAIL Channel change failed:', error);
    callback(null, 'Channel change failed');
  }
}

/**
 * Handles channel receiver hello messages
 */
export async function handleChannelReceiverHello(
  props: ChannelReceiverHelloRequest,
  callback: SocketIOCallback<ChannelReceiverUpdate>,
  { socket, connectionState, sessions }: HandlerContext,
): Promise<void> {
  connectionState.userSessionId = props.userSessionId;
  connectionState.appInstanceId = props.instanceId;
  connectionState.socketType = SocketType.CHANNEL;

  try {
    const fdc3Server = await getFdc3ServerInstance(sessions, props.userSessionId);
    const serverContext = fdc3Server.getServerContext();
    const appInstance = serverContext.getInstanceDetails(props.instanceId);
    
    if (!appInstance) {
      callback(null, 'No app found');
      return;
    }

    // Add this socket to the app's channel sockets
    const updatedInstance: SailData = {
      ...appInstance,
      channelSockets: [...appInstance.channelSockets, socket],
    };
    serverContext.setInstanceDetails(props.instanceId, updatedInstance);
    connectionState.fdc3ServerInstance = fdc3Server;

    const channelUpdate: ChannelReceiverUpdate = {
      tabs: serverContext.getTabs(),
    };
    callback(channelUpdate);
  } catch (error) {
    console.error('Error handling channel receiver hello:', error);
    callback(null, 'Server error');
  }
}

/**
 * Handles intent resolution on specific channels
 */
export function handleIntentResolveOnChannel(
  props: SailIntentResolveOpenChannelArgs,
  callback: SocketIOCallback<void>,
  { connectionState }: HandlerContext,
): void {
  console.log(`SAIL INTENT RESOLVE ON CHANNEL: ${JSON.stringify(props)}`);
  
  const { fdc3ServerInstance } = connectionState;
  if (!fdc3ServerInstance) {
    callback(null, 'No server instance available');
    return;
  }

  fdc3ServerInstance.serverContext.openOnChannel(props.appId, props.channel);
  callback(null);
}

/**
 * Registers channel-specific socket handlers
 */
export function registerChannelHandlers(context: HandlerContext): void {
  const { socket } = context;

  socket.on(SAIL_CHANNEL_CHANGE, (props: SailChannelChangeArgs, callback: SocketIOCallback<boolean>) => {
    handleChannelChange(props, callback, context);
  });

  socket.on(CHANNEL_RECEIVER_HELLO, (props: ChannelReceiverHelloRequest, callback: SocketIOCallback<ChannelReceiverUpdate>) => {
    handleChannelReceiverHello(props, callback, context);
  });

  socket.on(SAIL_INTENT_RESOLVE_ON_CHANNEL, (props: SailIntentResolveOpenChannelArgs, callback: SocketIOCallback<void>) => {
    handleIntentResolveOnChannel(props, callback, context);
  });
}