import { DesktopAgentHelloArgs } from "@finos/fdc3-sail-common"
import { SailFDC3ServerFactory } from "../SailFDC3ServerFactory"
import { ConnectionContext, ConnectionType } from "./types"
import { SocketIOConnection } from "../connection"
import { createLogger } from "../../logger"

const log = createLogger('DAHello')

/* eslint-disable  @typescript-eslint/no-explicit-any */

/**
 * Handle DA_HELLO message
 */
export async function handleDAHello(
    ctx: ConnectionContext,
    factory: SailFDC3ServerFactory,
    connection: SocketIOConnection,
    props: DesktopAgentHelloArgs,
    callback: (success: any, err?: string) => void
): Promise<void> {
    log.debug({ props }, 'DA_HELLO received')

    ctx.connectionType = ConnectionType.DESKTOP_AGENT
    ctx.userSessionId = props.userSessionId
    log.debug({ userSessionId: ctx.userSessionId }, 'Desktop Agent connecting')
    let fdc3Server = factory.getSession(ctx.userSessionId)

    if (fdc3Server) {
        // reconfiguring current session
        fdc3Server = await factory.createInstance(connection, props)
        log.debug({ sessionCount: factory.getSessionCount(), userSessionId: props.userSessionId }, 'Updated desktop agent channels and directories')
    } else {
        // starting session
        fdc3Server = await factory.createInstance(connection, props)
        log.info({ sessionCount: factory.getSessionCount(), userSessionId: props.userSessionId }, 'Created agent session')
    }

    ctx.fdc3ServerInstance = fdc3Server
    callback(true)
}
