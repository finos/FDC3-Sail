/**
 * FDC3 version comparison for Desktop Agent runtime support contracts.
 *
 * `implementationMetadata.fdc3Version` is the source of truth for advertised support.
 */

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
