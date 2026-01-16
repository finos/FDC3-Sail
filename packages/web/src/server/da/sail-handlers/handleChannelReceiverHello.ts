import { ChannelReceiverUpdate, ChannelReceiverHelloRequest } from "@finos/fdc3-sail-common"
import { SailFDC3ServerFactory } from "../SailFDC3ServerFactory"
import { Connection } from "../connection"
import { ConnectionContext, ConnectionType } from "./types"

/**
 * Handle CHANNEL_RECEIVER_HELLO message
 */
export function handleChannelReceiverHello(
    ctx: ConnectionContext,
    factory: SailFDC3ServerFactory,
    connection: Connection,
    props: ChannelReceiverHelloRequest,
    callback: (success: ChannelReceiverUpdate | undefined, err?: string) => void
): void {
    ctx.userSessionId = props.userSessionId
    ctx.appInstanceId = props.instanceId
    ctx.connectionType = ConnectionType.CHANNEL

    ctx.fdc3ServerInstance = factory.getSession(ctx.userSessionId)
    const appInstance = ctx.fdc3ServerInstance?.getInstanceDetails(props.instanceId)
    if (appInstance) {
        appInstance.channelConnections.push(connection)
        callback({
            tabs: ctx.fdc3ServerInstance!.getTabs()
        })
    } else {
        callback(undefined, "No app found")
    }
}
