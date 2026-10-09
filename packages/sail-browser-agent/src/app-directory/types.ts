/**
 * Public app-directory types for Sail shells.
 *
 * Intentionally looser than the openapi-generated `DirectoryApp` in sail-headless-agent
 * (especially `hostManifests`), so existing app records and shells keep compiling.
 * Values are cast when loaded into {@link BasicDirectory}.
 */

import type { Icon, Image } from "@finos/fdc3"

export type WebAppDetails = {
  url: string
}

export type NativeAppDetails = {
  path: string
  arguments?: string
}

export type CitrixAppDetails = {
  alias: string
  arguments?: string
}

export type OnlineNativeAppDetails = {
  url: string
}

export type OtherAppDetails = Record<string, never>

export type LaunchDetails =
  | WebAppDetails
  | NativeAppDetails
  | CitrixAppDetails
  | OnlineNativeAppDetails
  | OtherAppDetails

export type { Icon }
export type Screenshot = Image

export type AppType = "web" | "native" | "citrix" | "onlineNative" | "other"

export interface IntentDefinition {
  displayName?: string
  contexts: string[]
  resultType?: string
  customConfig?: Record<string, unknown>
}

export interface DirectoryApp {
  appId: string
  title: string
  type: AppType
  details: LaunchDetails
  name?: string
  version?: string
  tooltip?: string
  lang?: string
  description?: string
  categories?: string[]
  icons?: Icon[]
  screenshots?: Screenshot[]
  interop?: {
    intents?: {
      listensFor?: Record<string, IntentDefinition>
      raises?: Record<string, string[]>
    }
    userChannels?: {
      broadcasts?: string[]
      listensFor?: string[]
    }
    appChannels?: Array<{
      id: string
      description?: string
      broadcasts?: string[]
      listensFor?: string[]
    }>
  }
  hostManifests?: Record<string, string | Record<string, unknown>>
  contactEmail?: string
  supportEmail?: string
  publisher?: string
  moreInfo?: string
  customConfig?: Array<{ name?: string; value?: string }>
  localizedVersions?: Record<string, Partial<DirectoryApp>>
}
