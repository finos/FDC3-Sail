import { BroadcastRequest } from "@finos/fdc3-schema/dist/generated/api/BrowserTypes"
import { ConnectionContext } from "./types"

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
        console.log("SAIL FDC3_APP_EVENT: " + JSON.stringify(data) + " from " + from)
    }

    if (ctx.fdc3ServerInstance != undefined) {
        try {
            ctx.fdc3ServerInstance.receive(data, from)
        } catch (e) {
            console.error("Error processing message", e)
        }

        if (data.type == "broadcastRequest") {
            ctx.fdc3ServerInstance.notifyBroadcastContext(data as BroadcastRequest)
        }

    } else {
        console.error("No Server instance")
    }
}
