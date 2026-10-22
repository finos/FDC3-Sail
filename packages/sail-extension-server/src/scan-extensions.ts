import { existsSync } from "node:fs"
import { readdir, readFile } from "node:fs/promises"
import { isAbsolute, join, relative } from "node:path"

export type ScannedExtension = {
  id: string
  title: string
  root: string
}

const CORE_CANDIDATES = ["src/index.ts", "src/index.tsx", "src/index.js"] as const

export function isInside(parent: string, child: string): boolean {
  const rel = relative(parent, child)
  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel)
}

export function pickExisting(root: string, candidates: readonly [string, ...string[]]): string {
  return candidates.find(candidate => existsSync(join(root, candidate))) ?? candidates[0]
}

export async function scanExtensionDirectories(
  dirs: readonly string[],
): Promise<ScannedExtension[]> {
  const seen = new Set<string>()
  const extensions: ScannedExtension[] = []

  for (const dir of dirs) {
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      continue
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || seen.has(entry.name)) {
        continue
      }
      const root = join(dir, entry.name)
      try {
        const raw = await readFile(join(root, "package.json"), "utf8")
        const pkg = JSON.parse(raw) as { description?: string }
        seen.add(entry.name)
        extensions.push({
          id: entry.name,
          title: pkg.description ?? entry.name,
          root,
        })
      } catch {
        // Skip folders that are not packages.
      }
    }
  }

  return extensions
}

export function catalogEntry(extension: ScannedExtension, origin: string) {
  const corePath = pickExisting(extension.root, CORE_CANDIDATES)
  return {
    id: extension.id,
    title: extension.title,
    core: `${origin}/${extension.id}/${corePath}`,
    file: join(extension.root, corePath),
  }
}
