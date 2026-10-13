/**
 * FDC3 version comparison for Desktop Agent runtime support contracts.
 *
 * `implementationMetadata.fdc3Version` is the highest version the agent supports. Each app is
 * served at the version negotiated from its `WCP1Hello` (`AppInstance.fdc3Version`).
 */

import type { SailDesktopAgentMetadata } from "./default-config"

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
 * The FDC3 version an app is served at: the lower of the version it asked for in `WCP1Hello`
 * and the agent's own. A hello with no usable version gets the agent's version — the only one
 * the agent is sure to speak, and what every app was served before versions were per app.
 */
export function negotiateFdc3Version(appVersion: string | undefined, agentVersion: string): string {
  if (!appVersion || !parseFdc3Version(appVersion)) {
    return agentVersion
  }
  return isFdc3VersionAtLeast(appVersion, agentVersion) ? agentVersion : appVersion
}

/**
 * The agent's implementation metadata as an app served at `fdc3Version` sees it (WCP5, `getInfo`).
 * FDC3 2.x requires `optionalFeatures.OriginatingAppMetadata`; 3.0 dropped the flag and its schema
 * forbids unknown features, so only 2.x apps get it. It is `true`: 2.x events always carry
 * `originatingApp`.
 */
export function implementationMetadataForApp(
  agentMetadata: SailDesktopAgentMetadata,
  fdc3Version: string,
): SailDesktopAgentMetadata {
  if (isFdc3VersionAtLeast(fdc3Version, "3.0")) {
    return { ...agentMetadata, fdc3Version }
  }
  const optionalFeatures = { ...agentMetadata.optionalFeatures, OriginatingAppMetadata: true }
  return { ...agentMetadata, fdc3Version, optionalFeatures }
}
