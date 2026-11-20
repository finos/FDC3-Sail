import { defineConfig, lazyPlugins } from "vite-plus"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "path"
import { fileURLToPath } from "node:url"
import { createExtensionsJsonVitePlugin } from "@finos/sail-extension-server"

const packageRoot = path.dirname(fileURLToPath(import.meta.url))
const extensionsDir = path.resolve(packageRoot, "../../extensions")

// https://vitejs.dev/config/
export default defineConfig({
  plugins: lazyPlugins(() => [
    react(),
    tailwindcss(),
    createExtensionsJsonVitePlugin({ root: packageRoot, extensionsDir }),
  ]),
  resolve: {
    dedupe: ["react", "react-dom"],
    extensions: [".tsx", ".ts", ".jsx", ".js", ".json"],
    alias: {
      "@": path.resolve(packageRoot, "./src"),
      // CJS dist is unusable over /@fs from extension modules; compile the TS source as ESM.
      "@finos/sail-headless-agent": path.resolve(
        packageRoot,
        "../../packages/sail-headless-agent/src/index.ts",
      ),
    },
  },
  optimizeDeps: {
    exclude: [
      "node:fs",
      "node:fs/promises",
      // Keep workspace packages out of pre-bundle so changes trigger reload
      "@finos/sail-platform",
      "@finos/sail-extension",
      "@finos/sail-headless-agent",
    ],
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      external: id => {
        // Externalize Node.js built-in modules
        return id.startsWith("node:") || id === "fs" || id === "fs/promises"
      },
    },
  },
  server: {
    port: 3000,
    // CI / Playwright sets CI=1; avoid stealing focus from the test browser.
    open: !process.env.CI,
    fs: {
      // Extensions import workspace packages via /@fs; allow the monorepo root.
      allow: [path.resolve(packageRoot, "../..")],
    },
    // Watch workspace packages so changes are picked up without restarting the
    // dev server (negated glob = do not ignore)
    watch: {
      ignored: [
        "**/node_modules/**",
        "**/.git/**",
        "!**/node_modules/@finos/sail-platform/**",
        "!**/node_modules/@finos/sail-extension/**",
      ],
    },
  },
})
