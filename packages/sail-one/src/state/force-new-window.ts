/**
 * Optional Vite env override for `hostManifests.sail.forceNewWindow`.
 *
 * - unset: honor the app directory / catalog value
 * - `"false"`: always Frame (no browser tabs) — useful for conformance without popups
 * - `"true"`: always Tab, even when the manifest omits forceNewWindow
 */
export function applyForceNewWindowOverride(
  manifestForceNewWindow: boolean,
  override: string | undefined = import.meta.env.VITE_FORCE_NEW_WINDOW,
): boolean {
  if (override === "false") {
    return false
  }
  if (override === "true") {
    return true
  }
  return manifestForceNewWindow
}

export function resolveSailForceNewWindow(manifestForceNewWindow: boolean): boolean {
  return applyForceNewWindowOverride(manifestForceNewWindow)
}
