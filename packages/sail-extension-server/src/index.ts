import { createServer, type ViteDevServer } from "vite"

export type StartExtensionServerOptions = {
  root?: string
  port?: number
}

export type SailExtensionServer = {
  origin: string
  server: ViteDevServer
}

/**
 * Serve one extension package from `root` (default: cwd). Vite `root` is that
 * folder, so the extension’s own `node_modules` resolve normally. The host
 * does not scan other trees or know which dependencies the extension chose.
 */
export async function startExtensionServer(
  options: StartExtensionServerOptions = {},
): Promise<SailExtensionServer> {
  const root = options.root ?? process.cwd()
  const port = options.port ?? 9100
  const origin = `http://localhost:${port}`

  const server = await createServer({
    configFile: false,
    root,
    // Library host: esbuild JSX only. @vitejs/plugin-react injects a Fast Refresh
    // preamble that throws when a different origin (sail-v2-web, sail-one) import()s the UI.
    esbuild: {
      jsx: "automatic",
      jsxImportSource: "react",
    },
    server: {
      port,
      strictPort: true,
      cors: true,
      hmr: false,
    },
  })

  await server.listen()
  server.printUrls()
  console.log(`Sail extension: ${origin} (${root})`)
  return { origin, server }
}
