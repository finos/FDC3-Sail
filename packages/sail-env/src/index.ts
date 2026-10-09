/**
 * Shared Sail host bootstrap: query params and Vite env helpers.
 *
 * Desktop Agents adapt FDC3 wire version per app (WCP); this package does not
 * select a canonical DA version. Conformance suite App Directory URLs live in
 * `@finos/sail-conformance-harness`, not here.
 */

/** Advertised maximum FDC3 API version Sail Desktop Agents support. */
export const SAIL_MAX_FDC3_VERSION = "3.0" as const

export type SailMaxFdc3Version = typeof SAIL_MAX_FDC3_VERSION

function toSearchParams(search: string | URLSearchParams): URLSearchParams {
  return typeof search === "string" ? new URLSearchParams(search) : search
}

/**
 * Deep-link app id from a query string (`?appId=…`).
 */
export function resolveDeepLinkAppId(search: string | URLSearchParams): string | undefined {
  const appId = toSearchParams(search).get("appId")
  return appId && appId.length > 0 ? appId : undefined
}

/**
 * Optional sole App Directory URL (`?fdc3Directory=https://…`).
 * When set, hosts should use this directory only.
 */
export function resolveFdc3Directory(search: string | URLSearchParams): string | undefined {
  const url = toSearchParams(search).get("fdc3Directory")
  return url && url.length > 0 ? url : undefined
}

/**
 * Suppress splash / welcome chrome when `?noSplash=1` or `true`.
 */
export function resolveNoSplash(search: string | URLSearchParams): boolean {
  const raw = toSearchParams(search).get("noSplash")
  return raw === "1" || raw === "true"
}

/**
 * Read `VITE_FDC3_DIRECTORY_URL` (or any raw string from the host).
 */
export function resolveFdc3DirectoryUrl(raw?: string | null): string | undefined {
  return raw && raw.length > 0 ? raw : undefined
}

/**
 * True when `VITE_AUTO_RESOLVE` / equivalent is `"1"` (programmatic intent pick).
 */
export function isAutoResolve(raw?: string | null): boolean {
  return raw === "1"
}

/**
 * Effective sole App Directory: query `fdc3Directory` wins over Vite env.
 */
export function resolveSoleFdc3Directory(options?: {
  search?: string | URLSearchParams
  viteDirectoryUrl?: string | null
}): string | undefined {
  const fromQuery = options?.search ? resolveFdc3Directory(options.search) : undefined
  return fromQuery ?? resolveFdc3DirectoryUrl(options?.viteDirectoryUrl)
}
