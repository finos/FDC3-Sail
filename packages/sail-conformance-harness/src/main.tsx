import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import App from "./App"
import { createHarnessBootstrap } from "./harness-bootstrap"
import { installHarnessConsoleCapture } from "./harness-console-capture"

installHarnessConsoleCapture()

// `?appId=Conformance1Headless` starts an unattended run; anything else in the
// conformance directory mounts as usual. See HEADLESS.md.
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
