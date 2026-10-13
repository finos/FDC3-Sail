/**
 * Product Desktop Agents under test for the conformance Playwright matrix.
 *
 * Both FDC3 versions serve the toolbox locally from `@robmoffat/fdc3-conformance`
 * on :3001 (HTTP). Suite App Directory URLs live here — not in DA packages.
 */

export type ConformanceHostId = "sail-one" | "sail-finance" | "sail-v2-web"
export type ConformanceFdc3Version = "2.2" | "3.0"

/** Shared App Directory URL for the local toolbox process on :3001. */
export const LOCAL_CONFORMANCE_DIRECTORY_URL =
  "http://localhost:3001/directories/localhost-conformance.json"

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
    buildWorkspaces: [
      "@finos/sail-env",
      "@finos/sail-headless-agent",
      "@finos/sail-browser-agent",
    ],
  },
  "sail-finance": {
    id: "sail-finance",
    url: "http://localhost:3000",
    workspace: "@finos/sail-finance",
    buildWorkspaces: [
      "@finos/sail-env",
      "@finos/sail-headless-agent",
      "@finos/sail-browser-agent",
      "@finos/sail-platform",
    ],
  },
  "sail-v2-web": {
    id: "sail-v2-web",
    url: "http://localhost:8090",
    workspace: "@finos/fdc3-sail-web",
    buildWorkspaces: [
      "@finos/sail-env",
      "@finos/sail-headless-agent",
      "@finos/fdc3-sail-common",
    ],
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
  return raw === "2.2" ? "2.2" : "3.0"
}

export function resolveConformanceDirectoryUrl(
  _version: ConformanceFdc3Version,
): string {
  return process.env.CONFORMANCE_DIRECTORY_URL ?? LOCAL_CONFORMANCE_DIRECTORY_URL
}

/** npm package that serves the local toolbox for a matrix cell. */
export function resolveLocalToolboxPackage(version: ConformanceFdc3Version): string {
  return version === "2.2"
    ? "@robmoffat/fdc3-conformance@2.2.3-test.1"
    : "@robmoffat/fdc3-conformance@3.0.0-beta.1"
}

/** Env vars passed into the host Vite/Node process for a matrix cell. */
export function hostProcessEnv(
  _host: ConformanceHostConfig,
  version: ConformanceFdc3Version,
): Record<string, string> {
  const directoryUrl = resolveConformanceDirectoryUrl(version)
  return {
    CI: process.env.CI ?? "1",
    VITE_FDC3_DIRECTORY_URL: directoryUrl,
    VITE_AUTO_RESOLVE: "1",
    BROWSER: "none",
  }
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

/** Start the local `@robmoffat/fdc3-conformance` toolbox for the matrix cell. */
export function startLocalToolboxCommand(version: ConformanceFdc3Version): string {
  return `npx --yes ${resolveLocalToolboxPackage(version)}`
}

function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_./:=-]+$/.test(value)) {
    return value
  }
  return `'${value.replace(/'/g, `'\\''`)}'`
}
