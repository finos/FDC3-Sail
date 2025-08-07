import { v4 as uuid } from 'uuid';
import {
  DA_HELLO,
  DA_DIRECTORY_LISTING,
  DA_REGISTER_APP_LAUNCH,
  SAIL_CLIENT_STATE,
  DesktopAgentHelloArgs,
  DesktopAgentDirectoryListingArgs,
  DesktopAgentRegisterAppLaunchArgs,
  SailClientStateArgs,
  CHANNEL_RECEIVER_UPDATE,
  ChannelReceiverUpdate,
  TabDetail,
} from '@finos/fdc3-sail-common';
import { State } from '@finos/fdc3-web-impl';
import { SailServerContext } from '../SailServerContext';
import { SailDirectory } from '../../appd/SailDirectory';
import { SailFDC3Server } from '../SailFDC3Server';
import { SailData } from '../SailServerContext';
import { 
  SocketIOCallback, 
  HandlerContext, 
  SocketType,
  APP_INSTANCE_PREFIX,
  getFdc3ServerInstance 
} from './types';

/**
 * Handles Desktop Agent hello messages for session setup
 */
export function handleDesktopAgentHello(
  props: DesktopAgentHelloArgs,
  callback: SocketIOCallback<boolean>,
  { socket, connectionState, sessions }: HandlerContext,
): void {
  console.log(`SAIL DA HELLO: ${JSON.stringify(props)}`);

  connectionState.socketType = SocketType.DESKTOP_AGENT;
  connectionState.userSessionId = props.userSessionId;
  console.log('SAIL Desktop Agent Connecting', connectionState.userSessionId);
  
  const existingServer = sessions.get(props.userSessionId);

  let fdc3Server: SailFDC3Server;
  if (existingServer) {
    // Reconfigure existing session
    fdc3Server = new SailFDC3Server(existingServer.serverContext, props);
    sessions.set(props.userSessionId, fdc3Server);
    console.log(
      'SAIL updated desktop agent channels and directories',
      sessions.size,
      props.userSessionId,
    );
  } else {
    // Create new session
    const serverContext = new SailServerContext(new SailDirectory(), socket);
    fdc3Server = new SailFDC3Server(serverContext, props);
    serverContext.setFDC3Server(fdc3Server);
    sessions.set(props.userSessionId, fdc3Server);
    console.log(
      'SAIL created agent session. Running sessions:',
      sessions.size,
      props.userSessionId,
    );
  }

  connectionState.fdc3ServerInstance = fdc3Server;
  callback(true);
}

/**
 * Handles directory listing requests
 */
export async function handleDirectoryListing(
  props: DesktopAgentDirectoryListingArgs,
  callback: SocketIOCallback<unknown>,
  { sessions }: HandlerContext,
): Promise<void> {
  const { userSessionId } = props;
  try {
    const session = await getFdc3ServerInstance(sessions, userSessionId);
    const directoryApps = session.getDirectory().allApps;
    callback(directoryApps);
  } catch (error) {
    console.error('Session not found', userSessionId, error);
    callback(null, 'Session not found');
  }
}

/**
 * Handles app launch registration requests
 */
export async function handleRegisterAppLaunch(
  props: DesktopAgentRegisterAppLaunchArgs,
  callback: SocketIOCallback<string>,
  { sessions }: HandlerContext,
): Promise<void> {
  console.log(`SAIL DA REGISTER APP LAUNCH: ${JSON.stringify(props)}`);

  const { appId, userSessionId, hosting, channel, instanceTitle } = props;
  try {
    const session = await getFdc3ServerInstance(sessions, userSessionId);
    const instanceId = `${APP_INSTANCE_PREFIX}${uuid()}`;
    
    const instanceDetails: SailData = {
      instanceId,
      state: State.Pending,
      appId,
      hosting,
      channel,
      instanceTitle,
      channelSockets: [],
    };
    
    session.serverContext.setInstanceDetails(instanceId, instanceDetails);
    console.log('SAIL Registered app', appId, instanceId);
    callback(instanceId);
  } catch (error) {
    console.error('SAIL Session not found', userSessionId, error);
    callback(null, 'Session not found');
  }
}

/**
 * Updates panel channel assignments
 */
function updatePanelChannels(
  serverContext: SailServerContext,
  panels: Array<{ panelId: string; tabId: string; title: string }>,
): void {
  panels.forEach(({ panelId, tabId: newChannel, title }) => {
    const instanceDetails = serverContext.getInstanceDetails(panelId);
    if (!instanceDetails) return;

    const existingChannel = instanceDetails.channel;
    
    // Update instance title
    const updatedDetails: SailData = {
      ...instanceDetails,
      instanceTitle: title,
    };
    serverContext.setInstanceDetails(panelId, updatedDetails);

    // Notify of channel change if different
    if (newChannel !== existingChannel) {
      serverContext.notifyUserChannelsChanged(panelId, newChannel);
    }
  });
}

/**
 * Updates channel data for connected apps
 */
async function updateConnectedAppsChannels(
  serverContext: SailServerContext,
  channels: TabDetail[],
): Promise<void> {
  const connectedApps = await serverContext.getConnectedApps();
  
  connectedApps.forEach((app) => {
    const instanceDetails = serverContext.getInstanceDetails(app.instanceId);
    if (!instanceDetails) return;

    const channelUpdate: ChannelReceiverUpdate = {
      tabs: channels,
    };
    
    instanceDetails.channelSockets.forEach((channelSocket) => {
      channelSocket.emit(CHANNEL_RECEIVER_UPDATE, channelUpdate);
    });
  });
}

/**
 * Handles client state updates
 */
export async function handleClientState(
  props: SailClientStateArgs,
  callback: SocketIOCallback<boolean>,
  { sessions }: HandlerContext,
): Promise<void> {
  console.log(`SAIL CLIENT STATE: ${JSON.stringify(props)}`);
  
  try {
    const session = await getFdc3ServerInstance(sessions, props.userSessionId);
    const { serverContext } = session;
    
    // Update directories and channels
    await serverContext.reloadAppDirectories(props.directories, props.customApps);
    serverContext.updateChannelData(props.channels);

    // Update panel channels
    updatePanelChannels(serverContext, props.panels);

    // Update channel data for connected apps
    await updateConnectedAppsChannels(serverContext, props.channels);

    callback(true);
  } catch (error) {
    console.error('SAIL Client state update failed:', error);
    callback(null, 'Session not found');
  }
}

/**
 * Registers desktop agent socket handlers
 */
export function registerDesktopAgentHandlers(context: HandlerContext): void {
  const { socket } = context;

  socket.on(DA_HELLO, (props: DesktopAgentHelloArgs, callback: SocketIOCallback<boolean>) => {
    handleDesktopAgentHello(props, callback, context);
  });

  socket.on(DA_DIRECTORY_LISTING, (props: DesktopAgentDirectoryListingArgs, callback: SocketIOCallback<unknown>) => {
    handleDirectoryListing(props, callback, context);
  });

  socket.on(DA_REGISTER_APP_LAUNCH, (props: DesktopAgentRegisterAppLaunchArgs, callback: SocketIOCallback<string>) => {
    handleRegisterAppLaunch(props, callback, context);
  });

  socket.on(SAIL_CLIENT_STATE, (props: SailClientStateArgs, callback: SocketIOCallback<boolean>) => {
    handleClientState(props, callback, context);
  });
}