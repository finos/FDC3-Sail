import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig, lazyPlugins } from "vite-plus"
import type { Plugin } from "vite-plus"
import react from "@vitejs/plugin-react"
import { globSync } from "glob"

const packageRoot = path.dirname(fileURLToPath(import.meta.url))

const mainHtmlPath = "/html/index.html"

/** Vite only auto-serves index.html from the project root; our MPA entry lives under html/. */
function sailOneRootEntry(): Plugin {
  const rewriteRoot = (url: string | undefined) => {
    if (url === "/" || url === "/index.html") {
      return mainHtmlPath
    }
    return url
  }

  return {
    name: "sail-one-root-entry",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        req.url = rewriteRoot(req.url)
        next()
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        req.url = rewriteRoot(req.url)
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: lazyPlugins(() => [react(), sailOneRootEntry()]),
  resolve: {
    alias: {
      "@": path.resolve(packageRoot, "./src"),
    },
  },
  optimizeDeps: {
    // Keep workspace packages out of pre-bundle so changes in sail-desktop-agent /
    // sail-platform trigger a reload.
    exclude: ["@finos/sail-desktop-agent", "@finos/sail-platform"],
  },
  server: {
    port: 8090,
    watch: {
      ignored: [
        "**/node_modules/**",
        "**/.git/**",
        "!**/node_modules/@finos/sail-desktop-agent/**",
        "!**/node_modules/@finos/sail-platform/**",
      ],
    },
  },
  preview: {
    port: 8090,
  },
  build: {
    cssMinify: false,
    sourcemap: true,
    rollupOptions: {
      input: globSync("html/**/*.html", { cwd: packageRoot, absolute: true }),
    },
  },
})
