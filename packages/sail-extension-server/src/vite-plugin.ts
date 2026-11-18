import fs from "node:fs"
import path from "node:path"
import type { Plugin, ViteDevServer } from "vite"

import {
  EXTENSIONS_JSON_FILENAME,
  isSailExtensionManifest,
  type SailExtensionManifest,
  type StoredExtension,
} from "@finos/sail-extension"

import { discoverExtensions, defaultStoredExtensions } from "./discover.ts"
import { ensureExtensionsJson, extensionsJsonPath, readExtensionsJson } from "./extensions-json.ts"

export type CreateExtensionsJsonVitePluginOptions = {
  /** Host package root (where `extensions.json` lives). */
  root: string
  /** Absolute path to the monorepo `extensions/` folder. */
  extensionsDir: string
  /** Public URL prefix (default `/extensions`). */
  publicBasePath?: string
  /** Optional override for the seed list. */
  seed?: StoredExtension[]
}

function rewriteModuleExt(modulePath: string): string {
  return modulePath.replace(/\.(tsx|ts|jsx)$/, ".js")
}

function rewriteManifestForDist(manifest: SailExtensionManifest): SailExtensionManifest {
  const contributes: SailExtensionManifest["contributes"] = {}
  for (const [key, items] of Object.entries(manifest.contributes ?? {})) {
    contributes[key] = items.map(item => ({
      ...item,
      module: rewriteModuleExt(item.module),
    }))
  }
  return {
    ...manifest,
    activation: { module: rewriteModuleExt(manifest.activation.module) },
    contributes: Object.keys(contributes).length > 0 ? contributes : manifest.contributes,
  }
}

function collectModuleEntries(extensionsDir: string): { name: string; file: string }[] {
  const entries: { name: string; file: string }[] = []
  for (const d of discoverExtensions(extensionsDir)) {
    const modules = new Set<string>([d.manifest.activation.module])
    for (const items of Object.values(d.manifest.contributes ?? {})) {
      for (const item of items) {
        modules.add(item.module)
      }
    }
    for (const mod of modules) {
      const rel = mod.replace(/^\.\//, "").replace(/\.(tsx|ts|jsx|js)$/, "")
      const abs = path.resolve(d.root, mod)
      if (!fs.existsSync(abs)) {
        throw new Error(`Extension module missing: ${abs}`)
      }
      entries.push({
        name: `extensions/${d.dirName}/${rel}`,
        file: abs,
      })
    }
  }
  return entries
}

function attachExtensionsMiddleware(
  server: ViteDevServer,
  options: {
    extensionsDir: string
    publicBasePath: string
    jsonPath: string
  },
): void {
  const { extensionsDir, publicBasePath, jsonPath } = options
  const base = publicBasePath.replace(/\/$/, "") || "/extensions"

  server.middlewares.use(async (req, res, next) => {
    const url = req.url ?? ""
    const pathname = url.split("?")[0] ?? ""

    if (pathname === `/${EXTENSIONS_JSON_FILENAME}`) {
      if (req.method === "GET" || req.method === "HEAD") {
        try {
          const list = readExtensionsJson(jsonPath)
          const body = `${JSON.stringify(list, null, 2)}\n`
          res.statusCode = 200
          res.setHeader("Content-Type", "application/json; charset=utf-8")
          res.setHeader("Cache-Control", "no-store")
          if (req.method === "HEAD") {
            res.end()
          } else {
            res.end(body)
          }
        } catch (error) {
          res.statusCode = 500
          res.end(String(error))
        }
        return
      }
    }

    if (pathname.startsWith(`${base}/`)) {
      const rel = pathname.slice(base.length + 1)
      const filePath = path.resolve(extensionsDir, rel)
      if (!filePath.startsWith(path.resolve(extensionsDir))) {
        res.statusCode = 403
        res.end("Forbidden")
        return
      }
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        next()
        return
      }
      if (filePath.endsWith(".json")) {
        res.statusCode = 200
        res.setHeader("Content-Type", "application/json; charset=utf-8")
        res.end(fs.readFileSync(filePath))
        return
      }
      // Transform via /@fs so modules outside the Vite root share the host React graph.
      try {
        const fsUrl = `/@fs/${filePath.split(path.sep).join("/")}`
        const result = await server.transformRequest(fsUrl)
        if (!result) {
          next()
          return
        }
        res.statusCode = 200
        res.setHeader("Content-Type", "text/javascript; charset=utf-8")
        res.end(result.code)
        return
      } catch (error) {
        res.statusCode = 500
        res.end(String(error))
        return
      }
    }

    next()
  })
}

/**
 * Host Vite plugin: ensure `extensions.json`, serve bundled extension sources
 * under `/extensions/*`, and emit extension entry modules + rewritten manifests
 * into `dist` on build. Edit enablement by changing the host-root file on disk.
 */
export function createExtensionsJsonVitePlugin(
  options: CreateExtensionsJsonVitePluginOptions,
): Plugin {
  const hostRoot = path.resolve(options.root)
  const extensionsDir = path.resolve(options.extensionsDir)
  const publicBasePath = options.publicBasePath ?? "/extensions"
  const jsonPath = extensionsJsonPath(hostRoot)
  const seed =
    options.seed ?? defaultStoredExtensions({ extensionsDir, publicBasePath })

  let outDir = "dist"

  return {
    name: "sail-extensions-json",
    config(config) {
      const allow = new Set<string>([hostRoot, extensionsDir])
      const existing = config.server?.fs?.allow
      if (Array.isArray(existing)) {
        for (const a of existing) allow.add(a)
      }
      return {
        server: {
          fs: {
            allow: [...allow],
          },
        },
      }
    },
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    buildStart() {
      ensureExtensionsJson(jsonPath, seed)
    },
    configureServer(server) {
      ensureExtensionsJson(jsonPath, seed)
      attachExtensionsMiddleware(server, {
        extensionsDir,
        publicBasePath,
        jsonPath,
      })
    },
    configurePreviewServer(server) {
      ensureExtensionsJson(jsonPath, seed)
      attachExtensionsMiddleware(server as unknown as ViteDevServer, {
        extensionsDir,
        publicBasePath,
        jsonPath,
      })
    },
    options(rollupOptions) {
      const entries = collectModuleEntries(extensionsDir)
      if (entries.length === 0) {
        return null
      }
      const input: Record<string, string> = {}
      const existing = rollupOptions.input
      if (typeof existing === "string") {
        input.main = existing
      } else if (Array.isArray(existing)) {
        for (const [i, file] of existing.entries()) {
          input[`html${i}`] = file
        }
      } else if (existing && typeof existing === "object") {
        Object.assign(input, existing)
      }
      for (const e of entries) {
        input[e.name] = e.file
      }
      // Keep `export function activate` / UI defaults on the entry chunks so
      // dynamic import(`/extensions/.../activate.js`) still receives them.
      return {
        ...rollupOptions,
        input,
        preserveEntrySignatures: "exports-only",
      }
    },
    outputOptions(output) {
      const prev =
        typeof output.entryFileNames === "function"
          ? output.entryFileNames
          : typeof output.entryFileNames === "string"
            ? () => output.entryFileNames as string
            : () => "assets/[name]-[hash].js"

      return {
        ...output,
        entryFileNames(chunk) {
          if (chunk.name.startsWith("extensions/")) {
            return `${chunk.name}.js`
          }
          return prev(chunk)
        },
      }
    },
    writeBundle() {
      ensureExtensionsJson(jsonPath, seed)
      fs.mkdirSync(outDir, { recursive: true })
      fs.copyFileSync(jsonPath, path.join(outDir, EXTENSIONS_JSON_FILENAME))

      for (const d of discoverExtensions(extensionsDir)) {
        const raw = JSON.parse(fs.readFileSync(d.manifestPath, "utf8")) as unknown
        if (!isSailExtensionManifest(raw)) {
          continue
        }
        const destDir = path.join(outDir, "extensions", d.dirName)
        fs.mkdirSync(destDir, { recursive: true })
        const rewritten = rewriteManifestForDist(raw)
        fs.writeFileSync(
          path.join(destDir, "sail.extension.json"),
          `${JSON.stringify(rewritten, null, 2)}\n`,
          "utf8",
        )
      }
    },
  }
}
