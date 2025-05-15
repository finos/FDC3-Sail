import { app, BrowserWindow } from "electron"
import * as http from "http"
import * as path from "path"
import * as fs from "fs"

// Log the current directory and the preload path to help debug
const preloadPath = path.join(__dirname, "preload", "preload.js")
console.log("Current directory:", __dirname)
console.log("Preload path:", preloadPath)
console.log("Preload exists:", fs.existsSync(preloadPath))

const WEB_PREFERENCES = {
  contextIsolation: true, // allow frame preload
  nodeIntegration: true,
  nodeIntegrationInSubFrames: true,
  preload: preloadPath,
}

const SAIL_URL = process.env.SAIL_URL || "http://localhost:8090"

async function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: WEB_PREFERENCES,
    // remove the default titlebar
    titleBarStyle: "hidden",
    // expose window controls in Windows/Linux
    ...(process.platform !== "darwin" ? { titleBarOverlay: true } : {}),
  })

  await win.loadFile(path.join(__dirname, "..", "static", "loading.html"))

  await waitForServer()

  await win.loadURL(SAIL_URL)

  // Ensures the preload gets run in tabs
  win.webContents.setWindowOpenHandler((hd) => {
    console.log("SAIL Window open handler", hd)
    return {
      action: "allow",
      createWindow: (options: Electron.BrowserWindowConstructorOptions) => {
        const win2 = new BrowserWindow({
          ...options,
          width: 600,
          height: 400,
          webPreferences: WEB_PREFERENCES,
        })
        return win2.webContents
      },
    }
  })
}

app
  .whenReady()
  .then(() => {
    return createWindow()
  })
  .catch((e: Error) => {
    console.error("Error creating window", e)
  })

async function waitForServer(maxAttempts = 30, intervalMs = 1000) {
  let attempts = 0
  let lastError: string | null = null
  let checkTimer: NodeJS.Timeout | null = null
  let isCancelled = false

  return new Promise<void>((resolve, reject) => {
    const checkServer = () => {
      if (isCancelled) {
        return
      }

      attempts++
      console.log(
        `Checking server connection (attempt ${attempts}/${maxAttempts})...`,
      )

      const req = http.get(SAIL_URL, { timeout: 2000 }, (res) => {
        const status = Number(res.statusCode)

        // Accept 2xx and 3xx status codes as success
        if (status && status >= 200 && status < 400) {
          console.log(
            `Server is up (status: ${status}) after ${attempts} attempts`,
          )
          isCancelled = true
          if (checkTimer) {
            clearTimeout(checkTimer)
            checkTimer = null
          }
          resolve()
          return
        } else {
          lastError = `Unexpected status: ${status}`
          retry()
        }
      })

      req.on("error", (err) => {
        if (isCancelled) return
        lastError = err.message
        retry()
      })

      req.on("timeout", () => {
        if (isCancelled) return
        req.destroy()
        lastError = "Request timed out"
        retry()
      })
    }

    const retry = () => {
      if (isCancelled) return

      if (attempts >= maxAttempts) {
        const errorMessage = `Server connection failed after ${attempts} attempts. Last error: ${lastError}`
        console.error(errorMessage)
        isCancelled = true
        reject(new Error(errorMessage))
        return
      }

      console.log(
        `Server not ready (${lastError}), retrying in ${intervalMs}ms... (${attempts}/${maxAttempts})`,
      )
      checkTimer = setTimeout(checkServer, intervalMs)
    }

    checkServer()
  })
}
