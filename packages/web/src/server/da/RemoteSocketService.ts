import { WebSocketServer, WebSocket } from "ws"
import { IncomingMessage } from "http"
import { SailFDC3ServerFactory } from "./SailFDC3ServerFactory"
import { WebSocketConnection } from "./connection/WebSocketConnection"
import { createConnectionContext } from "./sail-handlers"
import { RemoteApp } from "@finos/fdc3-sail-common"

/* eslint-disable  @typescript-eslint/no-explicit-any */

/**
 * Manages WebSocket endpoints for remote/native applications.
 * 
 * Remote apps (like Java applications) connect via WebSocket to paths matching:
 * /remote/{userSessionId}/{websocketPath}
 * 
 * This service dynamically enables/disables endpoints based on the RemoteApp
 * entries in the ClientState.
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
                // Expected format: /remote/{userSessionId}/{websocketPath}
                if (parts.length >= 3) {
                    const userSessionId = parts[1]
                    const websocketPath = parts.slice(2).join("/")

                    // Check if this path is active
                    if (this.isPathActive(userSessionId, websocketPath)) {
                        this.wss.handleUpgrade(request, socket, head, (ws) => {
                            this.wss.emit('connection', ws, request, { userSessionId, websocketPath })
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
        this.wss.on('connection', (ws: WebSocket, _request: IncomingMessage, meta: { userSessionId: string, websocketPath: string }) => {
            console.log(`SAIL Remote WebSocket client connected: ${meta.userSessionId}/${meta.websocketPath}`)

            const remoteApp = this.getRemoteApp(meta.websocketPath)
            if (!remoteApp) {
                console.error(`SAIL Remote app not found for path: ${meta.websocketPath}`)
                ws.close()
                return
            }

            const ctx = createConnectionContext()
            ctx.userSessionId = meta.userSessionId

            const connection = new WebSocketConnection(ws as any)
            handleAllMessageTypes(ctx, this.factory, connection)

            ws.on('close', () => {
                console.log(`SAIL Remote WebSocket client disconnected: ${meta.userSessionId}/${meta.websocketPath}`)
            })

            ws.on('error', (error) => {
                console.error(`SAIL Remote WebSocket error: ${meta.userSessionId}/${meta.websocketPath}`, error)
            })
        })
    }

    private isPathActive(userSessionId: string, websocketPath: string): boolean {
        // Check if userSessionId matches and the websocketPath is in our active list
        if (this.userSessionId && this.userSessionId !== userSessionId) {
            return false
        }
        return this.activeRemoteApps.has(websocketPath)
    }

    private getRemoteApp(websocketPath: string): RemoteApp | undefined {
        return this.activeRemoteApps.get(websocketPath)
    }

    /**
     * Refresh the available remote socket endpoints based on the provided remote apps.
     * This enables new endpoints and disables ones that are no longer configured.
     */
    refreshAvailableRemoteSockets(userSessionId: string, remoteApps: RemoteApp[]): void {
        const newPaths = new Set(remoteApps.map(app => app.websocketPath))

        // Find paths to disable (in active but not in new)
        const pathsToDisable: string[] = []
        for (const path of this.activeRemoteApps.keys()) {
            if (!newPaths.has(path)) {
                pathsToDisable.push(path)
            }
        }

        // Find paths to enable (in new but not in active)
        const appsToEnable: RemoteApp[] = []
        for (const app of remoteApps) {
            if (!this.activeRemoteApps.has(app.websocketPath)) {
                appsToEnable.push(app)
            }
        }

        // Disable old paths
        for (const path of pathsToDisable) {
            console.log(`SAIL Disabling remote socket path: /remote/${this.userSessionId}/${path}`)
            this.activeRemoteApps.delete(path)
        }

        // Enable new paths
        for (const app of appsToEnable) {
            console.log(`SAIL Enabling remote socket path: /remote/${userSessionId}/${app.websocketPath}`)
            this.activeRemoteApps.set(app.websocketPath, app)
        }

        // Update session ID
        this.userSessionId = userSessionId

        console.log(`SAIL RemoteSocketService: ${this.activeRemoteApps.size} active remote app paths`)
    }

    /**
     * Get the list of currently active remote app paths.
     */
    getActivePaths(): string[] {
        return Array.from(this.activeRemoteApps.keys()).map(
            path => `/remote/${this.userSessionId}/${path}`
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
