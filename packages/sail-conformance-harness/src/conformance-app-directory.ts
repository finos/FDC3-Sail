import type { DirectoryApp } from "@finos/sail-browser-agent"

import conformanceAppDirectory from "../conformance-appd.json"
import localConformanceAppDirectory22 from "@robmoffat/fdc3-conformance-2.2/dist/directories/localhost-conformance.json"
import localConformanceAppDirectory30 from "@robmoffat/fdc3-conformance-3.0/dist/directories/localhost-conformance.json"

export type ConformanceToolboxProfile = "hosted" | "local"

export type ConformanceFdc3Version = "2.2" | "3.0"

export const CONFORMANCE_HOSTED_ORIGIN = "https://fdc3.finos.org/toolbox/fdc3-conformance"

/** Local FINOS toolbox root served from the harness (no `/toolbox/fdc3-conformance` prefix). */
export const CONFORMANCE_LOCAL_ORIGIN = "http://localhost:3001"

export type ConformanceToolboxConfig = {
  profile: ConformanceToolboxProfile
  origin: string
  fdc3Version: ConformanceFdc3Version
}

export function resolveConformanceFdc3Version(raw?: string | null): ConformanceFdc3Version {
  return raw === "3.0" ? "3.0" : "2.2"
}

export function resolveConformanceToolboxProfile(
  profile?: ConformanceToolboxProfile,
  fdc3Version?: ConformanceFdc3Version,
): ConformanceToolboxConfig {
  const resolvedProfile = profile ?? readConformanceToolboxProfileFromEnv()
  const versionFromEnv =
    import.meta.env.CONFORMANCE_FDC3_VERSION ??
    (typeof process !== "undefined" ? process.env.CONFORMANCE_FDC3_VERSION : undefined)

  if (resolvedProfile === "hosted") {
    return {
      profile: "hosted",
      origin: CONFORMANCE_HOSTED_ORIGIN,
      // FINOS website is the 3.0 toolbox; still honor an explicit version for the DA target.
      fdc3Version: fdc3Version ?? resolveConformanceFdc3Version(versionFromEnv ?? "3.0"),
    }
  }

  return {
    profile: "local",
    origin: CONFORMANCE_LOCAL_ORIGIN,
    fdc3Version: fdc3Version ?? resolveConformanceFdc3Version(versionFromEnv),
  }
}

function readConformanceToolboxProfileFromEnv(): ConformanceToolboxProfile {
  const raw =
    (typeof process !== "undefined" ? process.env.CONFORMANCE_TOOLBOX : undefined) ??
    import.meta.env.CONFORMANCE_TOOLBOX ??
    import.meta.env.VITE_CONFORMANCE_TOOLBOX
  return raw === "local" ? "local" : "hosted"
}

function localDirectoryForVersion(version: ConformanceFdc3Version): {
  applications: unknown[]
} {
  return version === "3.0" ? localConformanceAppDirectory30 : localConformanceAppDirectory22
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
  fdc3Version?: ConformanceFdc3Version
  /** Override local rewrite target (default: {@link CONFORMANCE_LOCAL_ORIGIN}). */
  localOrigin?: string
}): LoadedConformanceApplications {
  const config = resolveConformanceToolboxProfile(options?.profile, options?.fdc3Version)

  if (config.profile === "hosted") {
    return {
      ...config,
      applications: structuredClone(conformanceAppDirectory.applications as DirectoryApp[]),
    }
  }

  // Local profile: directory shipped with the versioned `@robmoffat/fdc3-conformance-*`
  // package, already rebased to http://localhost:3001 (served via Vite `publicDir`).
  const localApps = structuredClone(
    localDirectoryForVersion(config.fdc3Version).applications as DirectoryApp[],
  )
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
