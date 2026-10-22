import type { FDC3ServerInstance } from "@finos/sail-headless-agent"

/**
 * Host-owned persistence for one extension.
 *
 * Extensions must not keep their own durable state. Anything that must survive
 * a browser restart, a session replace, or a remount of the config screen is
 * read and written here. The host decides the backing store.
 */
export interface SailExtensionStorage {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T): Promise<void>
  remove(key: string): Promise<void>
}

export interface SailExtensionContext {
  storage: SailExtensionStorage
}

/** Settings-panel contribution. Hosts filter loaded UI modules with this type. */
export const SAIL_CONFIG_UI = "sail.config"

/** One browser UI module: a type slot and the URL to import. */
export type SailExtensionUIRef = {
  type: string
  url: string
}

/**
 * Isomorphic extension module (no React, no Node APIs).
 *
 * `wrapServer` must not close over user settings — re-read `ctx.storage` on
 * each intercepted call.
 */
export interface SailExtension {
  id: string
  title: string
  wrapServer?: (instance: FDC3ServerInstance, ctx: SailExtensionContext) => FDC3ServerInstance
  getUIExtensions(): SailExtensionUIRef[]
}
