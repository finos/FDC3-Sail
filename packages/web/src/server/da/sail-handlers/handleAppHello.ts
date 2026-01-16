import { AppHosting, AppHelloArgs, SailHostManifest } from "@finos/fdc3-sail-common"
import { State, WebAppDetails } from "@finos/fdc3-sail-da-impl"
import { SailFDC3ServerFactory } from "../SailFDC3ServerFactory"
import { SailData } from "../SailFDC3ServerInstance"
import { Connection } from "../connection"
import { ConnectionContext, ConnectionType, DEBUG_MODE } from "./types"

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
    console.log("SAIL APP HELLO: " + JSON.stringify(props))

    ctx.appInstanceId = props.instanceId
    ctx.userSessionId = props.userSessionId
    ctx.connectionType = ConnectionType.APP

    const fdc3Server = factory.getSession(ctx.userSessionId)

    if (fdc3Server != undefined) {
        console.log("SAIL An app connected: ", ctx.userSessionId, ctx.appInstanceId)
        const appInstance = fdc3Server.getInstanceDetails(ctx.appInstanceId)
        const directoryItem = fdc3Server.directory.retrieveAppsById(props.appId)
        if ((appInstance != undefined) && (appInstance.state == State.Pending)) {
            appInstance.connection = connection
            appInstance.url = (directoryItem[0].details as WebAppDetails).url
            ctx.fdc3ServerInstance = fdc3Server
            ctx.fdc3ServerInstance.setInstanceDetails(ctx.appInstanceId, appInstance)
            return callback(appInstance.hosting)
        } else if ((DEBUG_MODE && directoryItem.length > 0)) {
            console.error("App tried to connect with invalid instance id, allowing connection anyway ", ctx.appInstanceId)

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

        console.error("App tried to connect with invalid instance id")
        return callback(null, "Invalid instance id")

    } else {
        console.error("App Tried Connecting to non-existent DA Instance ", ctx.userSessionId, ctx.appInstanceId)
        callback(null, "App Tried Connecting to non-existent DA Instance")
    }
}
