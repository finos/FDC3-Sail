import { contextBridge } from "electron"
import { fdc3 } from "./DesktopAgentProxy"

// Add a test ping function to verify preload is working
contextBridge.exposeInMainWorld("sailTest", {
  ping: () => "pong",
})

// Expose FDC3 API
contextBridge.exposeInMainWorld("fdc3", fdc3)

// Log when loaded
console.log("SAIL: Preload script initialized")
