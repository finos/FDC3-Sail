import { v4 as uuid } from 'uuid';
import {
  ELECTRON_HELLO,
  ElectronHelloArgs,
  ElectronAppResponse,
  ElectronDAResponse,
} from '@finos/fdc3-sail-common';
import { SailServerContext } from '../SailServerContext';
import { SailDirectory } from '../../appd/SailDirectory';
import { SailFDC3Server } from '../SailFDC3Server';
import { 
  SocketIOCallback, 
  HandlerContext, 
  APP_INSTANCE_PREFIX, 
  getSailUrl 
} from './types';

/**
 * Handles Electron hello messages for app discovery and DA initialization
 */
export function handleElectronHello(
  props: ElectronHelloArgs,
  callback: SocketIOCallback<ElectronAppResponse | ElectronDAResponse>,
  { socket, connectionState, sessions }: HandlerContext,
): void {
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
}

/**
 * Registers electron-specific socket handlers
 */
export function registerElectronHandlers(context: HandlerContext): void {
  const { socket } = context;
  
  socket.on(ELECTRON_HELLO, (props: ElectronHelloArgs, callback: SocketIOCallback<ElectronAppResponse | ElectronDAResponse>) => {
    handleElectronHello(props, callback, context);
  });
}