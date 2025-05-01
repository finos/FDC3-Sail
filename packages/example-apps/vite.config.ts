import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { resolve } from "path"
import fs from "fs"

// Dynamically discover application entry points under src/apps
const appsDir = resolve(__dirname, "src/apps")
const apps = fs
  .readdirSync(appsDir)
  .filter((file) => fs.statSync(resolve(appsDir, file)).isDirectory())

// Create the Rollup input object for multiple HTML entry points
const input = apps.reduce((acc, app) => {
  acc[app] = resolve(__dirname, `src/apps/${app}/index.html`)
  return acc
}, {})

export default defineConfig({
  // Ensure assets are resolved relative to the HTML file
  base: "./",
  plugins: [
    react(),
    // Plugin to ensure build output HTML files are placed correctly in dist/apps/[appname]/index.html
    {
      name: "html-output-control",
      enforce: "post", // Run after other build plugins
      generateBundle(_, bundle) {
        Object.keys(bundle).forEach((key) => {
          const chunk = bundle[key]
          // Target HTML assets generated from the entry points
          if (
            chunk.type === "asset" &&
            chunk.fileName.endsWith(".html") &&
            chunk.name &&
            apps.includes(chunk.name) // Ensure it's one of our dynamically found apps
          ) {
            // Rewrite the output path to match the desired /apps/[appname]/ structure
            chunk.fileName = `apps/${chunk.name}/index.html`
          }
        })
      },
    },
    // Plugin to rewrite development server requests from /apps/[appname]/* to /src/apps/[appname]/*
    // This allows using the production-like URL structure (/apps/...) during development
    {
      name: "rewrite-middleware",
      apply: "serve", // Only apply this plugin during development (vite serve)
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && req.url.startsWith("/apps/")) {
            // Prepend /src to the request URL
            req.url = "/src" + req.url
          }
          next()
        })
      },
    },
  ],
  server: {
    // Standard dev server settings
    hmr: true,
    watch: {
      usePolling: false,
      // Ensure changes within src/apps trigger HMR
      ignored: ["node_modules/**", "dist/**"],
    },
    open: false,
    port: 3000,
    // Allow serving files from the project root (e.g., accessing assets outside src)
    fs: {
      allow: [".."],
      strict: false, // Less strict file serving checks
    },
  },
  build: {
    // Use the dynamically generated input for Rollup
    rollupOptions: {
      input,
    },
    outDir: "dist",
    // Place built assets (JS, CSS, images) into dist/assets
    assetsDir: "assets",
  },
  // Useful during development to avoid stale dependency caches
  optimizeDeps: {
    force: true,
  },
  // Standard alias for cleaner imports
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
})
