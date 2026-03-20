import { State } from "@finos/fdc3-sail-da-impl"
import { SailFDC3ServerFactory } from "../SailFDC3ServerFactory"
import { ConnectionContext, ConnectionType } from "./types"
import { createLogger } from "../../logger"

const log = createLogger('Disconnect')

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
            log.debug({ remainingApps: remaining.length }, 'App disconnected')
        } else if (ctx.connectionType == ConnectionType.CHANNEL) {
            const appId = ctx.appInstanceId!
            const details = ctx.fdc3ServerInstance.getInstanceDetails(appId!)
            if (details) {
                details.channelConnections = []
                ctx.fdc3ServerInstance.setInstanceDetails(appId, details)
                log.debug({ appInstanceId: ctx.appInstanceId, userSessionId: ctx.userSessionId }, 'Channel Selector disconnected')
            }
        } else {
            ctx.fdc3ServerInstance.shutdown()
            factory.shutdownInstance(ctx.userSessionId!)
            log.info({ userSessionId: ctx.userSessionId }, 'Desktop Agent disconnected')
        }
    } else {
        log.warn('Disconnect event with no server instance')
    }
}
