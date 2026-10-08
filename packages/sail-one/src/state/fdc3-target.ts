export type SailOneFdc3Version = "2.2" | "3.0"

/**
 * Wire protocol / handler set for the in-page Desktop Agent.
 * `closeRequest` (fdc3.close) is handled only by v3 OpenHandler.
 */
export function resolveSailOneFdc3Version(): SailOneFdc3Version {
  const raw = import.meta.env.VITE_FDC3_VERSION
  return raw === "2.2" ? "2.2" : "3.0"
}
