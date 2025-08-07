import { State } from '@finos/fdc3-web-impl';
import { SAIL_APP_STATE } from '@finos/fdc3-sail-common';
import { SailServerContext } from '../SailServerContext';
import { SailFDC3Server } from '../SailFDC3Server';
import { SailData } from '../SailServerContext';
import { 
  HandlerContext, 
  SocketType,
  STATE_REPORT_INTERVAL_MS 
} from './types';

/**
 * Handles app disconnection
 */
async function handleAppDisconnect(
  serverContext: SailServerContext, 
  appInstanceId: string
): Promise<void> {
  await serverContext.setAppState(appInstanceId, State.Terminated);
  const remainingApps = await serverContext.getConnectedApps();
  console.log(`App disconnected. ${remainingApps.length} apps remaining`);
}

/**
 * Handles channel receiver disconnection
 */
function handleChannelDisconnect(
  serverContext: SailServerContext, 
  appInstanceId: string
): void {
  const instanceDetails = serverContext.getInstanceDetails(appInstanceId);
  if (instanceDetails) {
    const updatedDetails: SailData = {
      ...instanceDetails,
      channelSockets: [],
    };
    serverContext.setInstanceDetails(appInstanceId, updatedDetails);
    console.log('Channel selector disconnected:', appInstanceId);
  }
}

/**
 * Handles desktop agent disconnection
 */
function handleDesktopAgentDisconnect(
  fdc3Server: SailFDC3Server, 
  userSessionId: string,
  sessions: Map<string, SailFDC3Server>
): void {
  fdc3Server.shutdown();
  sessions.delete(userSessionId);
  console.log('Desktop Agent disconnected:', userSessionId);
}

/**
 * Handles socket disconnection based on connection type
 */
async function handleDisconnect(
  { connectionState, sessions }: HandlerContext,
  stateReporter: NodeJS.Timeout
): Promise<void> {
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
          handleDesktopAgentDisconnect(fdc3ServerInstance, userSessionId, sessions);
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
}

/**
 * Sets up periodic state reporting for the connection
 */
export function setupStateReporter(context: HandlerContext): NodeJS.Timeout {
  const { socket, connectionState } = context;
  
  return setInterval(async () => {
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
}

/**
 * Registers disconnect handler for the socket
 */
export function registerDisconnectHandler(context: HandlerContext): void {
  const { socket } = context;
  
  // Set up state reporter
  const stateReporter = setupStateReporter(context);
  
  // Register disconnect handler
  socket.on('disconnect', async () => {
    await handleDisconnect(context, stateReporter);
  });
}