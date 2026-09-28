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
    open: true,
    proxy: {
      // Local toolbox profile: conformance pages load under /apps; scripts/CSS use /lib.
      "/apps": {
        target: "https://fdc3.finos.org/toolbox/fdc3-conformance",
        changeOrigin: true,
        secure: true,
      },
      "/lib": {
        target: "https://fdc3.finos.org/toolbox/fdc3-conformance",
        changeOrigin: true,
        secure: true,
      },
      "/screenshots": {
        target: "https://fdc3.finos.org/toolbox/fdc3-conformance",
        changeOrigin: true,
        secure: true,
      },
      "/finos-icon-256.png": {
        target: "https://fdc3.finos.org/toolbox/fdc3-conformance",
        changeOrigin: true,
        secure: true,
      },
    },
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
