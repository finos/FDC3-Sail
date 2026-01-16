import { SailClientStateArgs, ChannelReceiverUpdate, CHANNEL_RECEIVER_UPDATE } from "@finos/fdc3-sail-common"
import { SailFDC3ServerFactory } from "../SailFDC3ServerFactory"

/* eslint-disable  @typescript-eslint/no-explicit-any */

/**
 * Handle SAIL_CLIENT_STATE message
 */
export async function handleClientState(
    factory: SailFDC3ServerFactory,
    props: SailClientStateArgs,
    callback: (success: any, err?: string) => void
): Promise<void> {
    console.log("SAIL CLIENT STATE: " + JSON.stringify(props))
    const session = factory.getSession(props.userSessionId)
    if (session) {
        session.reloadAppDirectories(props.directories, props.customApps)
        session.updateChannelData(props.channels)

        // tell each app to check for a channel change
        props.panels.forEach((panel) => {
            // make sure apps channels match to the client
            const state = session.getInstanceDetails(panel.panelId)
            if (state) {
                const newChannel = panel.tabId
                const existingChannel = state.channel
                state.instanceTitle = panel.title
                if (newChannel !== existingChannel) {
                    session.notifyUserChannelsChanged(panel.panelId, newChannel)
                }
            }
        })

        // ok now make sure that apps in tabs have the up-to-date set of channels
        const connectedApps = await session.getConnectedApps()
        connectedApps.forEach(app => {
            const state = session.getInstanceDetails(app.instanceId)

            if (state) {
                // make sure we update the channel state
                const ur: ChannelReceiverUpdate = {
                    tabs: props.channels
                }
                state.channelConnections.forEach(conn => conn.emit(CHANNEL_RECEIVER_UPDATE, ur))
            }
        })

        callback(true)
    } else {
        callback(undefined, `Session not found`)
    }
}
