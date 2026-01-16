import { DesktopAgentDirectoryListingArgs } from "@finos/fdc3-sail-common"
import { SailFDC3ServerFactory } from "../SailFDC3ServerFactory"

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
        console.error("Session not found", userSessionId)
        callback(null, "Session not found")
    }
}
