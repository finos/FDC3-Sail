import { State } from "@finos/fdc3-sail-da-impl"
import { SailFDC3ServerFactory } from "../SailFDC3ServerFactory"
import { ConnectionContext, ConnectionType } from "./types"

/**
 * Handle disconnect event
 */
export async function handleDisconnect(
    ctx: ConnectionContext,
    factory: SailFDC3ServerFactory
): Promise<void> {
    if (ctx.fdc3ServerInstance) {
        if (ctx.connectionType == ConnectionType.APP) {
            await ctx.fdc3ServerInstance.setAppState(ctx.appInstanceId!, State.Terminated)
            const remaining = await ctx.fdc3ServerInstance.getConnectedApps()
            console.error(`Apparent app disconnect: ${remaining.length} apps remaining`)
        } else if (ctx.connectionType == ConnectionType.CHANNEL) {
            const appId = ctx.appInstanceId!
            const details = ctx.fdc3ServerInstance.getInstanceDetails(appId!)
            if (details) {
                details.channelConnections = []
                ctx.fdc3ServerInstance.setInstanceDetails(appId, details)
                console.error(`Channel Selector Disconnect`, ctx.appInstanceId, ctx.userSessionId)
            }
        } else {
            ctx.fdc3ServerInstance.shutdown()
            factory.shutdownInstance(ctx.userSessionId!)
            console.error("Desktop Agent Disconnected", ctx.userSessionId)
        }
    } else {
        console.error("No Server instance")
    }
}
