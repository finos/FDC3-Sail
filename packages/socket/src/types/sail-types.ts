import { DesktopAgentHelloArgs } from "@finos/fdc3-sail-shared"

// Socket-specific types
export interface SailHostManifest {
    forceNewWindow: boolean
}

// Electron-specific types (socket/Electron only)
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

export const ELECTRON_HELLO = 'electron-hello'