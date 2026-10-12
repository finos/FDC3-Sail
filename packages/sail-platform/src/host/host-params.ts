/** Public FINOS App Directory. */
export const FINOS_APP_DIRECTORY_URL = "https://directory.fdc3.finos.org/v2/apps"

/** Merged App Directory served by `@finos/fdc3-example-apps` (`npm run apps`). */
export const EXAMPLE_APPS_DIRECTORY_URL =
  "http://localhost:4005/static/generated/fdc3-example-apps.json"

export interface SailHostParams {
  /** `?appId=`: open this app once the directories load. */
  deepLinkAppId?: string
  /** The one App Directory to load in place of the host's own list, when set. */
  soleDirectory?: string
  /** App Directory URLs the host's Desktop Agent loads. */
  appDirectories: string[]
  /** Resolve intents with no UI (headless and conformance runs). */
  autoResolve: boolean
}

/**
 * Host start-up options from the page URL and Vite env.
 *
 * A sole directory (`?fdc3Directory=` when allowed, else `VITE_FDC3_DIRECTORY_URL`) replaces the defaults, so a
 * conformance run sees only its own apps; other directories inflate findIntent counts.
 * `VITE_AUTO_RESOLVE=1` turns on auto-resolve.
 */
export function readSailHostParams(options: {
  search: string
  viteDirectoryUrl?: string
  viteAutoResolve?: string
  /**
   * Honour `?fdc3Directory=`. Pass `import.meta.env.DEV`: in a production build a link must not
   * be able to swap in someone else's apps.
   */
  allowQueryDirectory?: boolean
}): SailHostParams {
  const query = new URLSearchParams(options.search)
  const queryDirectory = options.allowQueryDirectory ? query.get("fdc3Directory") : null
  const soleDirectory = queryDirectory || options.viteDirectoryUrl || undefined
  const deepLinkAppId = query.get("appId") || undefined

  return {
    ...(deepLinkAppId ? { deepLinkAppId } : {}),
    ...(soleDirectory ? { soleDirectory } : {}),
    appDirectories: soleDirectory
      ? [soleDirectory]
      : [FINOS_APP_DIRECTORY_URL, EXAMPLE_APPS_DIRECTORY_URL],
    autoResolve: options.viteAutoResolve === "1",
  }
}
