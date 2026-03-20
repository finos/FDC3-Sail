import { SailChannelChangeArgs } from "@finos/fdc3-sail-common"
import { BrowserTypes } from "@finos/fdc3"
import { v4 as uuid } from 'uuid'
import { SailFDC3ServerFactory } from "../SailFDC3ServerFactory"
import { createLogger } from "../../logger"

const log = createLogger('ChannelChange')

/* eslint-disable  @typescript-eslint/no-explicit-any */

/**
 * Handle SAIL_CHANNEL_CHANGE message
 */
export async function handleChannelChange(
    factory: SailFDC3ServerFactory,
    props: SailChannelChangeArgs,
    callback: (success: any, err?: string) => void
): Promise<void> {
    log.debug({ props }, 'CHANNEL_CHANGE received')
    const session = factory.getSession(props.userSessionId)

    if (session) {
        await session.receive({
            type: 'joinUserChannelRequest',
            payload: {
                channelId: props.channel
            },
            meta: {
                requestUuid: uuid(),
                timestamp: new Date()
            }
        } as BrowserTypes.JoinUserChannelRequest, props.instanceId)
        log.debug({ instanceId: props.instanceId, channel: props.channel }, 'Join user channel complete')
        await session.notifyUserChannelsChanged(props.instanceId, props.channel)
        callback(true)
    } else {
        callback(undefined, `Session not found`)
    }
}
