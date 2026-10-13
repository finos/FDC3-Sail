/**
 * Product hosts the conformance matrix runs against. Each one embeds `SailDesktopAgent`; the
 * spec opens Conformance1 in it via `?appId=` and scrapes the result.
 */

import type { ConformanceFdc3Version } from "./toolbox"
import { TOOLBOX_DIRECTORY_URL } from "./toolbox"

export type ConformanceHostId = "sail-one" | "sail-finance"

export type ConformanceHostConfig = {
  id: ConformanceHostId
  /** Playwright baseURL and the URL the webServer waits on. */
  url: string
  /** npm workspace for `npm run dev -w`. */
  workspace: string
}

export const CONFORMANCE_HOSTS: Record<ConformanceHostId, ConformanceHostConfig> = {
  "sail-one": { id: "sail-one", url: "http://localhost:8090", workspace: "@finos/sail-one" },
  "sail-finance": {
    id: "sail-finance",
    url: "http://localhost:3000",
    workspace: "@finos/sail-finance",
  },
}

export function resolveConformanceHostId(
  raw: string | undefined = process.env.CONFORMANCE_HOST,
): ConformanceHostId {
  if (raw === undefined || raw === "") {
    return "sail-finance"
  }
  if (raw === "sail-one" || raw === "sail-finance") {
    return raw
  }
  throw new Error(`CONFORMANCE_HOST must be sail-one or sail-finance (got "${raw}")`)
}

/**
 * Env for the host's Vite dev server: load only the toolbox's App Directory (other directories
 * inflate findIntent counts) and resolve intents without a UI.
 */
export function hostProcessEnv(_version: ConformanceFdc3Version): Record<string, string> {
  return {
    CI: process.env.CI ?? "1",
    VITE_FDC3_DIRECTORY_URL: TOOLBOX_DIRECTORY_URL,
    VITE_AUTO_RESOLVE: "1",
    BROWSER: "none",
  }
}

/**
 * Build what the host needs, then start its dev server (cwd = harness package). The hosts'
 * `predev` builds `@finos/sail-desktop-agent` and `@finos/sail-platform`.
 */
export function startHostCommand(host: ConformanceHostConfig): string {
  return `npm run dev -w ${host.workspace} --prefix ../..`
}
