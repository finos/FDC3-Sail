import { BroadcastRequest } from "@finos/fdc3-schema/dist/generated/api/BrowserTypes"
import { ConnectionContext } from "./types"
import { createLogger } from "../../logger"

const log = createLogger('FDC3AppEvent')

/* eslint-disable  @typescript-eslint/no-explicit-any */

/**
 * Handle FDC3_APP_EVENT message
 */
export function handleFDC3AppEvent(
    ctx: ConnectionContext,
    data: any,
    from: string
): void {
    // message from app to da
    if (!data.type.startsWith("heartbeat")) {
        log.debug({ type: data.type, from, data }, 'FDC3_APP_EVENT received')
    }

    if (ctx.fdc3ServerInstance != undefined) {
        try {
            ctx.fdc3ServerInstance.receive(data, from)
        } catch (e) {
            log.error({ error: e }, 'Error processing message')
        }

        if (data.type == "broadcastRequest") {
            ctx.fdc3ServerInstance.notifyBroadcastContext(data as BroadcastRequest)
        }

    } else {
        log.error('No Server instance')
    }
}
