import {
  APP_HELLO,
  FDC3_APP_EVENT,
  AppHelloArgs,
  AppHosting,
  SailHostManifest,
} from '@finos/fdc3-sail-common';
import { State, WebAppDetails } from '@finos/fdc3-web-impl';
import { BroadcastRequest } from '@finos/fdc3-schema/dist/generated/api/BrowserTypes';
import { SailData } from '../SailServerContext';
import { 
  SocketIOCallback, 
  HandlerContext, 
  SocketType,
  DEBUG_RECONNECTION_SUFFIX,
  getFdc3ServerInstance,
  getNextDebugReconnectionNumber 
} from './types';

/** Debug mode flag */
const DEBUG_MODE = true;

/**
 * Creates a recovery instance for debug mode
 */
function createRecoveryInstance(
  props: AppHelloArgs,
  directoryApps: Array<{ title: string; hostManifests?: { sail?: SailHostManifest }; details: unknown }>,
  socket: any,
): SailData {
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
    instanceTitle: `${directoryApp.title}${DEBUG_RECONNECTION_SUFFIX}${getNextDebugReconnectionNumber()}`,
    channelSockets: [],
  };
}

/**
 * Handles app hello messages for connection establishment
 */
export async function handleAppHello(
  props: AppHelloArgs,
  callback: SocketIOCallback<AppHosting>,
  { socket, connectionState, sessions }: HandlerContext,
): Promise<void> {
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

      const recoveryInstance = createRecoveryInstance(props, directoryApps, socket);
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
}

/**
 * Handles FDC3 app events
 */
export function handleFdc3AppEvent(
  data: Record<string, unknown> & { type: string },
  from: string,
  { connectionState }: HandlerContext,
): void {
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
}

/**
 * Registers app-specific socket handlers
 */
export function registerAppHandlers(context: HandlerContext): void {
  const { socket } = context;

  socket.on(APP_HELLO, (props: AppHelloArgs, callback: SocketIOCallback<AppHosting>) => {
    handleAppHello(props, callback, context);
  });

  socket.on(FDC3_APP_EVENT, (data: Record<string, unknown> & { type: string }, from: string) => {
    handleFdc3AppEvent(data, from, context);
  });
}