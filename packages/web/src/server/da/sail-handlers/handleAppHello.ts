import { AppHosting, AppHelloArgs, SailHostManifest } from "@finos/fdc3-sail-common"
import { State, WebAppDetails } from "@finos/fdc3-sail-da-impl"
import { SailFDC3ServerFactory } from "../SailFDC3ServerFactory"
import { SailData } from "../SailFDC3ServerInstance"
import { Connection } from "../connection/Connection"
import { ConnectionContext, ConnectionType, DEBUG_MODE } from "./types"
import { createLogger } from "../../logger"

const log = createLogger('AppHello')

/* eslint-disable  @typescript-eslint/no-explicit-any */

let debugReconnectionNumber = 0

/**
 * Handle APP_HELLO message
 */
export function handleAppHello(
    ctx: ConnectionContext,
    factory: SailFDC3ServerFactory,
    connection: Connection,
    props: AppHelloArgs,
    callback: (success: any, err?: string) => void
): void {
    log.debug({ props }, 'APP_HELLO received')

    ctx.appInstanceId = props.instanceId
    ctx.userSessionId = props.userSessionId
    ctx.connectionType = ConnectionType.APP

    const fdc3Server = factory.getSession(ctx.userSessionId)

    if (fdc3Server != undefined) {
        log.debug({ userSessionId: ctx.userSessionId, appInstanceId: ctx.appInstanceId }, 'App connected')
        const appInstance = fdc3Server.getInstanceDetails(ctx.appInstanceId)
        const directoryItem = fdc3Server.directory.retrieveAppsById(props.appId)
        if ((appInstance != undefined) && (appInstance.state == State.Pending)) {
            appInstance.connection = connection
            appInstance.url = (directoryItem[0].details as WebAppDetails).url
            ctx.fdc3ServerInstance = fdc3Server
            ctx.fdc3ServerInstance.setInstanceDetails(ctx.appInstanceId, appInstance)
            return callback(appInstance.hosting)
        } else if ((DEBUG_MODE && directoryItem.length > 0)) {
            log.warn({ appInstanceId: ctx.appInstanceId }, 'App tried to connect with invalid instance id, allowing connection anyway')

            const shm: SailHostManifest = directoryItem[0]?.hostManifests?.sail as any

            const instanceDetails: SailData = {
                appId: props.appId,
                instanceId: ctx.appInstanceId,
                state: State.Pending,
                connection,
                url: (directoryItem[0].details as WebAppDetails).url,
                hosting: shm?.forceNewWindow ? AppHosting.Tab : AppHosting.Frame,
                channel: null,
                instanceTitle: directoryItem[0].title + " - RECOVERED " + debugReconnectionNumber++,
                channelConnections: []
            }

            fdc3Server.setInstanceDetails(ctx.appInstanceId, instanceDetails)

            ctx.fdc3ServerInstance = fdc3Server
            return callback(instanceDetails.hosting)
        }

        log.error({ appInstanceId: ctx.appInstanceId }, 'App tried to connect with invalid instance id')
        return callback(null, "Invalid instance id")

    } else {
        log.error({ userSessionId: ctx.userSessionId, appInstanceId: ctx.appInstanceId }, 'App tried connecting to non-existent DA instance')
        callback(null, "App Tried Connecting to non-existent DA Instance")
    }
}
