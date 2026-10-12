import { defineConfig, lazyPlugins } from "vite-plus"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "path"

// https://vitejs.dev/config/
export default defineConfig({
  // @ts-expect-error vite-plus lazyPlugins triggers TS2321 excessive stack depth
  plugins: lazyPlugins(() => [react(), tailwindcss()]),
  resolve: {
    extensions: [".tsx", ".ts", ".jsx", ".js", ".json"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    exclude: [
      "node:fs",
      "node:fs/promises",
      // Keep workspace packages out of pre-bundle so changes in sail-desktop-agent / sail-platform trigger reload
      "@finos/sail-desktop-agent",
      "@finos/sail-platform",
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
    // CI / Playwright sets CI=1; don't steal focus from the test browser.
    open: !process.env.CI,
    // Watch workspace packages so changes in sail-desktop-agent / sail-platform
    // are picked up without restarting the dev server (negated glob = do not ignore)
    watch: {
      ignored: [
        "**/node_modules/**",
        "**/.git/**",
        "!**/node_modules/@finos/sail-desktop-agent/**",
        "!**/node_modules/@finos/sail-platform/**",
      ],
    },
  },
})
