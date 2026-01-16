import { SailIntentResolveOpenChannelArgs } from "@finos/fdc3-sail-common"
import { ConnectionContext } from "./types"

/**
 * Handle SAIL_INTENT_RESOLVE_ON_CHANNEL message
 */
export function handleIntentResolveOnChannel(
    ctx: ConnectionContext,
    props: SailIntentResolveOpenChannelArgs,
    callback: (success: void, err?: string) => void
): void {
    console.log("SAIL INTENT RESOLVE ON CHANNEL: " + JSON.stringify(props))
    ctx.fdc3ServerInstance!.openOnChannel(props.appId, props.channel)
    callback(undefined)
}
