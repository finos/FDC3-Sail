import { useEffect, useState, type Dispatch, type SetStateAction } from "react"

import type { ConformanceFdc3Version, ConformanceToolboxProfile } from "./conformance-app-directory"
import type { HarnessPanel } from "./types"

type AppProps = {
  initialPanels: HarnessPanel[]
  onPanelsChange?: (setter: Dispatch<SetStateAction<HarnessPanel[]>>) => void
  toolboxProfile: ConformanceToolboxProfile
  toolboxOrigin: string
  fdc3Version: ConformanceFdc3Version
}

function panelLabel(panel: HarnessPanel): string {
  const title = panel.title ?? panel.appId
  return panel.launchMode === "popup" ? `${title} (tab)` : title
}

/**
 * Minimal unstyled host: Conformance1 and other iframe apps render inline;
 * `forceNewWindow` apps open in separate tabs via AppLauncher (listed only here).
 */
export default function App({
  initialPanels,
  onPanelsChange,
  toolboxProfile,
  toolboxOrigin,
  fdc3Version,
}: AppProps) {
  const [panels, setPanels] = useState<HarnessPanel[]>(initialPanels)

  useEffect(() => {
    onPanelsChange?.(setPanels)
  }, [onPanelsChange])

  const iframePanels = panels.filter(panel => panel.launchMode === "iframe")

  return (
    <div>
      <h1>FDC3 Conformance Harness</h1>
      <p>
        Toolbox profile: <strong>{toolboxProfile}</strong> — FDC3 target{" "}
        <strong>{fdc3Version}</strong> — origin <code>{toolboxOrigin}</code>
      </p>
      <p style={{ fontSize: "0.9rem", color: "#555" }}>
        Startup diagnostics log on this <strong>host page</strong> console (not the Conformance1
        iframe). Filter for <code>[ConformanceHarness]</code>.
      </p>
      <section>
        <h2>Mounted panels</h2>
        <ul>
          {panels.map(panel => (
            <li key={panel.instanceId}>
              {panelLabel(panel)} — {panel.instanceId}
            </li>
          ))}
        </ul>
      </section>
      <section>
        {iframePanels.map(panel => (
          <div key={panel.instanceId}>
            <div>{panel.title ?? panel.appId}</div>
            <iframe
              name={panel.instanceId}
              src={panel.url}
              title={panel.title ?? panel.appId}
              style={{ width: "100%", height: "600px", border: "1px solid #ccc" }}
            />
          </div>
        ))}
      </section>
    </div>
  )
}
