import { WebSocketServer, WebSocket } from "ws"
import { IncomingMessage } from "http"
import { SailFDC3ServerFactory } from "./SailFDC3ServerFactory"
import { WebSocketConnection } from "./connection/WebSocketConnection"
import { createConnectionContext } from "./sail-handlers"
import { FDC3_WEBSOCKET_PROPERTY } from "@finos/fdc3-sail-common"
import { DirectoryApp } from "@finos/fdc3-sail-da-impl"
import { handleRemoteAppMessage } from "./sail-handlers/handleRemoteAppMessage"
import { handleRemoteAppDisconnect } from "./sail-handlers/handleRemoteAppDisconnect"
import { createLogger } from "../logger"

const log = createLogger('RemoteSocket')

/* eslint-disable  @typescript-eslint/no-explicit-any */

/**
 * Extracts the applicationExtensionId from a native app's connectionUrl.
 * The connectionUrl format is: {urlBase}/{applicationExtensionId}
 */
function extractApplicationExtensionId(app: DirectoryApp): string | undefined {
    const connectionUrl = (app.details as any)?.[FDC3_WEBSOCKET_PROPERTY]
    if (!connectionUrl) return undefined
    // The applicationExtensionId is the last segment of the URL path
    const parts = connectionUrl.split('/').filter((p: string) => p.length > 0)
    return parts[parts.length - 1]
}

/**
 * Manages WebSocket endpoints for remote/native applications.
 * 
 * Remote apps (like Java applications) connect via WebSocket to URLs of the form:
 *   /remote/{userSessionId}/{applicationExtensionId}
 * 
 * Where:
 * - userSessionId: The session ID of the browser desktop agent
 * - applicationExtensionId: Unique identifier derived from the native app's connectionUrl
 * 
 * This service dynamically enables/disables endpoints based on native apps
 * in the directory that have the FDC3_WEBSOCKET_PROPERTY set.
 */
export class RemoteSocketService {
    private readonly factory: SailFDC3ServerFactory
    private readonly httpServer: any
    private readonly wss: WebSocketServer
    private activeRemoteApps: Map<string, DirectoryApp> = new Map()
    private userSessionId: string | undefined

    constructor(httpServer: any, factory: SailFDC3ServerFactory) {
        this.httpServer = httpServer
        this.factory = factory

        // Create a single WebSocket server that handles all /remote/* paths
        this.wss = new WebSocketServer({
            noServer: true
        })

        this.setupUpgradeHandler()
        this.setupConnectionHandler()

        log.info('RemoteSocketService initialized')
    }

    private setupUpgradeHandler(): void {
        this.httpServer.on('upgrade', (request: IncomingMessage, socket: any, head: Buffer) => {
            const pathname = request.url || ""

            // Check if this is a remote app connection
            if (pathname.startsWith("/remote/")) {
                const parts = pathname.split("/").filter(p => p.length > 0)
                // Expected format: /remote/{userSessionId}/{applicationExtensionId}
                if (parts.length >= 3) {
                    const userSessionId = parts[1]
                    const applicationExtensionId = parts[2]

                    // Check if this path is active
                    if (this.isPathActive(userSessionId, applicationExtensionId)) {
                        this.wss.handleUpgrade(request, socket, head, (ws) => {
                            this.wss.emit('connection', ws, request, { userSessionId, applicationExtensionId })
                        })
                        return
                    } else {
                        log.error({ pathname }, 'Remote connection rejected - path not active')
                        socket.destroy()
                        return
                    }
                }
            }
            // If not a remote path, let other handlers deal with it
        })
    }

    private setupConnectionHandler(): void {
        this.wss.on('connection', (ws: WebSocket, _request: IncomingMessage, meta: { userSessionId: string, applicationExtensionId: string }) => {
            log.info({ userSessionId: meta.userSessionId, applicationExtensionId: meta.applicationExtensionId }, 'Remote WebSocket client connected')

            const remoteApp = this.getRemoteApp(meta.applicationExtensionId)
            if (!remoteApp) {
                log.error({ applicationExtensionId: meta.applicationExtensionId }, 'Remote app not found')
                ws.close()
                return
            }

            // Get the FDC3 server instance for this user session
            const fdc3Server = this.factory.getSession(meta.userSessionId)
            if (!fdc3Server) {
                log.error({ userSessionId: meta.userSessionId }, 'No FDC3 session found')
                ws.close()
                return
            }

            const connection = new WebSocketConnection(ws as any)

            const ctx = createConnectionContext()
            ctx.userSessionId = meta.userSessionId
            ctx.fdc3ServerInstance = fdc3Server

            ws.on('message', (data: Buffer | string) => {
                try {
                    const message = JSON.parse(data.toString())
                    handleRemoteAppMessage(ctx, remoteApp, connection, message)
                } catch (e) {
                    log.error({ error: e }, 'Remote: Failed to parse message as JSON')
                }
            })

            ws.on('close', () => handleRemoteAppDisconnect(ctx))

            ws.on('error', (error) => {
                log.error({ userSessionId: meta.userSessionId, applicationExtensionId: meta.applicationExtensionId, error }, 'Remote WebSocket error')
            })
        })
    }

    private isPathActive(userSessionId: string, applicationExtensionId: string): boolean {
        // Check if userSessionId matches and the applicationExtensionId is in our active list
        if (this.userSessionId && this.userSessionId !== userSessionId) {
            return false
        }
        return this.activeRemoteApps.has(applicationExtensionId)
    }

    private getRemoteApp(applicationExtensionId: string): DirectoryApp | undefined {
        return this.activeRemoteApps.get(applicationExtensionId)
    }

    /**
     * Refresh the available remote socket endpoints based on native apps in the directory.
     * Only apps with the FDC3_WEBSOCKET_PROPERTY set will be enabled.
     * This enables new endpoints and disables ones that are no longer configured.
     */
    refreshAvailableRemoteSockets(userSessionId: string, nativeApps: DirectoryApp[]): void {
        // Build a map of applicationExtensionId -> DirectoryApp for new apps
        const newAppsMap = new Map<string, DirectoryApp>()
        for (const app of nativeApps) {
            const extId = extractApplicationExtensionId(app)
            if (extId) {
                newAppsMap.set(extId, app)
            }
        }

        // Find IDs to disable (in active but not in new)
        const idsToDisable: string[] = []
        for (const id of this.activeRemoteApps.keys()) {
            if (!newAppsMap.has(id)) {
                idsToDisable.push(id)
            }
        }

        // Find apps to enable (in new but not in active)
        const appsToEnable: [string, DirectoryApp][] = []
        for (const [extId, app] of newAppsMap) {
            if (!this.activeRemoteApps.has(extId)) {
                appsToEnable.push([extId, app])
            }
        }

        // Disable old endpoints
        for (const id of idsToDisable) {
            log.debug({ path: `/remote/${this.userSessionId}/${id}` }, 'Disabling remote socket')
            this.activeRemoteApps.delete(id)
        }

        // Enable new endpoints
        for (const [extId, app] of appsToEnable) {
            log.debug({ path: `/remote/${userSessionId}/${extId}`, appId: app.appId }, 'Enabling remote socket')
            this.activeRemoteApps.set(extId, app)
        }

        // Update session ID
        this.userSessionId = userSessionId

        log.debug({ activeEndpoints: this.activeRemoteApps.size }, 'RemoteSocketService refreshed')
    }

    /**
     * Get the list of currently active remote app paths.
     */
    getActivePaths(): string[] {
        return Array.from(this.activeRemoteApps.keys()).map(
            id => `/remote/${this.userSessionId}/${id}`
        )
    }

    /**
     * Shutdown the service and close all connections.
     */
    shutdown(): void {
        this.wss.close()
        this.activeRemoteApps.clear()
        log.info('RemoteSocketService shutdown')
    }
}
