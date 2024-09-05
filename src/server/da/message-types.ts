import { ChannelState, DirectoryApp } from "@kite9/da-server"
import { AppIntent, Context } from "@kite9/fdc3"

export const APP_HELLO = 'app-hello'
export const DA_HELLO = 'da-hello'
export const FDC3_APP_EVENT = 'fdc3-app-event'
export const FDC3_DA_EVENT = 'fdc3-da-event'
export const SAIL_CHANNEL_CHANGE = 'sail-channel-change'
export const SAIL_INTENT_RESOLVE = 'sail-intent-resolve'
export const SAIL_APP_OPEN = 'sail-app-open'

export type DesktopAgentHelloArgs = {
    userSessionId: string,
    directories: string[],
    channels: ChannelState[],
}

export type AppHelloArgs = {
    userSessionId: string,
    instanceId: string,
    appId: string
}

export type SailIntentResolve = {
    appIntents: AppIntent[],
    context: Context
}

export type SailChannelChange = {
    channel: string | null,
    instanceId: string
}

export type SailAppOpen = {
    appId: string
    instanceId: string
    url: string,
    detail: DirectoryApp
}