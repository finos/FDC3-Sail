import { existsSync } from "node:fs"
import { dirname, join, relative } from "node:path"

/** Walk up from an HTML file to the package that owns it. */
function packageRoot(/** @type {string} */ file) {
  let dir = dirname(file)
  while (dir !== "/" && !existsSync(join(dir, "package.json"))) dir = dirname(dir)
  return dir
}

/** Vite serves `/foo` from the package root, falling back to `public/foo`. */
function resolveRootAbsolute(/** @type {string} */ root, /** @type {string} */ url) {
  const direct = join(root, url)
  return existsSync(direct) ? direct : join(root, "public", url)
}

/** @type {import("knip").KnipConfig} */
const config = {
  ignore: [".cursor/**", "packages/sail-conformance-harness/2.2-conformance-tests/**"],
  ignoreBinaries: ["playwright"],
  compilers: {
    html: (/** @type {string} */ text, /** @type {string} */ path) => {
      const dir = dirname(path)
      const root = packageRoot(path)
      const specifiers = []

      for (const match of text.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/g)) {
        const url = match[1]
        if (!url) continue
        // Skip absolute URLs, data URIs and in-page anchors.
        if (/^(?:[a-z]+:)?\/\//i.test(url) || url.startsWith("data:") || url.startsWith("#"))
          continue

        const resolved = url.startsWith("/")
          ? relative(dir, resolveRootAbsolute(root, url.slice(1)))
          : url
        specifiers.push(resolved.startsWith(".") ? resolved : `./${resolved}`)
      }

      return specifiers.map(specifier => `import ${JSON.stringify(specifier)}`).join("\n")
    },
  },
  workspaces: {
    "packages/sail-desktop-agent": {
      ignoreDependencies: ["tsx"],
      entry: ["test/step-definitions/*.steps.ts", "test/support/*.ts", "test/world/index.ts"],
    },
    "packages/sail-finance": {
      ignoreDependencies: ["@finos/sail-platform"],
    },
    "packages/sail-one": {
      entry: ["html/**/*.html"],
    },
    website: {
      entry: ["src/css/custom.css"],
    },
  },
}

export default config
