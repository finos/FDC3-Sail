import typescript from "@rollup/plugin-typescript"
import commonjs from "@rollup/plugin-commonjs"
import nodeResolve from "@rollup/plugin-node-resolve"
import json from "@rollup/plugin-json"

// Main process plugins
const mainPlugins = [
  nodeResolve({
    preferBuiltins: true,
  }),
  commonjs(),
  json(),
  typescript({
    tsconfig: "./tsconfig.json",
    compilerOptions: {
      declaration: true,
    },
  }),
]

// Preload process plugins
const preloadPlugins = [
  nodeResolve({
    preferBuiltins: true,
  }),
  commonjs(),
  json(),
  typescript({
    tsconfig: "./tsconfig.json",
    compilerOptions: {
      declaration: true,
    },
  }),
]

// Shared external modules for all builds
const external = [
  "electron",
  "path",
  "fs",
  "http",
  "https",
  "url",
  "os",
  "child_process",
]

export default [
  // Main process build
  {
    input: "src/main.ts",
    output: {
      file: "dist/main.js",
      format: "cjs",
      sourcemap: "inline", // Use inline source maps for development
    },
    external,
    plugins: mainPlugins,
  },

  // Preload script build
  {
    input: "src/preload/preload.ts",
    output: {
      file: "dist/preload/preload.js",
      format: "cjs",
      sourcemap: "inline", // Use inline source maps for development
    },
    external,
    plugins: preloadPlugins,
  },
]
