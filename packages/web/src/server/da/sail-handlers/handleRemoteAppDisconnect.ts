import { State } from "@finos/fdc3-sail-da-impl"
import { ConnectionContext } from "./types"
import { createLogger } from "../../logger"

const log = createLogger('RemoteAppDisconnect')

/**
 * Handle disconnect event for a remote/native app connected via WebSocket.
 * This is separate from handleDisconnect which handles iframe-based app connections.
 */
export async function handleRemoteAppDisconnect(
    ctx: ConnectionContext
): Promise<void> {
    if (ctx.fdc3ServerInstance && ctx.appInstanceId) {
        await ctx.fdc3ServerInstance.setAppState(ctx.appInstanceId, State.Terminated)
        const remaining = await ctx.fdc3ServerInstance.getConnectedApps()
        log.debug({ appInstanceId: ctx.appInstanceId, remainingApps: remaining.length }, 'Remote app disconnected')
    } else {
        log.debug('Remote app disconnect: No server instance or app instance ID')
    }
}
