import { ElectronHelloArgs, ElectronAppResponse, ElectronDAResponse } from "@finos/fdc3-sail-common"
import { v4 as uuid } from 'uuid'
import { SailFDC3ServerFactory } from "../SailFDC3ServerFactory"
import { ConnectionContext, getSailUrl } from "./types"
import { SocketIOConnection } from "../connection"
import { createLogger } from "../../logger"

const log = createLogger('ElectronHello')

/* eslint-disable  @typescript-eslint/no-explicit-any */

/**
 * Handle ELECTRON_HELLO message
 */
export async function handleElectronHello(
    ctx: ConnectionContext,
    factory: SailFDC3ServerFactory,
    connection: SocketIOConnection,
    props: ElectronHelloArgs,
    callback: (success: any, err?: string) => void
): Promise<void> {
    log.debug({ props }, 'ELECTRON_HELLO received')
    let fdc3Server = factory.getSession(props.userSessionId)

    if (fdc3Server) {
        const allApps = fdc3Server.getDirectory().retrieveAppsByUrl(props.url)

        if (allApps.length > 0) {
            log.debug({ appId: allApps[0].appId }, 'Found app')
            callback({
                type: 'app',
                userSessionId: ctx.userSessionId,
                appId: allApps[0].appId,
                instanceId: 'sail-app-' + uuid(),
                intentResolver: null,
                channelSelector: null
            } as ElectronAppResponse)
        } else {
            log.error({ url: props.url }, 'App not found')
            callback(null, "App not found")
        }
    } else if (props.url == getSailUrl()) {
        ctx.userSessionId = props.userSessionId
        fdc3Server = await factory.createInstance(connection, props)

        callback({
            type: 'da',
        } as ElectronDAResponse)
    } else {
        log.error({ userSessionId: ctx.userSessionId }, 'Session not found')
    }
}
