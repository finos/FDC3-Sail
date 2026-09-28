import type { DirectoryApp } from "@finos/sail-desktop-agent"

import conformanceAppDirectory from "../conformance-appd.json"
import localConformanceAppDirectory from "../2.2-conformance-tests/directories/local-conformance.json"

export type ConformanceToolboxProfile = "hosted" | "local"

export type ConformanceFdc3Version = "2.2" | "3.0"

export const CONFORMANCE_HOSTED_ORIGIN = "https://fdc3.finos.org/toolbox/fdc3-conformance"

/** Local FINOS dev server root (no `/toolbox/fdc3-conformance` prefix). */
export const CONFORMANCE_LOCAL_ORIGIN = "http://localhost:3001"

const PROFILE_CONFIG: Record<
  ConformanceToolboxProfile,
  { origin: string; fdc3Version: ConformanceFdc3Version }
> = {
  hosted: { origin: CONFORMANCE_HOSTED_ORIGIN, fdc3Version: "3.0" },
  local: { origin: CONFORMANCE_LOCAL_ORIGIN, fdc3Version: "2.2" },
}

export type ConformanceToolboxConfig = {
  profile: ConformanceToolboxProfile
  origin: string
  fdc3Version: ConformanceFdc3Version
}

export function resolveConformanceToolboxProfile(
  profile?: ConformanceToolboxProfile,
): ConformanceToolboxConfig {
  const resolvedProfile = profile ?? readConformanceToolboxProfileFromEnv()
  return { profile: resolvedProfile, ...PROFILE_CONFIG[resolvedProfile] }
}

function readConformanceToolboxProfileFromEnv(): ConformanceToolboxProfile {
  const raw = import.meta.env.VITE_CONFORMANCE_TOOLBOX
  return raw === "local" ? "local" : "hosted"
}

function replaceOriginInValue(value: unknown, fromOrigin: string, toOrigin: string): unknown {
  if (typeof value === "string") {
    return value.includes(fromOrigin) ? value.replaceAll(fromOrigin, toOrigin) : value
  }

  if (Array.isArray(value)) {
    return value.map(item => replaceOriginInValue(item, fromOrigin, toOrigin))
  }

  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {}
    for (const [key, entry] of Object.entries(value)) {
      result[key] = replaceOriginInValue(entry, fromOrigin, toOrigin)
    }
    return result
  }

  return value
}

export function rewriteConformanceAppDirectoryOrigin(
  applications: DirectoryApp[],
  fromOrigin: string,
  toOrigin: string,
): DirectoryApp[] {
  return replaceOriginInValue(applications, fromOrigin, toOrigin) as DirectoryApp[]
}

export type LoadedConformanceApplications = ConformanceToolboxConfig & {
  applications: DirectoryApp[]
}

export function loadConformanceApplications(options?: {
  profile?: ConformanceToolboxProfile
  /** Override local rewrite target (default: {@link CONFORMANCE_LOCAL_ORIGIN}). Use sail-web origin for same-origin iframe adoption. */
  localOrigin?: string
}): LoadedConformanceApplications {
  const config = resolveConformanceToolboxProfile(options?.profile)

  if (config.profile === "hosted") {
    return {
      ...config,
      applications: structuredClone(conformanceAppDirectory.applications as DirectoryApp[]),
    }
  }

  // The local profile serves the vendored 2.2 toolbox build, which ships its own
  // directory already rebased to CONFORMANCE_LOCAL_ORIGIN. It differs from the
  // hosted fixture in two ways that matter: it adds `Conformance1Headless`, and it
  // drops `IntentAppLId` (that path 404s in this build — see HEADLESS.md §2).
  const localApps = structuredClone(localConformanceAppDirectory.applications as DirectoryApp[])
  const localOrigin = options?.localOrigin ?? CONFORMANCE_LOCAL_ORIGIN

  return {
    profile: config.profile,
    origin: localOrigin,
    fdc3Version: config.fdc3Version,
    applications:
      localOrigin === CONFORMANCE_LOCAL_ORIGIN
        ? localApps
        : rewriteConformanceAppDirectoryOrigin(localApps, CONFORMANCE_LOCAL_ORIGIN, localOrigin),
  }
}
