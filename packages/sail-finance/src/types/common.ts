// App directory shapes come from the Desktop Agent, which owns FDC3.
export type { DirectoryApp, WebAppDetails } from "@finos/sail-desktop-agent"

/**
 * A user channel as this shell paints it.
 *
 * Presentation only — the channel itself is the Desktop Agent's; `icon` and
 * `background` are how the channel selector renders it here.
 */
export interface TabDetail {
  id: string
  icon: string
  background: string
}

// Sail app-specific message constants
export const AppManagementMessages = {
  DA_DIRECTORY_LISTING: "DA_DIRECTORY_LISTING",
  FDC3_DA_EVENT: "FDC3_DA_EVENT",
  FDC3_APP_EVENT: "FDC3_APP_EVENT",
}

export interface DesktopAgentDirectoryListingArgs {
  [key: string]: unknown
}

// Handshake message constants
export const HandshakeMessages = {
  APP_HELLO: "APP_HELLO",
}

export interface AppHelloArgs {
  [key: string]: unknown
}
