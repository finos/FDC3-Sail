import { ConnectionContext } from "./types"
import { BrowserTypes } from "@finos/fdc3-schema"
import { isWebConnectionProtocol4ValidateAppIdentity } from "@finos/fdc3-schema/dist/generated/api/BrowserTypes"
import { AppHosting } from "@finos/fdc3-sail-common"
import { DirectoryApp, State } from "@finos/fdc3-sail-da-impl"
import { v4 as uuid } from 'uuid'
import { WebSocketConnection } from "../connection"

/* eslint-disable  @typescript-eslint/no-explicit-any */

type WebConnectionProtocol4ValidateAppIdentity = BrowserTypes.WebConnectionProtocol4ValidateAppIdentity


/**
 * Messages are routed to the FDC3ServerInstance.receive() method.
 * WCP4ValidateAppIdentity is handled specially to register and establish the app's identity.
 */
export function handleRemoteAppMessage(
    ctx: ConnectionContext,
    nativeApp: DirectoryApp,
    connection: WebSocketConnection,
    data: any
): void {
    if (!ctx.fdc3ServerInstance) {
        console.error("SAIL Remote: No FDC3 server instance in context")
        return
    }

    // Parse the message type
    const messageType = data.type

    if (!messageType) {
        console.error("SAIL Remote: Message missing 'type' field", data)
        return
    }

    // Log non-heartbeat messages
    if (!messageType.startsWith("heartbeat")) {
        console.log(`SAIL Remote message: ${messageType}`, JSON.stringify(data).substring(0, 200))
    }

    // Handle WCP4ValidateAppIdentity specially to register and validate the app
    if (isWebConnectionProtocol4ValidateAppIdentity(data)) {
        handleValidateAppIdentity(ctx, nativeApp, connection, data as WebConnectionProtocol4ValidateAppIdentity)
        return
    }

    // For all other messages, we need an instanceId
    if (!ctx.appInstanceId) {
        console.error("SAIL Remote: Received message before identity validation", messageType)
        return
    }

    // Forward the message to the FDC3 server
    try {
        ctx.fdc3ServerInstance.receive(data, ctx.appInstanceId)
    } catch (e) {
        console.error("SAIL Remote: Error processing message", e)
    }
}

/**
 * Handles WCP4ValidateAppIdentity message from remote apps.
 * 
 * Two scenarios:
 * 1. **Reconnecting app**: instanceUuid is provided - OpenHandler will look up existing identity
 * 2. **New app**: instanceUuid is not provided - we register the app instance first,
 *    then OpenHandler will find it by the instanceId we provide
 * 
 * Unlike web apps (which are registered via DA_REGISTER_APP_LAUNCH before connecting),
 * remote apps are registered here when they first connect.
 */
function handleValidateAppIdentity(
    ctx: ConnectionContext,
    nativeApp: DirectoryApp,
    connection: WebSocketConnection,
    msg: WebConnectionProtocol4ValidateAppIdentity
): void {
    const instanceUuid = msg.payload.instanceUuid
    const instanceId = msg.payload.instanceId
    const appId = nativeApp.appId!

    console.log(`SAIL Remote: ValidateAppIdentity - appId: ${appId}, instanceId: ${instanceId}, instanceUuid: ${instanceUuid}`)

    // Determine the instance ID for this connection
    // - If reconnecting (instanceUuid provided), use that
    // - Otherwise, generate a new one
    const resolvedInstanceId = instanceUuid || instanceId || 'sail-remote-' + uuid()
    ctx.appInstanceId = resolvedInstanceId

    // For new apps (no instanceUuid), we need to register the instance
    // This is equivalent to what DA_REGISTER_APP_LAUNCH does for web apps
    if (!instanceUuid) {
        console.log(`SAIL Remote: Registering new remote app instance - appId: ${appId}, instanceId: ${resolvedInstanceId}`)
        ctx.fdc3ServerInstance!.setInstanceDetails(resolvedInstanceId, {
            instanceId: resolvedInstanceId,
            state: State.Pending,
            appId: appId,
            connection: connection,
            hosting: AppHosting.Remote,
            channel: null,
            instanceTitle: `${nativeApp.title || appId} (Remote)`,
            channelConnections: []
        })
    }

    // Forward to the FDC3 server for validation
    // OpenHandler.handleValidate will:
    // - If instanceUuid is provided: look up existing identity and reassign to this connection
    // - If new: find the instance we just registered and confirm it
    try {
        ctx.fdc3ServerInstance!.receive(msg, resolvedInstanceId)
    } catch (e) {
        console.error("SAIL Remote: Error handling ValidateAppIdentity", e)
    }
}
