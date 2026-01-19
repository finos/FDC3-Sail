import { DesktopAgentHelloArgs } from "@finos/fdc3-sail-common"
import { SailFDC3ServerFactory } from "../SailFDC3ServerFactory"
import { ConnectionContext, ConnectionType } from "./types"
import { SocketIOConnection } from "../connection"

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
    console.log("SAIL DA HELLO:" + JSON.stringify(props))

    ctx.connectionType = ConnectionType.DESKTOP_AGENT
    ctx.userSessionId = props.userSessionId
    console.log("SAIL Desktop Agent Connecting", ctx.userSessionId)
    let fdc3Server = factory.getSession(ctx.userSessionId)

    if (fdc3Server) {
        // reconfiguring current session
        fdc3Server = await factory.createInstance(connection, props)
        console.log("SAIL updated desktop agent channels and directories", factory.getSessionCount(), props.userSessionId)
    } else {
        // starting session
        fdc3Server = await factory.createInstance(connection, props)
        console.log("SAIL created agent session.  Running sessions ", factory.getSessionCount(), props.userSessionId)
    }

    ctx.fdc3ServerInstance = fdc3Server
    callback(true)
}
