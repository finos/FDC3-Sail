import { SailChannelChangeArgs } from "@finos/fdc3-sail-common"
import { BrowserTypes } from "@finos/fdc3"
import { v4 as uuid } from 'uuid'
import { SailFDC3ServerFactory } from "../SailFDC3ServerFactory"

/* eslint-disable  @typescript-eslint/no-explicit-any */

/**
 * Handle SAIL_CHANNEL_CHANGE message
 */
export async function handleChannelChange(
    factory: SailFDC3ServerFactory,
    props: SailChannelChangeArgs,
    callback: (success: any, err?: string) => void
): Promise<void> {
    console.log("SAIL CHANNEL CHANGE: " + JSON.stringify(props))
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
        console.log("SAIL JOIN USER CHANNEL RESPONSE")
        await session.notifyUserChannelsChanged(props.instanceId, props.channel)
        callback(true)
    } else {
        callback(undefined, `Session not found`)
    }
}
