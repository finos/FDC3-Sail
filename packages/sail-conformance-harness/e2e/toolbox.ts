/**
 * Which FDC3 conformance toolbox a run uses. Read by vite.config.ts (harness dev server) and
 * playwright.config.ts (CI matrix).
 *
 * - `CONFORMANCE_FDC3_VERSION`: `2.2` (default) or `3.0`.
 * - `CONFORMANCE_TOOLBOX`: `published` (default) — the `@robmoffat/fdc3-conformance` npm alias for
 *   that version — or the path to a built local checkout of FDC3 `toolbox/fdc3-conformance`.
 *
 * Either way the toolbox root holds `bin/serve.mjs` and the built site in `dist/`.
 */

import { existsSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join, resolve } from "node:path"

export type ConformanceFdc3Version = "2.2" | "3.0"

/** The toolbox serves on :3001; its App Directory has that origin baked into every URL. */
export const TOOLBOX_PORT = 3001
export const TOOLBOX_DIRECTORY_URL = `http://localhost:${TOOLBOX_PORT}/directories/localhost-conformance.json`

const PUBLISHED_PACKAGES: Record<ConformanceFdc3Version, string> = {
  "2.2": "@robmoffat/fdc3-conformance-2.2",
  "3.0": "@robmoffat/fdc3-conformance-3.0",
}

const require = createRequire(import.meta.url)

export function resolveConformanceFdc3Version(
  raw: string | undefined = process.env.CONFORMANCE_FDC3_VERSION,
): ConformanceFdc3Version {
  if (raw === undefined || raw === "" || raw === "2.2") {
    return "2.2"
  }
  if (raw === "3.0") {
    return "3.0"
  }
  throw new Error(`CONFORMANCE_FDC3_VERSION must be 2.2 or 3.0 (got "${raw}")`)
}

export function resolveToolboxRoot(
  version: ConformanceFdc3Version,
  toolbox: string | undefined = process.env.CONFORMANCE_TOOLBOX,
): string {
  const root =
    toolbox === undefined || toolbox === "" || toolbox === "published"
      ? dirname(require.resolve(`${PUBLISHED_PACKAGES[version]}/package.json`))
      : resolve(toolbox)

  if (!existsSync(join(root, "dist", "directories", "localhost-conformance.json"))) {
    throw new Error(
      `No built conformance site at ${join(root, "dist")}. ` +
        "Run `npm run build` in the toolbox checkout, or unset CONFORMANCE_TOOLBOX.",
    )
  }
  return root
}

/** Shell command that serves the toolbox on {@link TOOLBOX_PORT}. */
export function startToolboxCommand(root: string): string {
  return `PORT=${TOOLBOX_PORT} node ${JSON.stringify(join(root, "bin", "serve.mjs"))}`
}
