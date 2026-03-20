import { DesktopAgentRegisterAppLaunchArgs } from "@finos/fdc3-sail-common"
import { State } from "@finos/fdc3-sail-da-impl"
import { v4 as uuid } from 'uuid'
import { SailFDC3ServerFactory } from "../SailFDC3ServerFactory"
import { createLogger } from "../../logger"

const log = createLogger('RegisterAppLaunch')

/* eslint-disable  @typescript-eslint/no-explicit-any */

/**
 * Handle DA_REGISTER_APP_LAUNCH message
 */
export function handleRegisterAppLaunch(
    factory: SailFDC3ServerFactory,
    props: DesktopAgentRegisterAppLaunchArgs,
    callback: (success: any, err?: string) => void
): void {
    log.debug({ props }, 'REGISTER_APP_LAUNCH received')

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
        log.debug({ appId, instanceId }, 'Registered app')
        callback(instanceId)
    } else {
        log.error({ userSessionId }, 'Session not found')
        callback(null, "Session not found")
    }
}
