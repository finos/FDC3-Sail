import { AppRegistration, DirectoryApp } from "@finos/fdc3-web-impl"
import { AppHosting } from "./app-hosting"
import { AppIntent, IntentMetadata, AppMetadata } from "@finos/fdc3-standard"
import { Context } from "@finos/fdc3-context"
import { AppPanel } from "./ClientState"

export type TabDetail = {
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

export type ElectronHelloArgs = DesktopAgentHelloArgs & {
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

export type ContextHistory = { [id: string]: Context[] }

export type DesktopAgentHelloArgs = {
    userSessionId: string,
    directories: string[],
    channels: TabDetail[],
    panels: AppPanel[],
    customApps: DirectoryApp[],
    contextHistory: ContextHistory
}

/**
 * Sent from the Desktop Agent to the server to say that the client has updated state
 */
export const SAIL_CLIENT_STATE = 'sail-client-state'

export type SailClientStateArgs = DesktopAgentHelloArgs

/**
 * Sent when an App connects to the server
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
    hosting: AppHosting,
    channel: string | null,
    instanceTitle: string
}

/**
 * Sent by the browser desktop agent to the server to request a directory listing.
 */
export const DA_DIRECTORY_LISTING = 'da-directory-listing'

export type DesktopAgentDirectoryListingArgs = {
    userSessionId: string
}

/**
 * Sent by the server to the browser desktop agent after the app has completed the FDC3 handshake.  This is a request 
 * to know which channel the app should be placed in. 
 */
export const SAIL_CHANNEL_SETUP = 'sail-channel-setup'


/**
 * A request from the da server to the da client asking it to pop up the intent resolver
 * and figure out what intent the user wants.
 */
export const SAIL_INTENT_RESOLVE = 'sail-intent-resolve'

/**
 * Augmented App Metadata, which allows the intent resolver to have a bit more contextual
 * information about the apps it is showing.
 */
export type AugmentedAppMetadata = AppMetadata & {
    channelData: TabDetail | null
    instanceTitle?: string,
}

export type AugmentedAppIntent = {
    intent: IntentMetadata,
    apps: AugmentedAppMetadata[]
}

export type SailIntentResolveArgs = {
    appIntents: AugmentedAppIntent[],
    context: Context,
    requestId: string
}

export type SailIntentResolveResponse = {
    appIntents: AppIntent[],    // should be just one app intent if it resolves
    requestId: string,
    channel: string | null,
    error: string | null
}

/**
 * A request by the server to the desktop agent client to open a new panel/tab for an app to go in, 
 * and start the load process.
 */
export const SAIL_APP_OPEN = 'sail-app-open'

export type SailAppOpenArgs = {
    appDRecord: DirectoryApp,
    channel: string | null,
    approach: AppHosting
}

export type SailAppOpenResponse = {
    instanceId: string,
    instanceTitle: string
}


/**
 * A message from the desktop agent browser to the server to say that it wants to change the user channel of the app.
 */
export const SAIL_CHANNEL_CHANGE = 'sail-channel-change'

export type SailChannelChangeArgs = {
    userSessionId: string,
    channel: string | null,
    instanceId: string
}

/**
 * A message from the server to the browser desktop agent to tell it what state the apps are in.
 */
export const SAIL_APP_STATE = 'sail-app-state'

export type SailAppStateArgs = AppRegistration[]

/**
 * These two messages carry FDC3 Communication Protocol messages.  
 */
export const FDC3_APP_EVENT = 'fdc3-app-event'  // from the app to the server
export const FDC3_DA_EVENT = 'fdc3-da-event'    // from the server to the app

/**
 * From the channel selector and intent resolver  UIs to the server to tell it that it 
 * needs to be kept up to date with the user channel details.
 */
export const CHANNEL_RECEIVER_HELLO = 'channel-receiver-hello'

export type ChannelReceiverHelloRequest = {
    userSessionId: string,
    instanceId: string
}

/** 
 * From the server to the channel selector/intent resolver to tell it that the channels 
 * have changed.
 */
export const CHANNEL_RECEIVER_UPDATE = 'channel-receiver-update'

export type ChannelReceiverUpdate = {
    tabs: TabDetail[]
}

/**
 * Sent by the intent resolver to the server to tell it that the user wants to open an app in a specific channel.
 */
export const SAIL_INTENT_RESOLVE_ON_CHANNEL = 'sail-intent-resolve-open-channel'

export type SailIntentResolveOpenChannelArgs = {
    channel: string
    appId: string
}

/**
 * Sent from the server to the browser desktop agent to tell it that an app has broadcast a context.
 */
export const SAIL_BROADCAST_CONTEXT = 'sail-broadcast-context'

export type SailBroadcastContextArgs = {
    context: Context,
    channelId: string
}

/**
 * Sent from the browser desktop agent to the server to tell it to rebroadcast a context.
 */
export const SAIL_REBROADCAST_CONTEXT = 'sail-rebroadcast-context'

export type SailRebroadcastContextArgs = SailBroadcastContextArgs & {
}