import { DesktopAgentRegisterAppLaunchArgs } from "@finos/fdc3-sail-common"
import { State } from "@finos/fdc3-sail-da-impl"
import { v4 as uuid } from 'uuid'
import { SailFDC3ServerFactory } from "../SailFDC3ServerFactory"

/* eslint-disable  @typescript-eslint/no-explicit-any */

/**
 * Handle DA_REGISTER_APP_LAUNCH message
 */
export function handleRegisterAppLaunch(
    factory: SailFDC3ServerFactory,
    props: DesktopAgentRegisterAppLaunchArgs,
    callback: (success: any, err?: string) => void
): void {
    console.log("SAIL DA REGISTER APP LAUNCH: " + JSON.stringify(props))

    const { appId, userSessionId } = props
    const session = factory.getSession(userSessionId)
    if (session) {
        const instanceId = 'sail-app-' + uuid()
        session.setInstanceDetails(instanceId, {
            instanceId: instanceId,
            state: State.Pending,
            appId,
            hosting: props.hosting,
            channel: props.channel,
            instanceTitle: props.instanceTitle,
            channelConnections: []
        })
        console.log("SAIL Registered app", appId, instanceId)
        callback(instanceId)
    } else {
        console.error("SAIL Session not found", userSessionId)
        callback(null, "Session not found")
    }
}
