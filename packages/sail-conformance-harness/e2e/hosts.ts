/**
 * Product Desktop Agents under test for the conformance Playwright matrix.
 *
 * Toolbox sourcing (see `@finos/sail-headless-agent` conformance-env):
 * - 3.0 → hosted on fdc3.finos.org (no local toolbox process)
 * - 2.2 → local `@robmoffat/fdc3-conformance` on :3001
 */

import {
  LOCAL_CONFORMANCE_2_2_DIRECTORY_URL,
  resolveConformanceDirectoryUrl as resolveSharedConformanceDirectoryUrl,
  resolveConformanceFdc3Version as resolveSharedConformanceFdc3Version,
  type ConformanceFdc3Version,
} from "@finos/sail-browser-agent"

export type ConformanceHostId = "sail-one" | "sail-finance" | "sail-v2-web"
export type { ConformanceFdc3Version }

export type ConformanceHostConfig = {
  id: ConformanceHostId
  /** Playwright baseURL / ready URL for the shell. */
  url: string
  /** npm workspace name for `npm run … -w`. */
  workspace: string
  /**
   * Build workspaces required before starting this host.
   * Paths are relative to the monorepo root (playwright cwd = harness package).
   */
  buildWorkspaces: string[]
}

export const CONFORMANCE_HOSTS: Record<ConformanceHostId, ConformanceHostConfig> = {
  "sail-one": {
    id: "sail-one",
    url: "http://localhost:8090",
    workspace: "@finos/sail-one",
    buildWorkspaces: ["@finos/sail-headless-agent", "@finos/sail-browser-agent"],
  },
  "sail-finance": {
    id: "sail-finance",
    url: "http://localhost:3000",
    workspace: "@finos/sail-finance",
    buildWorkspaces: [
      "@finos/sail-headless-agent",
      "@finos/sail-browser-agent",
      "@finos/sail-platform",
    ],
  },
  "sail-v2-web": {
    id: "sail-v2-web",
    url: "http://localhost:8090",
    workspace: "@finos/fdc3-sail-web",
    buildWorkspaces: ["@finos/sail-headless-agent", "@finos/fdc3-sail-common"],
  },
}

export function resolveConformanceHostId(
  raw: string | undefined = process.env.CONFORMANCE_HOST,
): ConformanceHostId {
  if (raw === "sail-one" || raw === "sail-finance" || raw === "sail-v2-web") {
    return raw
  }
  // Default keeps local debugging against finance (port 3000) when unset.
  return "sail-finance"
}

export function resolveConformanceFdc3Version(
  raw: string | undefined = process.env.CONFORMANCE_FDC3_VERSION,
): ConformanceFdc3Version {
  return resolveSharedConformanceFdc3Version(raw)
}

export function resolveConformanceDirectoryUrl(version: ConformanceFdc3Version): string {
  return resolveSharedConformanceDirectoryUrl({
    version,
    override: process.env.CONFORMANCE_DIRECTORY_URL,
  })
}

/** Env vars passed into the host Vite/Node process for a matrix cell. */
export function hostProcessEnv(
  host: ConformanceHostConfig,
  version: ConformanceFdc3Version,
): Record<string, string> {
  const directoryUrl = resolveConformanceDirectoryUrl(version)
  const shared: Record<string, string> = {
    CI: process.env.CI ?? "1",
    VITE_FDC3_VERSION: version,
    VITE_CONFORMANCE_DIRECTORY_URL: directoryUrl,
    VITE_CONFORMANCE_AUTO_RESOLVE: "1",
    BROWSER: "none",
  }

  if (host.id === "sail-v2-web") {
    return {
      ...shared,
      SAIL_FDC3_VERSION: version,
    }
  }
  return shared
}

/** Shell command to build host dependencies (from harness package dir). */
export function buildHostCommand(host: ConformanceHostConfig): string {
  const workspaces = host.buildWorkspaces.map(w => `-w ${w}`).join(" ")
  return `npm run build ${workspaces} --prefix ../..`
}

/** Shell command to start the host under test (from harness package dir). */
export function startHostCommand(
  host: ConformanceHostConfig,
  version: ConformanceFdc3Version,
): string {
  const env = hostProcessEnv(host, version)
  const envPrefix = Object.entries(env)
    .map(([k, v]) => `${k}=${shellQuote(v)}`)
    .join(" ")
  return `${envPrefix} npm run dev -w ${host.workspace} --prefix ../..`
}

/** Local 2.2 toolbox only — 3.0 is hosted on fdc3.finos.org. */
export function startLocalToolbox2_2Command(): string {
  return "npx --yes @robmoffat/fdc3-conformance@2.2.3-test.1"
}

export { LOCAL_CONFORMANCE_2_2_DIRECTORY_URL }

function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_./:=-]+$/.test(value)) {
    return value
  }
  return `'${value.replace(/'/g, `'\\''`)}'`
}
