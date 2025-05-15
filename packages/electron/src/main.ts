import { app, BaseWindow, WebContentsView } from "electron"
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
const TITLEBAR_HEIGHT = 32 // Height in pixels for the titlebar area

// Define path to titlebar HTML in static folder
const titlebarHtmlPath = path.join(__dirname, "..", "static", "titlebar.html")

async function createWindow() {
  // Create the main window with hidden titlebar but visible native controls
  const win = new BaseWindow({
    width: 800,
    height: 600,
    // remove the default titlebar
    titleBarStyle: "hidden",
    // expose window controls in Windows/Linux
    ...(process.platform !== "darwin" ? { titleBarOverlay: true } : {}),
    show: false, // Don't show until everything is loaded,
    titleBarOverlay: {
      //color: "#2e2c29", // Background color
      // symbolColor: "#ffffff", // Color of window controls
      height: 32, // Height of the title bar area
    },
    backgroundColor: "#ffffff",
  })

  // Create titlebar view
  const titlebarView = new WebContentsView({
    webPreferences: {
      // No preload needed for titlebar
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Create main content view
  const contentView = new WebContentsView({
    webPreferences: WEB_PREFERENCES,
  })

  // Add views to the window content view
  win.contentView.addChildView(titlebarView)
  win.contentView.addChildView(contentView)

  // Add these functions to your main.ts file
  function openTitlebarDevTools(
    win: Electron.BaseWindow,
    titlebarView: WebContentsView,
  ) {
    titlebarView.webContents.openDevTools({ mode: "detach" })
  }

  function openContentDevTools(
    win: Electron.BaseWindow,
    contentView: WebContentsView,
  ) {
    contentView.webContents.openDevTools()
  }

  // Register keyboard shortcuts for DevTools
  contentView.webContents.on("before-input-event", (event, input) => {
    // Ctrl+Shift+T for titlebar DevTools
    if (input.control && input.shift && input.key === "T") {
      openTitlebarDevTools(win, titlebarView)
    }

    // Ctrl+Shift+I for content DevTools (standard shortcut)
    if (input.control && input.shift && input.key === "I") {
      openContentDevTools(win, contentView)
    }

    // Ctrl+Shift+R to reload the page
    if (input.control && input.shift && input.key === "R") {
      contentView.webContents.reload()
    }
  })

  // Set initial bounds for both views
  function updateViewBounds() {
    const winBounds = {
      width: win.getBounds().width,
      height: win.getBounds().height,
    }

    // Set titlebar view bounds
    titlebarView.setBounds({
      x: 0,
      y: 0,
      width: winBounds.width,
      height: TITLEBAR_HEIGHT,
    })

    // Set content view bounds
    contentView.setBounds({
      x: 0,
      y: TITLEBAR_HEIGHT,
      width: winBounds.width,
      height: winBounds.height - TITLEBAR_HEIGHT,
    })
  }

  // Initially set the bounds
  updateViewBounds()

  // Update bounds when window is resized
  win.on("resize", updateViewBounds)

  // Load titlebar HTML and wait for it to finish loading
  await titlebarView.webContents.loadFile(titlebarHtmlPath)

  // Show loading screen in the main content area
  await contentView.webContents.loadFile(
    path.join(__dirname, "..", "static", "loading.html"),
  )

  // Wait for the server to be ready
  await waitForServer()

  // Now load the main content
  await contentView.webContents.loadURL(SAIL_URL)

  // Make the window visible after everything is loaded
  win.show()

  // Ensures the preload gets run in tabs and new windows
  contentView.webContents.setWindowOpenHandler((hd) => {
    console.log("SAIL Window open handler", hd)
    return {
      action: "allow",
      createWindow: (options) => {
        const win2 = new BaseWindow({
          ...options,
          width: 600,
          height: 400,
          // remove the default titlebar
          titleBarStyle: "hidden",
          // expose window controls in Windows/Linux
          ...(process.platform !== "darwin" ? { titleBarOverlay: true } : {}),
        })

        // Create titlebar and content views for new window
        const newTitlebarView = new WebContentsView({
          webPreferences: { contextIsolation: true, nodeIntegration: false },
        })

        const newContentView = new WebContentsView({
          webPreferences: WEB_PREFERENCES,
        })

        // Add views to the new window
        win2.contentView.addChildView(newTitlebarView)
        win2.contentView.addChildView(newContentView)

        // Set bounds for new window views
        function updateNewViewBounds() {
          const winBounds = {
            width: win2.getBounds().width,
            height: win2.getBounds().height,
          }

          newTitlebarView.setBounds({
            x: 0,
            y: 0,
            width: winBounds.width,
            height: TITLEBAR_HEIGHT,
          })

          newContentView.setBounds({
            x: 0,
            y: TITLEBAR_HEIGHT,
            width: winBounds.width,
            height: winBounds.height - TITLEBAR_HEIGHT,
          })
        }

        updateNewViewBounds()
        win2.on("resize", updateNewViewBounds)

        // Load titlebar
        newTitlebarView.webContents.loadFile(titlebarHtmlPath)

        return newContentView.webContents
      },
    }
  })

  return win
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
