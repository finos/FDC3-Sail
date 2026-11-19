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
    // Cucumber steps are entry points (not imported from src).
    "packages/sail-headless-agent": {
      entry: [
        "test/step-definitions/*.steps.ts",
        "test/support/*.ts",
        "test/world/index.ts",
      ],
    },
    // Extensions are loaded via extensions.json / Vite, not static imports.
    "packages/sail-finance": {
      ignoreDependencies: [
        "@finos/sail-platform",
        "@finos/sail-extension-demo",
        "@finos/sail-extension-fdc3-custom-apps",
        "@finos/sail-extension-fdc3-channels",
        "@finos/sail-extension-fdc3-directories",
      ],
    },
    "packages/sail-one": {
      entry: ["html/**/*.html"],
      ignoreDependencies: [
        "@finos/sail-extension-demo",
        "@finos/sail-extension-fdc3-custom-apps",
        "@finos/sail-extension-fdc3-directories",
      ],
    },
    "packages/sail-v2-web": {
      entry: ["html/**/*.html"],
    },
    "packages/sail-extension": {
      entry: ["src/index.ts", "src/ui.ts"],
    },
    "packages/sail-extension-server": {
      entry: ["src/index.ts", "src/cli.ts", "bin/sail-extension-server.mjs"],
      ignoreDependencies: ["tsx"],
    },
    "extensions/demo": {
      entry: ["src/index.ts", "src/ui.tsx"],
      ignoreDependencies: ["@finos/sail-extension-server"],
    },
    "extensions/fdc3": {
      entry: [
        "src/index.ts",
        "src/activate.ts",
        "src/ui-hidden.ts",
        "src/ui-app-bar-connection.ts",
      ],
      ignoreDependencies: ["@finos/sail-extension-server"],
    },
    "extensions/fdc3-directories": {
      entry: ["src/index.ts", "src/activate.ts", "src/ui.tsx"],
      ignoreDependencies: ["@finos/sail-extension-server"],
    },
    "extensions/fdc3-custom-apps": {
      entry: ["src/activate.ts", "src/ui.tsx"],
      ignoreDependencies: ["@finos/sail-extension-server"],
    },
    "extensions/fdc3-channels": {
      entry: ["src/index.ts", "src/activate.ts", "src/ui.tsx", "src/ui-app-bar.tsx"],
      ignoreDependencies: ["@finos/sail-extension-server"],
    },
    website: {
      entry: ["src/css/custom.css"],
    },
  },
}

export default config
