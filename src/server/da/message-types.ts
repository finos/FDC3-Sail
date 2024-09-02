import { ChannelState } from "@kite9/da-server"

export const APP_HELLO = 'app-hello'
export const FDC3_APP_EVENT = 'fdc3-app-event'
export const FDC3_DA_EVENT = 'fdc3-da-event'

export type DesktopAgentHelloArgs = {
    directories: string[],
    channels: ChannelState[],
    userSessionId: string
}
