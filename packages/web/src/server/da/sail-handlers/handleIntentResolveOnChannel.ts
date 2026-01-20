import { SailIntentResolveOpenChannelArgs } from "@finos/fdc3-sail-common"
import { ConnectionContext } from "./types"
import { createLogger } from "../../logger"

const log = createLogger('IntentResolveOnChannel')

/**
 * Handle SAIL_INTENT_RESOLVE_ON_CHANNEL message
 */
export function handleIntentResolveOnChannel(
    ctx: ConnectionContext,
    props: SailIntentResolveOpenChannelArgs,
    callback: (success: void, err?: string) => void
): void {
    log.debug({ props }, 'INTENT_RESOLVE_ON_CHANNEL received')
    ctx.fdc3ServerInstance!.openOnChannel(props.appId, props.channel)
    callback(undefined)
}
