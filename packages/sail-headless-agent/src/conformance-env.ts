/**
 * Shared FDC3 conformance toolbox / App Directory configuration for Sail DAs.
 *
 * - 3.0 toolbox is hosted on fdc3.finos.org (no local server).
 * - 2.2 toolbox is started locally (typically `:3001`).
 *
 * Pure helpers — pass Vite/`process.env` values from the caller (no DOM / Vite coupling).
 */

export type ConformanceFdc3Version = "2.2" | "3.0"

export const HOSTED_CONFORMANCE_3_0_DIRECTORY_URL =
  "https://fdc3.finos.org/toolbox/3.0/fdc3-conformance/directories/website-conformance.json"

export const LOCAL_CONFORMANCE_2_2_DIRECTORY_URL =
  "http://localhost:3001/directories/localhost-conformance.json"

export function resolveConformanceFdc3Version(
  raw?: string | null,
): ConformanceFdc3Version {
  return raw === "2.2" ? "2.2" : "3.0"
}

/**
 * Resolve the conformance App Directory URL for a DA / CI cell.
 *
 * @param options.version - FDC3 target (default 3.0)
 * @param options.override - Explicit directory URL (e.g. `VITE_CONFORMANCE_DIRECTORY_URL`)
 */
export function resolveConformanceDirectoryUrl(options?: {
  version?: ConformanceFdc3Version
  override?: string | null
}): string {
  if (options?.override) {
    return options.override
  }
  const version = options?.version ?? "3.0"
  return version === "2.2"
    ? LOCAL_CONFORMANCE_2_2_DIRECTORY_URL
    : HOSTED_CONFORMANCE_3_0_DIRECTORY_URL
}

/** True when `VITE_CONFORMANCE_AUTO_RESOLVE` / `CONFORMANCE_AUTO_RESOLVE` is `"1"`. */
export function isConformanceAutoResolve(raw?: string | null): boolean {
  return raw === "1"
}

/**
 * Deep-link app id from a query string (`?appId=Conformance1`).
 * Pass `window.location.search` or any `?…` / `URLSearchParams` value.
 */
export function resolveDeepLinkAppId(
  search: string | URLSearchParams,
): string | undefined {
  const params =
    typeof search === "string" ? new URLSearchParams(search) : search
  const appId = params.get("appId")
  return appId && appId.length > 0 ? appId : undefined
}
