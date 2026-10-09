/**
 * FDC3 version comparison and wire-protocol negotiation for Desktop Agent support.
 *
 * `implementationMetadata.fdc3Version` is the Desktop Agent's **maximum** supported
 * version. Per-connection wire version is negotiated from WCP1Hello (see
 * {@link negotiateFdc3Version}). Sail has no canonical version — it adapts to the app.
 */

import type { Fdc3ApiVersion } from "@finos/sail-headless-agent"

type ParsedFdc3Version = {
  major: number
  minor: number
}

export function parseFdc3Version(version: string): ParsedFdc3Version | null {
  const match = /^(\d+)\.(\d+)/.exec(version.trim())
  if (!match) {
    return null
  }

  return {
    major: Number.parseInt(match[1]!, 10),
    minor: Number.parseInt(match[2]!, 10),
  }
}

/**
 * Returns true when `version` is at or above `target` (e.g. target `"3.0"`).
 */
export function isFdc3VersionAtLeast(version: string, target: string): boolean {
  const current = parseFdc3Version(version)
  const required = parseFdc3Version(target)
  if (!current || !required) {
    return false
  }

  if (current.major !== required.major) {
    return current.major > required.major
  }

  return current.minor >= required.minor
}

/**
 * Map the client's WCP1 `payload.fdc3Version` onto a supported handler set,
 * capped by the Desktop Agent's maximum. Returns `null` when the request is
 * missing or unsupported (e.g. 1.x / 4.x, or 3.x when max is 2.2).
 */
export function negotiateFdc3Version(
  clientVersion: string | undefined,
  maxSupported: string = "3.0",
): Fdc3ApiVersion | null {
  if (!clientVersion) {
    return null
  }

  const parsed = parseFdc3Version(clientVersion)
  if (!parsed) {
    return null
  }

  let requested: Fdc3ApiVersion | null = null
  if (parsed.major === 3) {
    requested = "3.0"
  } else if (parsed.major === 2) {
    requested = "2.2"
  } else {
    return null
  }

  const max: Fdc3ApiVersion = isFdc3VersionAtLeast(maxSupported, "3.0") ? "3.0" : "2.2"
  if (requested === "3.0" && max === "2.2") {
    return null
  }
  return requested
}

/** Map advertised metadata version onto the headless-agent handler key. */
export function toFdc3ApiVersion(version: string): Fdc3ApiVersion {
  return isFdc3VersionAtLeast(version, "3.0") ? "3.0" : "2.2"
}
