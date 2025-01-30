import { AppRegistration, ChannelState, DirectoryApp } from "@finos/fdc3-web-impl"
import { AppIntent, Context } from "@finos/fdc3"
import { AppHosting } from "./app-hosting"

export type TabDetail = {
    title: string,
    id: string,
    icon: string,
    background: string,
}

export type Directory = {
    label: string,
    url: string,
    active: boolean
}

/**
 * Sent when a window is opened by the Electron Desktop Agent,
 * via preload.ts.  Could be a desktop agent window, an iframe or an app window.
 */
export const ELECTRON_HELLO = 'electron-hello'

export type ElectronHelloArgs = {
    url: string
}

export type ElectronAppResponse = {
    type: 'app',
    userSessionId: string,
    instanceId: string,
    appId: string,
    intentResolver: string | null,
    channelSelector: string | null
}

export type ElectronDAResponse = {
    type: 'da'
}

export type ElectronHelloResponse = ElectronAppResponse | ElectronDAResponse

/**
 * Sent when the Desktop Agent web page connects to the server.
 */
export const DA_HELLO = 'da-hello'

export type DesktopAgentHelloArgs = {
    userSessionId: string,
    directories: string[],
    channels: ChannelState[],
}

/**
 * Sent when a browser app connects to the server
 */
export const APP_HELLO = 'app-hello'

export type AppHelloArgs = {
    userSessionId: string,
    instanceId: string,
    appId: string
}

/**
 * Sent by the browser desktop agent to the server to say that an app is being launched,
 * please return an instance ID.
 */
export const DA_REGISTER_APP_LAUNCH = 'da-launch'

export type DesktopAgentRegisterAppLaunchArgs = {
    userSessionId: string,
    appId: string,
    hosting: AppHosting
}

/**
 * Sent by the browser desktop agent to the server to request a directory listing.
 */
export const DA_DIRECTORY_LISTING = 'da-directory-listing'

export type DesktopAgentDirectoryListingArgs = {
    userSessionId: string
}

/**
 * Sent by the server after the app has completed the FDC3 handshake.  This is a request 
 * to know which channel the app should be placed in. 
 */
export const SAIL_CHANNEL_SETUP = 'sail-channel-setup'


/**
 * A request from the da server to the da client asking it to pop up the intent resolver
 * and figure out what intent the user wants.
 */
export const SAIL_INTENT_RESOLVE = 'sail-intent-resolve'

export type SailIntentResolveArgs = {
    appIntents: AppIntent[],
    context: Context
}

/**
 * A request by the server to the desktop agent client to open a new panel/tab for an app to go in, 
 * and start the load process.
 */
export const SAIL_APP_OPEN = 'sail-app-open'

export type SailAppOpenArgs = {
    appDRecord: DirectoryApp
}


/**
 * A message from the browser to the server to say that it wants to change the user channel of the app.
 */
export const SAIL_CHANNEL_CHANGE = 'sail-channel-change'

export type SailChannelChangeArgs = {
    userSessionId: string,
    channel: string | null,
    instanceId: string
}

/**
 * A message from the server to the browser to tell it what state the apps are in.
 */
export const SAIL_APP_STATE = 'sail-app-state'

export type SailAppStateArgs = AppRegistration[]

/**
 * Sent from the browser to the server to say that the client has updated state
 */
export const SAIL_CLIENT_STATE = 'sail-client-state'

export type SailClientStateArgs = {
    userSessionId: string,
    tabs: TabDetail[],
    directories: Directory[]
}

/**
 * These two messages carry FDC3 Communication Protocol messages.
 */
export const FDC3_APP_EVENT = 'fdc3-app-event'
export const FDC3_DA_EVENT = 'fdc3-da-event'

