import { WebSocketServer, WebSocket } from "ws"
import { IncomingMessage } from "http"
import { SailFDC3ServerFactory } from "./SailFDC3ServerFactory"
import { WebSocketConnection } from "./connection/WebSocketConnection"
import { createConnectionContext } from "./sail-handlers"
import { RemoteApp } from "@finos/fdc3-sail-common"
import { handleDisconnect } from "./sail-handlers/handleDisconnect"
import { handleRemoteAppMessage } from "./sail-handlers/handleRemoteAppMessage"

/* eslint-disable  @typescript-eslint/no-explicit-any */

/**
 * Manages WebSocket endpoints for remote/native applications.
 * 
 * Remote apps (like Java applications) connect via WebSocket to URLs of the form:
 *   /remote/{userSessionId}/{applicationExtensionId}
 * 
 * Where:
 * - userSessionId: The session ID of the browser desktop agent
 * - applicationExtensionId: Unique identifier for the remote app type (from RemoteApp config)
 * 
 * This service dynamically enables/disables endpoints based on the RemoteApp
 * entries provided via refreshAvailableRemoteSockets().
 */
export class RemoteSocketService {
    private readonly factory: SailFDC3ServerFactory
    private readonly httpServer: any
    private readonly wss: WebSocketServer
    private activeRemoteApps: Map<string, RemoteApp> = new Map()
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

        console.log("SAIL RemoteSocketService initialized")
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
                        console.log(`SAIL Remote connection rejected - path not active: ${pathname}`)
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
            console.log(`SAIL Remote WebSocket client connected: ${meta.userSessionId}/${meta.applicationExtensionId}`)

            const remoteApp = this.getRemoteApp(meta.applicationExtensionId)
            if (!remoteApp) {
                console.error(`SAIL Remote app not found for applicationExtensionId: ${meta.applicationExtensionId}`)
                ws.close()
                return
            }

            // Get the FDC3 server instance for this user session
            const fdc3Server = this.factory.getSession(meta.userSessionId)
            if (!fdc3Server) {
                console.error(`SAIL Remote: No FDC3 session found for userSessionId: ${meta.userSessionId}`)
                ws.close()
                return
            }

            const connection = new WebSocketConnection(ws as any)

            const ctx = createConnectionContext()
            ctx.userSessionId = meta.userSessionId
            ctx.fdc3ServerInstance = fdc3Server

            ws.on('message', (rawData: any) => {
                try {
                    // Parse the incoming data - it comes as a Buffer from the ws library
                    const jsonString = rawData instanceof Buffer ? rawData.toString('utf8') : rawData.toString()
                    const data = JSON.parse(jsonString)
                    handleRemoteAppMessage(ctx, remoteApp, connection, data)
                } catch (e) {
                    console.error(`SAIL Remote: Failed to parse message:`, e)
                }
            })

            ws.on('close', () => handleDisconnect(ctx, this.factory))

            ws.on('error', (error) => {
                console.error(`SAIL Remote WebSocket error: ${meta.userSessionId}/${meta.applicationExtensionId}`, error)
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

    private getRemoteApp(applicationExtensionId: string): RemoteApp | undefined {
        return this.activeRemoteApps.get(applicationExtensionId)
    }

    /**
     * Refresh the available remote socket endpoints based on the provided remote apps.
     * This enables new endpoints and disables ones that are no longer configured.
     */
    refreshAvailableRemoteSockets(userSessionId: string, remoteApps: RemoteApp[]): void {
        const newIds = new Set(remoteApps.map(app => app.applicationExtensionId))

        // Find IDs to disable (in active but not in new)
        const idsToDisable: string[] = []
        for (const id of this.activeRemoteApps.keys()) {
            if (!newIds.has(id)) {
                idsToDisable.push(id)
            }
        }

        // Find apps to enable (in new but not in active)
        const appsToEnable: RemoteApp[] = []
        for (const app of remoteApps) {
            if (!this.activeRemoteApps.has(app.applicationExtensionId)) {
                appsToEnable.push(app)
            }
        }

        // Disable old endpoints
        for (const id of idsToDisable) {
            console.log(`SAIL Disabling remote socket: /remote/${this.userSessionId}/${id}`)
            this.activeRemoteApps.delete(id)
        }

        // Enable new endpoints
        for (const app of appsToEnable) {
            console.log(`SAIL Enabling remote socket: /remote/${userSessionId}/${app.applicationExtensionId}`)
            this.activeRemoteApps.set(app.applicationExtensionId, app)
        }

        // Update session ID
        this.userSessionId = userSessionId

        console.log(`SAIL RemoteSocketService: ${this.activeRemoteApps.size} active remote app endpoints`)
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
        console.log("SAIL RemoteSocketService shutdown")
    }
}
