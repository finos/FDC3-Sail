import { ConnectionContext } from "./types"
import { BrowserTypes } from "@finos/fdc3-schema"
import { isWebConnectionProtocol4ValidateAppIdentity } from "@finos/fdc3-schema/dist/generated/api/BrowserTypes"
import { AppHosting } from "@finos/fdc3-sail-common"
import { DirectoryApp, State } from "@finos/fdc3-sail-da-impl"
import { v4 as uuid } from 'uuid'
import { WebSocketConnection } from "../connection"
import { createLogger } from "../../logger"
import { SailData } from "../SailFDC3ServerInstance"

const log = createLogger('RemoteAppMessage')

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
        log.error('No FDC3 server instance in context')
        return
    }

    // Parse the message type
    const messageType = data.type

    if (!messageType) {
        log.error({ data }, 'Message missing type field')
        return
    }

    // Log non-heartbeat messages
    if (!messageType.startsWith("heartbeat")) {
        log.debug({ messageType, data: JSON.stringify(data).substring(0, 200) }, 'Remote message received')
    }

    // Handle WCP4ValidateAppIdentity specially to register and validate the app
    if (isWebConnectionProtocol4ValidateAppIdentity(data)) {
        handleValidateAppIdentity(ctx, nativeApp, connection, data as WebConnectionProtocol4ValidateAppIdentity)
        return
    }

    // For all other messages, we need an instanceId
    if (!ctx.appInstanceId) {
        log.error({ messageType }, 'Received message before identity validation')
        return
    }

    // Forward the message to the FDC3 server
    try {
        ctx.fdc3ServerInstance.receive(data, ctx.appInstanceId)
    } catch (e) {
        log.error({ error: e }, 'Error processing message')
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

    log.debug({ appId, instanceId, instanceUuid }, 'ValidateAppIdentity')

    try {
        if (instanceUuid) {
            // Reconnecting app - look up existing identity
            log.debug({ instanceUuid }, 'App attempting to reconnect')
            const appIdentity = ctx.fdc3ServerInstance!.getInstanceDetails(instanceUuid)

            if (appIdentity) {
                reconnectExistingInstance(ctx, connection, msg, appIdentity)
            } else {
                log.info('Existing identity not found, creating new one')
                registerNewInstance(ctx, nativeApp, connection, msg, appId)
            }
        } else {
            // New app - register a new instance
            log.info('New app - registering new instance')
            registerNewInstance(ctx, nativeApp, connection, msg, appId)
        }
    } catch (e) {
        log.error({ error: e }, 'Error handling ValidateAppIdentity')
    }
}

/**
 * Reconnects an existing remote app instance with a new connection.
 */
function reconnectExistingInstance(
    ctx: ConnectionContext,
    connection: WebSocketConnection,
    msg: WebConnectionProtocol4ValidateAppIdentity,
    appIdentity: SailData
): void {
    log.info({ appId: appIdentity.appId, instanceId: appIdentity.instanceId }, 'Reassigned existing identity for reconnecting app')
    ctx.appInstanceId = appIdentity.instanceId

    // Update the connection for the existing instance
    ctx.fdc3ServerInstance!.setInstanceDetails(appIdentity.instanceId, {
        ...appIdentity,
        connection: connection
    })

    // Forward to FDC3 server for validation
    ctx.fdc3ServerInstance!.receive(msg, appIdentity.instanceId)
}

/**
 * Registers a new remote app instance and forwards the validation message.
 */
function registerNewInstance(
    ctx: ConnectionContext,
    nativeApp: DirectoryApp,
    connection: WebSocketConnection,
    msg: WebConnectionProtocol4ValidateAppIdentity,
    appId: string,
): void {
    const newInstanceId = 'sail-remote-' + uuid()
    ctx.appInstanceId = newInstanceId

    log.info({ appId, instanceId: newInstanceId }, 'Registering new remote app instance')

    ctx.fdc3ServerInstance!.setInstanceDetails(newInstanceId, {
        instanceId: newInstanceId,
        state: State.Pending,
        appId: appId,
        connection: connection,
        hosting: AppHosting.Remote,
        channel: null,
        instanceTitle: `${nativeApp.title || appId} (Remote)`,
        channelConnections: []
    })

    // Forward to FDC3 server for validation
    ctx.fdc3ServerInstance!.receive(msg, newInstanceId)
}
