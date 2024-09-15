import { ChannelState, DirectoryApp } from "@kite9/fdc3-web-impl"
import { AppIntent, Context } from "@kite9/fdc3"

export const DA_HELLO = 'da-hello'

export type DesktopAgentHelloArgs = {
    userSessionId: string,
    directories: string[],
    channels: ChannelState[],
}

export const APP_HELLO = 'app-hello'

export type AppHelloArgs = {
    userSessionId: string,
    instanceId: string,
    appId: string
}


export const DA_REGISTER_APP_LAUNCH = 'da-launch'

export type DesktopAgentRegisterAppLaunchArgs = {
    userSessionId: string,
    appId: string
}

export const DA_DIRECTORY_LISTING = 'da-directory-listing'

export type DesktopAgentDirectoryListingArgs = {
    userSessionId: string
}



export const SAIL_CHANNEL_CHANGE = 'sail-channel-change'

export type SailChannelChangeArgs = {
    channel: string | null,
    instanceId: string
}

export const SAIL_INTENT_RESOLVE = 'sail-intent-resolve'

export type SailIntentResolveArgs = {
    appIntents: AppIntent[],
    context: Context
}

export const SAIL_APP_OPEN = 'sail-app-open'

export type SailAppOpenArgs = {
    appDRecord: DirectoryApp
}

/**
 * These two messages carry FDC3 Communication Protocol messages.
 */
export const FDC3_APP_EVENT = 'fdc3-app-event'
export const FDC3_DA_EVENT = 'fdc3-da-event'

