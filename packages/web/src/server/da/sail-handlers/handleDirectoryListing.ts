import { DesktopAgentDirectoryListingArgs } from "@finos/fdc3-sail-common"
import { SailFDC3ServerFactory } from "../SailFDC3ServerFactory"
import { createLogger } from "../../logger"

const log = createLogger('DirectoryListing')

/* eslint-disable  @typescript-eslint/no-explicit-any */

/**
 * Handle DA_DIRECTORY_LISTING message
 */
export function handleDirectoryListing(
    factory: SailFDC3ServerFactory,
    props: DesktopAgentDirectoryListingArgs,
    callback: (success: any, err?: string) => void
): void {
    const userSessionId = props.userSessionId
    const session = factory.getSession(userSessionId)
    if (session) {
        callback(session?.getDirectory().allApps)
    } else {
        log.error({ userSessionId }, 'Session not found')
        callback(null, "Session not found")
    }
}
