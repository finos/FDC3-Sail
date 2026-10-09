import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import App from "./App"
import { createHarnessBootstrap } from "./harness-bootstrap"
import { installHarnessConsoleCapture } from "./harness-console-capture"

installHarnessConsoleCapture()

// `?appId=Conformance1` mounts the interactive suite (Playwright selects All and
// clicks Run). Any other directory appId mounts as usual.
const appId = new URLSearchParams(window.location.search).get("appId") ?? undefined

const bootstrap = createHarnessBootstrap({ appId })

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App
      initialPanels={bootstrap.initialPanels}
      onPanelsChange={bootstrap.onPanelsChange}
      toolboxProfile={bootstrap.toolboxProfile}
      toolboxOrigin={bootstrap.toolboxOrigin}
      fdc3Version={bootstrap.fdc3Version}
    />
  </StrictMode>,
)
