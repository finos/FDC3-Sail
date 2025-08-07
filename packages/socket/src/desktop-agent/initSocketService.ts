import {
  AppHosting,
  DA_DIRECTORY_LISTING,
  APP_HELLO,
  DesktopAgentDirectoryListingArgs,
  AppHelloArgs,
  DA_HELLO,
  DesktopAgentHelloArgs,
  FDC3_APP_EVENT,
  SAIL_CHANNEL_CHANGE,
  SailChannelChangeArgs,
  SAIL_APP_STATE,
  SAIL_CLIENT_STATE,
  DesktopAgentRegisterAppLaunchArgs,
  DA_REGISTER_APP_LAUNCH,
  SailHostManifest,
  ELECTRON_HELLO,
  ElectronHelloArgs,
  ElectronAppResponse,
  ElectronDAResponse,
  SailClientStateArgs,
  CHANNEL_RECEIVER_UPDATE,
  ChannelReceiverUpdate,
  CHANNEL_RECEIVER_HELLO,
  ChannelReceiverHelloRequest,
  SAIL_INTENT_RESOLVE_ON_CHANNEL,
  SailIntentResolveOpenChannelArgs,
  TabDetail,
} from '@finos/fdc3-sail-common';
import { Socket, Server } from 'socket.io';
import { SailFDC3Server } from './SailFDC3Server';
import { SailData, SailServerContext } from './SailServerContext';
import { SailDirectory } from '../appd/SailDirectory';
import { v4 as uuid } from 'uuid';
import { State, WebAppDetails } from '@finos/fdc3-web-impl';
import { BrowserTypes } from '@finos/fdc3';
import { BroadcastRequest } from '@finos/fdc3-schema/dist/generated/api/BrowserTypes';

/** Configuration constants */
const DEBUG_MODE = true;
const DEFAULT_SAIL_URL = 'http://localhost:8090';
const APP_INSTANCE_PREFIX = 'sail-app-';
const POLLING_INTERVAL_MS = 100;
const STATE_REPORT_INTERVAL_MS = 3000;
const DEBUG_RECONNECTION_SUFFIX = ' - RECOVERED ';

/** Types of socket connections */
const enum SocketType {
  DESKTOP_AGENT = 'desktop_agent',
  APP = 'app',
  CHANNEL = 'channel',
}

/** Socket.IO callback types */
type SocketIOCallback<T = unknown> = (result: T | null, error?: string) => void;

/** Socket connection state */
interface SocketConnectionState {
  fdc3ServerInstance?: SailFDC3Server;
  userSessionId?: string;
  appInstanceId?: string;
  socketType?: SocketType;
}

/** Global state for debug reconnections */
let debugReconnectionNumber = 0;

/**
 * Gets the Sail URL from environment variables or returns default
 * @returns The Sail URL
 */
export function getSailUrl(): string {
  return process.env.SAIL_URL || DEFAULT_SAIL_URL;
}

/**
 * Waits for an FDC3 server instance to become available for a session
 * @param sessions - Map of active FDC3 server sessions
 * @param userSessionId - The session ID to wait for
 * @returns Promise that resolves when the server instance is available
 */
function getFdc3ServerInstance(
  sessions: Map<string, SailFDC3Server>,
  userSessionId: string,
): Promise<SailFDC3Server> {
  return new Promise((resolve) => {
    const pollForServer = () => {
      const fdc3Server = sessions.get(userSessionId);
      if (fdc3Server) {
        resolve(fdc3Server);
      } else {
        setTimeout(pollForServer, POLLING_INTERVAL_MS);
      }
    };
    pollForServer();
  });
}

/**
 * Initializes the Socket.IO service for handling FDC3 communications
 * @param io - The Socket.IO server instance
 * @param sessions - Map to store active FDC3 server sessions
 * @returns The configured Socket.IO server
 */
export function initSocketService(
  io: Server,
  sessions: Map<string, SailFDC3Server>,
): Server {
  io.on('connection', (socket: Socket) => {
    const connectionState: SocketConnectionState = {};

    /**
     * Handles Electron hello messages for app discovery and DA initialization
     */
    const handleElectronHello = (
      props: ElectronHelloArgs,
      callback: SocketIOCallback<ElectronAppResponse | ElectronDAResponse>,
    ): void => {
      console.log(`SAIL ELECTRON HELLO: ${JSON.stringify(props)}`);
      const existingServer = sessions.get(props.userSessionId);

      if (existingServer) {
        const matchingApps = existingServer.getDirectory().retrieveAppsByUrl(props.url);

        if (matchingApps.length > 0) {
          const [firstApp] = matchingApps;
          console.log('SAIL Found app', firstApp.appId);
          
          const response: ElectronAppResponse = {
            type: 'app',
            userSessionId: props.userSessionId,
            appId: firstApp.appId,
            instanceId: `${APP_INSTANCE_PREFIX}${uuid()}`,
            intentResolver: null,
            channelSelector: null,
          };
          callback(response);
        } else {
          console.error('App not found', props.url);
          callback(null, 'App not found');
        }
      } else if (props.url === getSailUrl()) {
        connectionState.userSessionId = props.userSessionId;
        const serverContext = new SailServerContext(new SailDirectory(), socket);
        const newServer = new SailFDC3Server(serverContext, props);
        serverContext.setFDC3Server(newServer);
        sessions.set(props.userSessionId, newServer);

        const response: ElectronDAResponse = { type: 'da' };
        callback(response);
      } else {
        console.error('Session not found', connectionState.userSessionId);
        callback(null, 'Session not found');
      }
    };

    socket.on(ELECTRON_HELLO, handleElectronHello);

    /**
     * Handles Desktop Agent hello messages for session setup
     */
    const handleDesktopAgentHello = (
      props: DesktopAgentHelloArgs,
      callback: SocketIOCallback<boolean>,
    ): void => {
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
    };

    socket.on(DA_HELLO, handleDesktopAgentHello);

    /**
     * Handles directory listing requests
     */
    const handleDirectoryListing = async (
      props: DesktopAgentDirectoryListingArgs,
      callback: SocketIOCallback<unknown>,
    ): Promise<void> => {
      const { userSessionId } = props;
      try {
        const session = await getFdc3ServerInstance(sessions, userSessionId);
        const directoryApps = session.getDirectory().allApps;
        callback(directoryApps);
      } catch (error) {
        console.error('Session not found', userSessionId, error);
        callback(null, 'Session not found');
      }
    };

    socket.on(DA_DIRECTORY_LISTING, handleDirectoryListing);

    /**
     * Handles app launch registration requests
     */
    const handleRegisterAppLaunch = async (
      props: DesktopAgentRegisterAppLaunchArgs,
      callback: SocketIOCallback<string>,
    ): Promise<void> => {
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
    };

    socket.on(DA_REGISTER_APP_LAUNCH, handleRegisterAppLaunch);

    /**
     * Updates panel channel assignments
     */
    const updatePanelChannels = (
      serverContext: SailServerContext,
      panels: Array<{ panelId: string; tabId: string; title: string }>,
    ): void => {
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
    };

    /**
     * Updates channel data for connected apps
     */
    const updateConnectedAppsChannels = async (
      serverContext: SailServerContext,
      channels: TabDetail[],
    ): Promise<void> => {
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
    };

    /**
     * Handles client state updates
     */
    const handleClientState = async (
      props: SailClientStateArgs,
      callback: SocketIOCallback<boolean>,
    ): Promise<void> => {
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
    };

    socket.on(SAIL_CLIENT_STATE, handleClientState);

    /**
     * Handles channel change requests
     */
    const handleChannelChange = async (
      props: SailChannelChangeArgs,
      callback: SocketIOCallback<boolean>,
    ): Promise<void> => {
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
    };

    socket.on(SAIL_CHANNEL_CHANGE, handleChannelChange);

    /**
     * Creates a recovery instance for debug mode
     */
    const createRecoveryInstance = (
      props: AppHelloArgs,
      directoryApps: Array<{ title: string; hostManifests?: { sail?: SailHostManifest }; details: unknown }>,
    ): SailData => {
      const [directoryApp] = directoryApps;
      const sailManifest = directoryApp.hostManifests?.sail;
      
      return {
        appId: props.appId,
        instanceId: props.instanceId,
        state: State.Pending,
        socket,
        url: (directoryApp.details as WebAppDetails).url,
        hosting: sailManifest?.forceNewWindow ? AppHosting.Tab : AppHosting.Frame,
        channel: null,
        instanceTitle: `${directoryApp.title}${DEBUG_RECONNECTION_SUFFIX}${debugReconnectionNumber++}`,
        channelSockets: [],
      };
    };

    /**
     * Handles app hello messages for connection establishment
     */
    const handleAppHello = async (
      props: AppHelloArgs,
      callback: SocketIOCallback<AppHosting>,
    ): Promise<void> => {
      console.log(`SAIL APP HELLO: ${JSON.stringify(props)}`);

      connectionState.appInstanceId = props.instanceId;
      connectionState.userSessionId = props.userSessionId;
      connectionState.socketType = SocketType.APP;
      
      try {
        const fdc3Server = await getFdc3ServerInstance(sessions, props.userSessionId);
        
        if (!fdc3Server) {
          console.error(
            'App tried connecting to non-existent DA instance:',
            props.userSessionId,
            props.instanceId,
          );
          callback(null, 'App tried connecting to non-existent DA instance');
          return;
        }

        console.log('SAIL App connected:', props.userSessionId, props.instanceId);
        const serverContext = fdc3Server.getServerContext();
        const existingInstance = serverContext.getInstanceDetails(props.instanceId);
        const directoryApps = serverContext.directory.retrieveAppsById(props.appId);

        // Handle existing pending instance
        if (existingInstance?.state === State.Pending) {
          const updatedInstance: SailData = {
            ...existingInstance,
            socket,
            url: directoryApps.length > 0 ? (directoryApps[0].details as WebAppDetails).url : existingInstance.url,
          };
          
          connectionState.fdc3ServerInstance = fdc3Server;
          serverContext.setInstanceDetails(props.instanceId, updatedInstance);
          callback(updatedInstance.hosting);
          return;
        }

        // Handle debug mode recovery
        if (DEBUG_MODE && directoryApps.length > 0) {
          console.error(
            'App tried to connect with invalid instance ID, allowing connection in debug mode:',
            props.instanceId,
          );

          const recoveryInstance = createRecoveryInstance(props, directoryApps);
          serverContext.setInstanceDetails(props.instanceId, recoveryInstance);
          connectionState.fdc3ServerInstance = fdc3Server;
          callback(recoveryInstance.hosting);
          return;
        }

        console.error('App tried to connect with invalid instance ID');
        callback(null, 'Invalid instance ID');
      } catch (error) {
        console.error('Error handling app hello:', error);
        callback(null, 'Connection error');
      }
    };

    socket.on(APP_HELLO, handleAppHello);

    /**
     * Handles FDC3 app events
     */
    const handleFdc3AppEvent = (data: Record<string, unknown> & { type: string }, from: string): void => {
      // Log non-heartbeat messages
      if (!data.type.startsWith('heartbeat')) {
        console.log(`SAIL FDC3_APP_EVENT: ${JSON.stringify(data)} from ${from}`);
      }

      const { fdc3ServerInstance } = connectionState;
      if (!fdc3ServerInstance) {
        console.error('No server instance available');
        return;
      }

      try {
        fdc3ServerInstance.receive(data as any, from);

        if (data.type === 'broadcastRequest') {
          fdc3ServerInstance.serverContext.notifyBroadcastContext(
            data as unknown as BroadcastRequest,
          );
        }
      } catch (error) {
        console.error('Error processing FDC3 message:', error);
      }
    };

    socket.on(FDC3_APP_EVENT, handleFdc3AppEvent);

    /**
     * Handles channel receiver hello messages
     */
    const handleChannelReceiverHello = async (
      props: ChannelReceiverHelloRequest,
      callback: SocketIOCallback<ChannelReceiverUpdate>,
    ): Promise<void> => {
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
    };

    socket.on(CHANNEL_RECEIVER_HELLO, handleChannelReceiverHello);

    /**
     * Handles intent resolution on specific channels
     */
    const handleIntentResolveOnChannel = (
      props: SailIntentResolveOpenChannelArgs,
      callback: SocketIOCallback<void>,
    ): void => {
      console.log(`SAIL INTENT RESOLVE ON CHANNEL: ${JSON.stringify(props)}`);
      
      const { fdc3ServerInstance } = connectionState;
      if (!fdc3ServerInstance) {
        callback(null, 'No server instance available');
        return;
      }

      fdc3ServerInstance.serverContext.openOnChannel(props.appId, props.channel);
      callback(null);
    };

    socket.on(SAIL_INTENT_RESOLVE_ON_CHANNEL, handleIntentResolveOnChannel);

    /**
     * Periodically reports app state to the client
     */
    const stateReporter = setInterval(async () => {
      const { fdc3ServerInstance } = connectionState;
      if (fdc3ServerInstance) {
        try {
          const appStates = await fdc3ServerInstance.serverContext.getAllApps();
          socket.emit(SAIL_APP_STATE, appStates);
        } catch (error) {
          console.error('Error reporting app state:', error);
        }
      }
    }, STATE_REPORT_INTERVAL_MS);

    /**
     * Handles app disconnection
     */
    const handleAppDisconnect = async (serverContext: SailServerContext, appInstanceId: string): Promise<void> => {
      await serverContext.setAppState(appInstanceId, State.Terminated);
      const remainingApps = await serverContext.getConnectedApps();
      console.log(`App disconnected. ${remainingApps.length} apps remaining`);
    };

    /**
     * Handles channel receiver disconnection
     */
    const handleChannelDisconnect = (serverContext: SailServerContext, appInstanceId: string): void => {
      const instanceDetails = serverContext.getInstanceDetails(appInstanceId);
      if (instanceDetails) {
        const updatedDetails: SailData = {
          ...instanceDetails,
          channelSockets: [],
        };
        serverContext.setInstanceDetails(appInstanceId, updatedDetails);
        console.log('Channel selector disconnected:', appInstanceId, connectionState.userSessionId);
      }
    };

    /**
     * Handles desktop agent disconnection
     */
    const handleDesktopAgentDisconnect = (fdc3Server: SailFDC3Server, userSessionId: string): void => {
      fdc3Server.shutdown();
      sessions.delete(userSessionId);
      console.log('Desktop Agent disconnected:', userSessionId);
    };

    /**
     * Handles socket disconnection based on connection type
     */
    const handleDisconnect = async (): Promise<void> => {
      const { fdc3ServerInstance, socketType, appInstanceId, userSessionId } = connectionState;
      
      if (!fdc3ServerInstance) {
        console.error('No server instance on disconnect');
        clearInterval(stateReporter);
        return;
      }

      try {
        switch (socketType) {
          case SocketType.APP:
            if (appInstanceId) {
              await handleAppDisconnect(fdc3ServerInstance.serverContext, appInstanceId);
            }
            break;
            
          case SocketType.CHANNEL:
            if (appInstanceId) {
              handleChannelDisconnect(fdc3ServerInstance.serverContext, appInstanceId);
            }
            break;
            
          case SocketType.DESKTOP_AGENT:
            if (userSessionId) {
              handleDesktopAgentDisconnect(fdc3ServerInstance, userSessionId);
            }
            break;
            
          default:
            console.warn('Unknown socket type on disconnect:', socketType);
        }
      } catch (error) {
        console.error('Error handling disconnect:', error);
      } finally {
        clearInterval(stateReporter);
      }
    };

    socket.on('disconnect', handleDisconnect);
  });

  return io;
}
