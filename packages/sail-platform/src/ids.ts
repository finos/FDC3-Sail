/**
 * Ambient capability ids hosts put in `platformExports` / extensions `getExport`.
 */
export const SAIL_PLATFORM_SESSION = "sail.platform.session"
export const SAIL_PLATFORM_BUS = "sail.platform.bus"
export const SAIL_PLATFORM_CATALOG = "sail.platform.catalog"
export const SAIL_PLATFORM_STORAGE = "sail.platform.storage"

/**
 * `contributes[]` keys hosts mount.
 *
 * ## `SailExtensionUIProps.properties` per point
 *
 * | Contribution point   | Constant           | properties keys                                      |
 * |----------------------|--------------------|------------------------------------------------------|
 * | `sail.ui.config`     | `SAIL_UI_CONFIG`   | _(none)_                                             |
 * | `sail.ui.hidden`     | `SAIL_UI_HIDDEN`   | _(none)_                                             |
 * | `sail.ui.app.bar`    | `SAIL_UI_APP_BAR`  | `instanceId: string` (FDC3 app instance for panel)   |
 */

/** Settings / config panels. */
export const SAIL_UI_CONFIG = "sail.ui.config"

/**
 * Headless modules in the host top-level iframe (no visible chrome).
 * Used for browser-only edges (e.g. WCP / MessagePort) so extension `activate` stays isomorphic.
 */
export const SAIL_UI_HIDDEN = "sail.ui.hidden"

/**
 * Per-app chrome in the panel / frame header (channel selector, connection indicator, …).
 * Hosts must pass `properties.instanceId`.
 */
export const SAIL_UI_APP_BAR = "sail.ui.app.bar"

/** Typed helper for {@link SAIL_UI_APP_BAR} mount properties. */
export type SailUiAppBarProperties = {
  instanceId: string
}

export function getAppBarProperties(
  properties: Record<string, unknown> | undefined,
): SailUiAppBarProperties | undefined {
  const instanceId = properties?.instanceId
  if (typeof instanceId !== "string" || !instanceId) {
    return undefined
  }
  return { instanceId }
}
