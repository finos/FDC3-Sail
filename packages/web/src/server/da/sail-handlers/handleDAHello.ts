import { DesktopAgentHelloArgs } from "@finos/fdc3-sail-common"
import { SailFDC3ServerFactory } from "../SailFDC3ServerFactory"
import { Connection } from "../connection"
import { ConnectionContext, ConnectionType } from "./types"

/* eslint-disable  @typescript-eslint/no-explicit-any */

/**
 * Handle DA_HELLO message
 */
export function handleDAHello(
    ctx: ConnectionContext,
    factory: SailFDC3ServerFactory,
    connection: Connection,
    props: DesktopAgentHelloArgs,
    callback: (success: any, err?: string) => void
): void {
    console.log("SAIL DA HELLO:" + JSON.stringify(props))

    ctx.connectionType = ConnectionType.DESKTOP_AGENT
    ctx.userSessionId = props.userSessionId
    console.log("SAIL Desktop Agent Connecting", ctx.userSessionId)
    let fdc3Server = factory.getSession(ctx.userSessionId)

    if (fdc3Server) {
        // reconfiguring current session
        fdc3Server = factory.createInstance(connection, props)
        console.log("SAIL updated desktop agent channels and directories", factory.getSessionCount(), props.userSessionId)
        callback(true)
    } else {
        // starting session
        fdc3Server = factory.createInstance(connection, props)
        console.log("SAIL created agent session.  Running sessions ", factory.getSessionCount(), props.userSessionId)
        callback(true)
    }

    ctx.fdc3ServerInstance = fdc3Server
}
