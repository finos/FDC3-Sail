import express from "express"
import ViteExpress from "vite-express"
import { SailFDC3ServerFactory } from "./da/SailFDC3ServerFactory"
import { initSailSocketIOService } from "./da/initSailSocketIOService"
import { RemoteSocketService } from "./da/RemoteSocketService"
import { getSailUrl } from "./da/sail-handlers"
import { loadExtensionCores } from "./extensions-runtime"
import { createLogger } from "./logger"

const log = createLogger("main")

const app = express()

app.use(express.json())

async function start(): Promise<void> {
  const httpServer = ViteExpress.listen(app, 8090, () => {
    log.info({ mode: process.env.NODE_ENV, url: getSailUrl() }, "SAIL Server started")
  })

  const factory = new SailFDC3ServerFactory(true, undefined, undefined, await loadExtensionCores())
  new RemoteSocketService(httpServer, factory)
  initSailSocketIOService(httpServer, factory)

  app.get("/", (req, res) => {
    // Preserve deep-link query (e.g. ?appId=Conformance1) across the SPA entry redirect.
    const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""
    res.redirect(`/html/index.html${qs}`)
  })
}

void start().catch((error: unknown) => {
  log.error({ error }, "Failed to start SAIL server")
  process.exit(1)
})
