#!/usr/bin/env node
import { spawn } from "node:child_process"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const packageRoot = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const tsxCli = require.resolve("tsx/cli")
const cli = join(packageRoot, "../src/cli.ts")

const child = spawn(process.execPath, [tsxCli, cli, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: process.env,
})

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 0)
})
