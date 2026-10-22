import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { createServer, type Plugin } from "vite"

import { resolveScanDirs } from "./scan-dirs"
import {
  catalogEntry,
  isInside,
  scanExtensionDirectories,
  type ScannedExtension,
} from "./scan-extensions"

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..")
const repoRoot = join(packageRoot, "../..")
const contractRoot = join(repoRoot, "packages/sail-extension")
const scanDirs = resolveScanDirs()
const viteRoot = scanDirs[0] ?? join(repoRoot, "extensions")
const port = 9100
const origin = `http://localhost:${port}`

function extensionsManifest(): Plugin {
  return {
    name: "sail-extensions-manifest",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split("?")[0]
        if (path !== "/extensions.json") {
          next()
          return
        }
        void scanExtensionDirectories(scanDirs)
          .then(items => {
            res.setHeader("Content-Type", "application/json")
            res.setHeader("Access-Control-Allow-Origin", "*")
            res.end(JSON.stringify({ extensions: items.map(item => catalogEntry(item, origin)) }))
          })
          .catch(error => {
            res.statusCode = 500
            res.end(String(error))
          })
      })
    },
  }
}

function mountExternalExtensions(extensions: ScannedExtension[]): Plugin {
  const externals = extensions.filter(extension => !isInside(viteRoot, extension.root))
  return {
    name: "sail-extensions-externals",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = req.url ?? ""
        const q = url.indexOf("?")
        const path = q === -1 ? url : url.slice(0, q)
        const query = q === -1 ? "" : url.slice(q)
        for (const extension of externals) {
          const prefix = `/${extension.id}`
          if (path !== prefix && !path.startsWith(`${prefix}/`)) {
            continue
          }
          const rest = path.slice(prefix.length) || "/"
          req.url = `/@fs${join(extension.root, rest)}${query}`
          break
        }
        next()
      })
    },
  }
}

const scanned = await scanExtensionDirectories(scanDirs)
const allow = [
  repoRoot,
  ...scanned.filter(item => !isInside(viteRoot, item.root)).map(item => item.root),
]

const server = await createServer({
  configFile: false,
  root: viteRoot,
  // Library host: esbuild JSX only. @vitejs/plugin-react injects a Fast Refresh
  // preamble that throws when a different origin (sail-v2-web, sail-one) import()s the UI.
  plugins: [extensionsManifest(), mountExternalExtensions(scanned)],
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  resolve: {
    alias: [
      { find: "@finos/sail-extension/ui", replacement: join(contractRoot, "src/ui.ts") },
      { find: /^@finos\/sail-extension$/, replacement: join(contractRoot, "src/index.ts") },
    ],
  },
  server: {
    port,
    strictPort: true,
    cors: true,
    hmr: false,
    fs: { allow },
  },
})

await server.listen()
server.printUrls()
if (scanned.length > 0) {
  console.log(
    `Sail extensions: ${scanned.map(item => item.id).join(", ")} (scan ${scanDirs.join(", ")})`,
  )
}
