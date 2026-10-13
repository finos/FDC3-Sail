import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import App from "./App"
import { createHarnessBootstrap } from "./harness-bootstrap"
import { installHarnessConsoleCapture } from "./harness-console-capture"

installHarnessConsoleCapture()

// `?appId=` mounts any app in the conformance directory; Conformance1 by default.
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
