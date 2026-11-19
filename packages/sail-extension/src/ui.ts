import type { SailExtensionStorage } from "./types"

/**
 * Host props for UI contributions (`mount`).
 *
 * Mirrors activate: scoped {@link storage} plus {@link getExport} for ambient
 * capabilities. Contribution-point ids live on the host / platform — not here.
 *
 * {@link properties} is a host-supplied bag whose keys depend on the contribution
 * point (`type`). See `@finos/sail-platform` for the per-point property table
 * (`sail.ui.config`, `sail.ui.hidden`, `sail.ui.app.bar`, …).
 */
export type SailExtensionUIProps = {
  storage: SailExtensionStorage
  getExport: <T = unknown>(capabilityId: string) => T | undefined
  /** Host-supplied bag for the contribution point. Keys depend on `type`. */
  properties?: Record<string, unknown>
}

export type SailExtensionUI = {
  id: string
  title: string
  /** Contribution-point id. Opaque to this package — hosts define which ids they mount. */
  type: string
  mount(el: HTMLElement, props: SailExtensionUIProps): () => void
}
