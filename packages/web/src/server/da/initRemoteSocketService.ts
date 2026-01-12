import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { v4 as uuid } from 'uuid';
import { SailFDC3Server } from './SailFDC3Server';
import { SailData } from './SailServerContext';
import { State, DirectoryApp } from '@finos/fdc3-web-impl';
import { AppHosting, RemoteApp } from '@finos/fdc3-sail-common';

/**
 * WCP4ValidateAppIdentity message from native apps
 */
interface WCP4ValidateAppIdentity {
    type: 'WCP4ValidateAppIdentity';
    meta: {
        connectionAttemptUuid: string;
        timestamp: string;
    };
    payload: {
        identityUrl: string;
        actualUrl: string;
        instanceId?: string;
        instanceUuid?: string;
    };
}

/**
 * WCP5ValidateAppIdentityResponse - success response
 */
interface WCP5ValidateAppIdentityResponse {
    type: 'WCP5ValidateAppIdentityResponse';
    meta: {
        connectionAttemptUuid: string;
        timestamp: string;
    };
    payload: {
        appId: string;
        instanceId: string;
        instanceUuid: string;
        implementationMetadata: {
            fdc3Version: string;
            provider: string;
            providerVersion: string;
            appMetadata: {
                appId: string;
                instanceId: string;
            };
            optionalFeatures: {
                OriginatingAppMetadata: boolean;
                UserChannelMembershipAPIs: boolean;
                DesktopAgentBridging: boolean;
            };
        };
    };
}

/**
 * WCP5ValidateAppIdentityFailedResponse - failure response
 */
interface WCP5ValidateAppIdentityFailedResponse {
    type: 'WCP5ValidateAppIdentityFailedResponse';
    meta: {
        connectionAttemptUuid: string;
        timestamp: string;
    };
    payload: {
        message: string;
    };
}

/**
 * State for a connected remote app
 */
interface RemoteAppConnection {
    ws: WebSocket;
    userSessionId: string;
    appId: string;
    instanceId: string;
    instanceUuid: string;
    fdc3Server: SailFDC3Server;
}

// Map of websocket path -> remote app configuration
const remoteAppConfigs = new Map<string, { userSessionId: string; appId: string }>();

// Map of instanceId -> remote app connection
const remoteConnections = new Map<string, RemoteAppConnection>();

/**
 * Register a remote app configuration
 */
export function registerRemoteApp(userSessionId: string, remoteApp: RemoteApp): void {
    console.log(`SAIL Registering remote app: ${remoteApp.appId} at path ${remoteApp.websocketPath}`);
    remoteAppConfigs.set(remoteApp.websocketPath, {
        userSessionId,
        appId: remoteApp.appId
    });
}

/**
 * Unregister a remote app configuration
 */
export function unregisterRemoteApp(websocketPath: string): void {
    console.log(`SAIL Unregistering remote app at path ${websocketPath}`);
    remoteAppConfigs.delete(websocketPath);
}

/**
 * Update remote app configurations for a user session
 */
export function updateRemoteApps(userSessionId: string, remoteApps: RemoteApp[]): void {
    // Remove existing configs for this user session
    for (const [path, config] of remoteAppConfigs.entries()) {
        if (config.userSessionId === userSessionId) {
            remoteAppConfigs.delete(path);
        }
    }
    // Add new configs
    for (const remoteApp of remoteApps) {
        registerRemoteApp(userSessionId, remoteApp);
    }
}

/**
 * Initialize the WebSocket server for remote/native app connections
 */
export function initRemoteSocketService(
    httpServer: any,
    sessions: Map<string, SailFDC3Server>
): WebSocketServer {
    const wss = new WebSocketServer({ 
        server: httpServer,
        path: undefined // We'll handle path matching ourselves
    });

    // Handle upgrade requests to check the path
    httpServer.on('upgrade', (request: IncomingMessage, socket: any, head: Buffer) => {
        const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;
        
        // Check if this is a remote app path
        if (pathname.startsWith('/remote/')) {
            wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit('connection', ws, request);
            });
        }
        // Otherwise, let Socket.IO handle it (don't close the socket)
    });

    wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
        const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;
        console.log(`SAIL Remote WebSocket connection attempt on path: ${pathname}`);

        // Look up the remote app configuration for this path
        const config = remoteAppConfigs.get(pathname);
        
        if (!config) {
            console.error(`SAIL No remote app registered for path: ${pathname}`);
            ws.close(4000, 'No remote app registered for this path');
            return;
        }

        const fdc3Server = sessions.get(config.userSessionId);
        if (!fdc3Server) {
            console.error(`SAIL No session found for user: ${config.userSessionId}`);
            ws.close(4001, 'Session not found');
            return;
        }

        let connection: RemoteAppConnection | null = null;

        ws.on('message', async (data: Buffer) => {
            try {
                const message = JSON.parse(data.toString());
                console.log(`SAIL Remote WebSocket received: ${message.type}`);

                if (message.type === 'WCP4ValidateAppIdentity') {
                    connection = await handleValidateAppIdentity(
                        ws,
                        message as WCP4ValidateAppIdentity,
                        config,
                        fdc3Server
                    );
                } else if (connection) {
                    // Forward FDC3 API messages to the server
                    await handleFDC3Message(connection, message);
                } else {
                    console.error('SAIL Received message before identity validation');
                }
            } catch (error) {
                console.error('SAIL Error processing remote WebSocket message:', error);
            }
        });

        ws.on('close', () => {
            console.log(`SAIL Remote WebSocket closed for path: ${pathname}`);
            if (connection) {
                // Mark the app as terminated
                fdc3Server.serverContext.setAppState(connection.instanceId, State.Terminated);
                remoteConnections.delete(connection.instanceId);
            }
        });

        ws.on('error', (error) => {
            console.error(`SAIL Remote WebSocket error:`, error);
        });
    });

    console.log('SAIL Remote WebSocket service initialized');
    return wss;
}

/**
 * Handle WCP4ValidateAppIdentity message
 */
async function handleValidateAppIdentity(
    ws: WebSocket,
    message: WCP4ValidateAppIdentity,
    config: { userSessionId: string; appId: string },
    fdc3Server: SailFDC3Server
): Promise<RemoteAppConnection | null> {
    const { connectionAttemptUuid } = message.meta;
    const { instanceId: requestedInstanceId, instanceUuid: requestedInstanceUuid } = message.payload;

    // Verify this is a native app connection
    if (message.payload.identityUrl !== 'native' && message.payload.actualUrl !== 'native') {
        const failedResponse: WCP5ValidateAppIdentityFailedResponse = {
            type: 'WCP5ValidateAppIdentityFailedResponse',
            meta: {
                connectionAttemptUuid,
                timestamp: new Date().toISOString()
            },
            payload: {
                message: 'Only native apps are supported on this endpoint'
            }
        };
        ws.send(JSON.stringify(failedResponse));
        return null;
    }

    // Get the directory entry for this app
    const directoryApps = fdc3Server.getDirectory().retrieveAppsById(config.appId);
    if (directoryApps.length === 0) {
        const failedResponse: WCP5ValidateAppIdentityFailedResponse = {
            type: 'WCP5ValidateAppIdentityFailedResponse',
            meta: {
                connectionAttemptUuid,
                timestamp: new Date().toISOString()
            },
            payload: {
                message: `App not found: ${config.appId}`
            }
        };
        ws.send(JSON.stringify(failedResponse));
        return null;
    }

    // Generate or use provided instance ID and UUID
    const instanceId = requestedInstanceId || `remote-${uuid()}`;
    const instanceUuid = requestedInstanceUuid || uuid();

    // Check for reconnection
    const existingConnection = remoteConnections.get(instanceId);
    if (existingConnection) {
        if (existingConnection.instanceUuid !== instanceUuid) {
            const failedResponse: WCP5ValidateAppIdentityFailedResponse = {
                type: 'WCP5ValidateAppIdentityFailedResponse',
                meta: {
                    connectionAttemptUuid,
                    timestamp: new Date().toISOString()
                },
                payload: {
                    message: 'Instance UUID mismatch'
                }
            };
            ws.send(JSON.stringify(failedResponse));
            return null;
        }
        // Update the WebSocket for reconnection
        existingConnection.ws = ws;
        console.log(`SAIL Remote app reconnected: ${instanceId}`);
    }

    // Create the instance details in the server context
    const instanceDetails: SailData = {
        appId: config.appId,
        instanceId,
        state: State.Connected,
        hosting: AppHosting.Tab, // Remote apps are always considered as running in their own window
        channel: null,
        instanceTitle: `${directoryApps[0].title || config.appId} (Remote)`,
        channelSockets: []
    };

    fdc3Server.serverContext.setInstanceDetails(instanceId, instanceDetails);

    // Create the connection object
    const connection: RemoteAppConnection = {
        ws,
        userSessionId: config.userSessionId,
        appId: config.appId,
        instanceId,
        instanceUuid,
        fdc3Server
    };
    remoteConnections.set(instanceId, connection);

    // Send success response
    const successResponse: WCP5ValidateAppIdentityResponse = {
        type: 'WCP5ValidateAppIdentityResponse',
        meta: {
            connectionAttemptUuid,
            timestamp: new Date().toISOString()
        },
        payload: {
            appId: config.appId,
            instanceId,
            instanceUuid,
            implementationMetadata: {
                fdc3Version: fdc3Server.serverContext.fdc3Version(),
                provider: fdc3Server.serverContext.provider(),
                providerVersion: fdc3Server.serverContext.providerVersion(),
                appMetadata: {
                    appId: config.appId,
                    instanceId
                },
                optionalFeatures: {
                    OriginatingAppMetadata: true,
                    UserChannelMembershipAPIs: true,
                    DesktopAgentBridging: false
                }
            }
        }
    };

    ws.send(JSON.stringify(successResponse));
    console.log(`SAIL Remote app connected: ${config.appId} as ${instanceId}`);

    // Set up message forwarding from server to app
    setupServerToAppForwarding(connection);

    return connection;
}

/**
 * Set up message forwarding from server to app
 */
function setupServerToAppForwarding(connection: RemoteAppConnection): void {
    // Override the post method in the server context for this instance
    const originalPost = connection.fdc3Server.serverContext.post.bind(connection.fdc3Server.serverContext);
    
    // We need to intercept posts to this specific instance
    const instanceDetails = connection.fdc3Server.serverContext.getInstanceDetails(connection.instanceId);
    if (instanceDetails) {
        // Create a custom socket-like object that sends via WebSocket
        const remoteSocket = {
            emit: (event: string, message: any) => {
                if (event === 'fdc3-da-event' && connection.ws.readyState === WebSocket.OPEN) {
                    connection.ws.send(JSON.stringify(message));
                }
            }
        };
        // Store reference to the WebSocket for this instance
        (instanceDetails as any).remoteWebSocket = connection.ws;
    }
}

/**
 * Handle FDC3 API messages from the app
 */
async function handleFDC3Message(
    connection: RemoteAppConnection,
    message: any
): Promise<void> {
    const { fdc3Server, instanceId } = connection;

    try {
        // Forward the message to the FDC3 server
        const response = await fdc3Server.receive(message, instanceId);
        
        // Send the response back to the app
        if (response && connection.ws.readyState === WebSocket.OPEN) {
            connection.ws.send(JSON.stringify(response));
        }
    } catch (error) {
        console.error(`SAIL Error handling FDC3 message from remote app:`, error);
    }
}

/**
 * Send a message to a remote app
 */
export function sendToRemoteApp(instanceId: string, message: any): boolean {
    const connection = remoteConnections.get(instanceId);
    if (connection && connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(JSON.stringify(message));
        return true;
    }
    return false;
}

/**
 * Check if an instance is a remote app
 */
export function isRemoteApp(instanceId: string): boolean {
    return remoteConnections.has(instanceId);
}
