import { resolve } from "node:path"

import { startExtensionServer } from "./index.ts"

function flag(name: string): string | undefined {
  const argv = process.argv.slice(2)
  const prefix = `--${name}=`
  const assigned = argv.find(arg => arg.startsWith(prefix))
  if (assigned) {
    return assigned.slice(prefix.length)
  }
  const index = argv.indexOf(`--${name}`)
  return index === -1 ? undefined : argv[index + 1]
}

const port = Number(flag("port") ?? process.env.SAIL_EXTENSION_PORT ?? 9100)
if (!Number.isFinite(port) || port <= 0) {
  console.error("sail-extension-server: --port must be a positive number")
  process.exit(1)
}

const root = resolve(flag("root") ?? process.env.SAIL_EXTENSION_ROOT ?? process.cwd())

await startExtensionServer({ root, port })
