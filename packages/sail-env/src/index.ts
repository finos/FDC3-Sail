/**
 * Shared Sail host helpers: URL query params, Vite env strings, and the
 * advertised max FDC3 wire version constant. No FDC3 protocol logic.
 */

/// <reference path="../vite.d.ts" />

/** Advertised maximum FDC3 API version Sail Desktop Agents support. */
export const SAIL_MAX_FDC3_VERSION = "3.0" as const

export type SailMaxFdc3Version = typeof SAIL_MAX_FDC3_VERSION

type ProcessEnv = { env?: Record<string, string | undefined> }

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
 * Suppress splash / welcome chrome when `?noSplash=1` or `true`.
 */
export function resolveNoSplash(search: string | URLSearchParams): boolean {
  const raw = toSearchParams(search).get("noSplash")
  return raw === "1" || raw === "true"
}

/**
 * True when `VITE_AUTO_RESOLVE` / equivalent is `"1"` (programmatic intent pick).
 */
export function isAutoResolve(raw?: string | null): boolean {
  return raw === "1"
}

export type ResolveFdc3DirectoryOptions = {
  /** Page query string or `URLSearchParams` (reads `fdc3Directory`). */
  search?: string | URLSearchParams
  /** Typically `import.meta.env.VITE_FDC3_DIRECTORY_URL`. */
  viteDirectoryUrl?: string | null
}

/**
 * Resolve the sole App Directory URL from explicit inputs.
 *
 * Override order (first non-empty wins):
 * 1. `?fdc3Directory=` from `search`
 * 2. `viteDirectoryUrl` (Vite / host env)
 *
 * Prefer {@link resolveBootFdc3DirectoryUrl} when reading the live page / process env.
 */
export function resolveFdc3Directory(
  options?: ResolveFdc3DirectoryOptions,
): string | undefined {
  if (options?.search) {
    const fromQuery = toSearchParams(options.search).get("fdc3Directory")
    if (fromQuery && fromQuery.length > 0) {
      return fromQuery
    }
  }
  const fromEnv = options?.viteDirectoryUrl
  return fromEnv && fromEnv.length > 0 ? fromEnv : undefined
}

/**
 * Resolve the sole AppD URL for the current boot environment.
 *
 * Reads `globalThis.location.search` when present, then
 * `import.meta.env.VITE_FDC3_DIRECTORY_URL`, then `process.env.VITE_FDC3_DIRECTORY_URL`
 * (Node / sail-v2-web). Same override order as {@link resolveFdc3Directory}.
 *
 * Used by `sail.fdc3.directories` on activate — hosts should not call this.
 */
export function resolveBootFdc3DirectoryUrl(): string | undefined {
  const search =
    typeof globalThis !== "undefined" &&
    "location" in globalThis &&
    typeof (globalThis as { location?: { search?: string } }).location?.search === "string"
      ? (globalThis as { location: { search: string } }).location.search
      : undefined

  const fromImportMeta = import.meta.env?.VITE_FDC3_DIRECTORY_URL
  const proc = (globalThis as { process?: ProcessEnv }).process
  const fromProcess = proc?.env?.VITE_FDC3_DIRECTORY_URL

  return resolveFdc3Directory({
    search,
    viteDirectoryUrl: fromImportMeta || fromProcess,
  })
}
