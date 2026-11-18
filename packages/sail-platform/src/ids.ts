/**
 * Ambient capability ids hosts put in `platformExports` / extensions `getExport`.
 */
export const SAIL_PLATFORM_SESSION = "sail.platform.session"
export const SAIL_PLATFORM_BUS = "sail.platform.bus"
export const SAIL_PLATFORM_CATALOG = "sail.platform.catalog"
export const SAIL_PLATFORM_STORAGE = "sail.platform.storage"

/**
 * `contributes[]` keys hosts mount.
 * Settings / config panels (was `sail.config`).
 */
export const SAIL_UI_CONFIG = "sail.ui.config"

/**
 * Headless modules in the host top-level iframe (no visible chrome).
 * Used for browser-only edges (e.g. WCP / MessagePort) so extension `activate` stays isomorphic.
 */
export const SAIL_UI_HIDDEN = "sail.ui.hidden"
