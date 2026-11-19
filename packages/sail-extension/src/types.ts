/**
 * Change from {@link SailExtensionStorage.set} / {@link SailExtensionStorage.remove}.
 */
export type SailExtensionStorageChange = {
  key: string
  op: "set" | "remove"
}

export type SailExtensionStorageChangeListener = (
  change: SailExtensionStorageChange,
) => void

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
  /**
   * Subscribe to key changes. Listeners are shared across adapter instances that
   * wrap the same backing store (so the config UI can notify `activate`).
   * Returns an unsubscribe function.
   */
  onChange(listener: SailExtensionStorageChangeListener): () => void
}

export interface SailExtensionDisposable {
  dispose(): void
}

/**
 * Context passed to `activate()`. Host-owned; isomorphic (no React / Node APIs).
 */
export interface SailExtensionContext {
  id: string
  storage: SailExtensionStorage
  /** Resolve a capability published by the platform or an activated extension. */
  getExport<T = unknown>(capabilityId: string): T | undefined
  subscriptions: { push(d: SailExtensionDisposable): void }
}

/** Keys must match capability ids declared in the manifest `exports` map. */
export type ActivateResult = { exports?: Record<string, unknown> } | void

export type ActivateFn = (
  ctx: SailExtensionContext,
) => ActivateResult | Promise<ActivateResult>

export type DeactivateFn = () => void | Promise<void>

/**
 * Shape of a `sail.extension.json` document (validated against
 * `sail.extension.schema.json`).
 */
export interface SailExtensionManifest {
  $schema?: string
  id: string
  title: string
  version: string
  description?: string
  license?: string
  homepage?: string
  repository?: string | { type?: string; url: string; directory?: string }
  activation: { module: string }
  extensionDependencies?: string[]
  exports?: Record<string, { description?: string }>
  contributes?: Record<string, Array<{ title?: string; module: string; [key: string]: unknown }>>
}
