/**
 * Host-local enablement record (persisted in package-root `extensions.json`).
 * Not per-user — do not store this in sail.platform.storage / sail.config.
 */
export type StoredExtension = {
  /** URL of `sail.extension.json` (path-absolute or absolute). */
  url: string
  active: boolean
}

/** Extension ids inactive in the default seed until hosts drop FDC3 shims. */
export const DEFAULT_INACTIVE_EXTENSION_IDS: ReadonlySet<string> = new Set(["sail.fdc3"])

export const EXTENSIONS_JSON_FILENAME = "extensions.json"

export function isStoredExtension(value: unknown): value is StoredExtension {
  if (value === null || typeof value !== "object") {
    return false
  }
  const e = value as StoredExtension
  return typeof e.url === "string" && e.url.length > 0 && typeof e.active === "boolean"
}

export function isStoredExtensionList(value: unknown): value is StoredExtension[] {
  return Array.isArray(value) && value.every(isStoredExtension)
}

/**
 * Resolve path-absolute URLs against `baseOrigin` (needed for Node `fetch`).
 */
export function resolveExtensionUrl(url: string, baseOrigin?: string): string {
  if (/^https?:\/\//i.test(url)) {
    return url
  }
  if (url.startsWith("/") && baseOrigin) {
    return new URL(url, baseOrigin.replace(/\/$/, "") + "/").href
  }
  return url
}

/** Active manifest URLs for `registry.load`. */
export function activeManifestUrls(
  list: StoredExtension[],
  options?: {
    baseOrigin?: string
  },
): string[] {
  return list
    .filter(e => e.active)
    .map(e => resolveExtensionUrl(e.url, options?.baseOrigin))
}

/** Public path for a bundled extension manifest under the host origin. */
export function bundledExtensionManifestPath(dirName: string, publicBasePath = "/extensions"): string {
  const base = publicBasePath.replace(/\/$/, "") || "/extensions"
  return `${base}/${dirName}/sail.extension.json`
}
