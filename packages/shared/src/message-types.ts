import { AppRegistration, DirectoryApp } from "@finos/fdc3-web-impl"
import { AppIntent, IntentMetadata, AppMetadata } from "@finos/fdc3-standard"
import { Context } from "@finos/fdc3-context"
import { AppHosting } from "./constants"

// ============================================================================
// COMMON TYPES
// ============================================================================

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

export type ContextHistory = { [id: string]: Context[] }

// ============================================================================
// MESSAGE CONSTANTS (GROUPED)
// ============================================================================

export const HandshakeMessages = {
    DA_HELLO: 'da-hello',
    SAIL_CLIENT_STATE: 'sail-client-state',
    APP_HELLO: 'app-hello',
} as const

export const AppManagementMessages = {
    DA_REGISTER_APP_LAUNCH: 'da-launch',
    DA_DIRECTORY_LISTING: 'da-directory-listing',
    SAIL_APP_OPEN: 'sail-app-open',
    SAIL_APP_STATE: 'sail-app-state',
    FDC3_APP_EVENT: 'fdc3-app-event',
    FDC3_DA_EVENT: 'fdc3-da-event',
} as const

export const IntentMessages = {
    SAIL_INTENT_RESOLVE: 'sail-intent-resolve',
    SAIL_INTENT_RESOLVE_ON_CHANNEL: 'sail-intent-resolve-open-channel',
} as const

export const ChannelMessages = {
    SAIL_CHANNEL_SETUP: 'sail-channel-setup',
    SAIL_CHANNEL_CHANGE: 'sail-channel-change',
    CHANNEL_RECEIVER_HELLO: 'channel-receiver-hello',
    CHANNEL_RECEIVER_UPDATE: 'channel-receiver-update',
} as const

export const ContextMessages = {
    SAIL_BROADCAST_CONTEXT: 'sail-broadcast-context',
} as const

// ============================================================================
// MESSAGE TYPES
// ============================================================================

// Handshake Types
export type DesktopAgentHelloArgs<T = unknown> = {
    userSessionId: string,
    directories: string[],
    channels: TabDetail[],
    panels: T[],
    customApps: DirectoryApp[],
    contextHistory: ContextHistory
}

export type SailClientStateArgs<T = unknown> = DesktopAgentHelloArgs<T>

export type AppHelloArgs = {
    userSessionId: string,
    instanceId: string,
    appId: string
}

// App Management Types
export type DesktopAgentRegisterAppLaunchArgs = {
    userSessionId: string,
    appId: string,
    hosting: AppHosting,
    channel: string | null,
    instanceTitle: string
}

export type DesktopAgentDirectoryListingArgs = {
    userSessionId: string
}

export type SailAppOpenArgs = {
    appDRecord: DirectoryApp,
    channel: string | null,
    approach: AppHosting
}

export type SailAppOpenResponse = {
    instanceId: string,
    instanceTitle: string
}

export type SailAppStateArgs = AppRegistration[]

// Intent Resolution Types
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
    appIntents: AppIntent[],
    requestId: string,
    channel: string | null,
    error: string | null
}

export type SailIntentResolveOpenChannelArgs = {
    channel: string
    appId: string
}

// Channel Management Types
export type SailChannelChangeArgs = {
    userSessionId: string,
    channel: string | null,
    instanceId: string
}

export type ChannelReceiverHelloRequest = {
    userSessionId: string,
    instanceId: string
}

export type ChannelReceiverUpdate = {
    tabs: TabDetail[]
}

// Context Management Types
export type SailBroadcastContextArgs = {
    context: Context,
    channelId: string
}