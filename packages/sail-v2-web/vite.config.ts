import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig, loadEnv } from "vite"
import { globSync } from "glob"

const packageRoot = path.dirname(fileURLToPath(import.meta.url))

// Monorepo hoist can put React 19 at the repo root (e.g. from sail-conformance-harness)
// while this package pins React 18. Without dedupe/alias, react-widgets resolves the
// root copy and Custom Apps crashes with "Invalid hook call" / null useRef.
const reactRoot = path.resolve(packageRoot, "node_modules/react")
const reactDomRoot = path.resolve(packageRoot, "node_modules/react-dom")

export default defineConfig(({ mode }) => {
  // Shell env wins over the package `.env`; the server reads the same variable the same way.
  const env = loadEnv(mode, packageRoot, "")
  return {
    define: {
      __SAIL_EXTENSION_URLS__: JSON.stringify(env.SAIL_EXTENSION_URLS ?? ""),
    },
    resolve: {
      dedupe: ["react", "react-dom"],
      alias: {
        react: reactRoot,
        "react-dom": reactDomRoot,
      },
    },
    optimizeDeps: {
      include: ["react", "react-dom", "react-widgets"],
    },
    build: {
      cssMinify: false, // makes the css easier to read
      sourcemap: true, // provide souremap for prod debug
      rollupOptions: {
        input: globSync("html/**/*.html"),
      },
    },
  }
})
