/**
 * FDC3 App Directory Types
 *
 * These types are based on the FDC3 App Directory OpenAPI specification.
 * See: /appd.schema.json (local copy of the FDC3 App Directory schema)
 * Source: https://github.com/finos/FDC3/blob/main/schemas/api/appDirectory.schema.json
 *
 * Duplicated here to avoid dependency on @finos/fdc3-web-impl which is being deprecated.
 *
 * NOTE: These types should ideally be exported from an official FDC3 package
 * (e.g., @finos/fdc3-schema or @finos/fdc3). The App Directory schema exists
 * but the generated TypeScript types are not currently built or released
 * by FDC3 in any packages.
 *
 * TODO: Raise an issue with FINOS FDC3 to add/export these types from an official package.
 * See: https://github.com/finos/FDC3
 */

import type { Icon, Image } from "@finos/fdc3"

// =============================================================================
// Launch Details Types
// =============================================================================

/** Properties used to launch apps with `type: web` */
export interface WebAppDetails {
  /** Application start URL */
  url: string
}

/** Properties used to launch apps with `type: native` that are already installed on the device */
export interface NativeAppDetails {
  /** The path on disk from which the application is launched */
  path: string
  /** Arguments that must be passed on the command line to launch the app */
  arguments?: string
}

/** Properties used to launch virtualized apps with `type: citrix` */
export interface CitrixAppDetails {
  /** The Citrix alias / name of the virtual app */
  alias: string
  /** Arguments that must be passed on the command line to launch the app */
  arguments?: string
}

/** Properties used to launch native apps with `type: onlineNative` that have an online launcher */
export interface OnlineNativeAppDetails {
  /** Application URL */
  url: string
}

/** Apps with `type: other` are defined by a hostManifest and do not require other details */
export type OtherAppDetails = Record<string, never>

/** Union of all launch details types */
export type LaunchDetails =
  | WebAppDetails
  | NativeAppDetails
  | CitrixAppDetails
  | OnlineNativeAppDetails
  | OtherAppDetails

// =============================================================================
// Icon and Screenshot Types
// =============================================================================

/**
 * Re-export Icon from @finos/fdc3 for App Directory usage
 * @see {@link Icon} from @finos/fdc3
 */
export type { Icon } from "@finos/fdc3"

/**
 * Screenshot type for App Directory - uses FDC3 Image type
 * The FDC3 Image type matches the App Directory Screenshot specification
 */
export type Screenshot = Image

// =============================================================================
// Intent Types
// =============================================================================

/**
 * Intent definition as used in listensFor (where intent name is the key).
 * Note: The intent name is the key in the Record, not a property here.
 */
export interface IntentDefinition {
  /** Optional display name for the intent (deprecated) */
  displayName?: string
  /** Context types the intent can process (required) */
  contexts: string[]
  /** Optional type for output returned by the application */
  resultType?: string
  /** Custom configuration for the intent (deprecated) */
  customConfig?: Record<string, unknown>
}

/**
 * Intent that an application can handle, per its App Directory record (includes name for
 * standalone use).
 *
 * Deliberately not named `AppIntent`: FDC3 exports its own `AppIntent`, the *runtime*
 * `{ intent, apps }` result of `findIntent`, which is a different thing.
 */
export interface DirectoryAppIntent extends IntentDefinition {
  /** The name of the intent */
  name: string
}

// =============================================================================
// Application Type
// =============================================================================

/** Application type */
export type AppType = "web" | "native" | "citrix" | "onlineNative" | "other"

/**
 * DirectoryApp represents a full application definition in the FDC3 App Directory.
 * Based on the FDC3 App Directory specification.
 */
export interface DirectoryApp {
  /** The unique application identifier (Required) */
  appId: string
  /** Title for the application, typically used in a launcher UI (Required) */
  title: string
  /** Application type (Required) */
  type: AppType
  /** Properties used to launch the application (Required) */
  details: LaunchDetails
  /** The name of the application (deprecated in favor of appId/title) */
  name?: string
  /** Version of the application */
  version?: string
  /** Optional tooltip description */
  tooltip?: string
  /** Primary language of the application (IETF RFC 5646 language tag) */
  lang?: string
  /** Description of the application */
  description?: string
  /** Categories that describe the application */
  categories?: string[]
  /** Icons for the application */
  icons?: Icon[]
  /** Screenshots of the application */
  screenshots?: Screenshot[]
  /** Intents the application can handle */
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
  /** Host-specific application manifests (URI string or host manifest object) */
  hostManifests?: Record<string, string | Record<string, unknown>>
  /** Contact email for the app */
  contactEmail?: string
  /** Support email for the app */
  supportEmail?: string
  /** Publisher of the app */
  publisher?: string
  /** More info URL */
  moreInfo?: string
  /** Custom config name-value pairs (deprecated) */
  customConfig?: Array<{ name?: string; value?: string }>
  /**
   * Localized versions of the app record.
   * AppD schema allows BaseApplication fields, including appId/type/details.
   */
  localizedVersions?: Record<string, Partial<DirectoryApp>>
}

// =============================================================================
// Directory Data Types
// =============================================================================

/** Expected structure of directory data from remote sources or local files */
export interface DirectoryData {
  applications: DirectoryApp[]
  /** Optional response message from directory */
  message?: string
}

/** Intent with app association (used internally by directory lookups) */
export interface DirectoryIntent extends DirectoryAppIntent {
  /** The name of the intent */
  intentName: string
  /** The app that handles this intent */
  appId: string
}
