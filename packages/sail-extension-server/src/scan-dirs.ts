import { dirname, isAbsolute, join } from "node:path"
import { fileURLToPath } from "node:url"

/**
 * Folders to scan for extension packages. Paths are relative to
 * `packages/sail-extension-server` unless absolute.
 *
 * Each scanned folder is expected to contain one directory per extension,
 * with a `package.json` (same layout as `extensions/demo`).
 */
export const SAIL_EXTENSION_SCAN_DIRS: string[] = ["../../extensions"]

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..")

export function resolveScanDirs(
  listed: readonly string[] = SAIL_EXTENSION_SCAN_DIRS,
  extraEnv: string | undefined = process.env.SAIL_EXTENSION_DIRS,
  fromDir: string = packageRoot,
): string[] {
  const extras = (extraEnv ?? "")
    .split(":")
    .map(entry => entry.trim())
    .filter(Boolean)
  return [
    ...listed.map(dir => (isAbsolute(dir) ? dir : join(fromDir, dir))),
    ...extras.map(dir => (isAbsolute(dir) ? dir : join(process.cwd(), dir))),
  ]
}
