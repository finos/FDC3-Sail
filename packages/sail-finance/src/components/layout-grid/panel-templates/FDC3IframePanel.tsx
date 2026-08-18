import { useEffect } from "react"
import type { IDockviewPanelProps } from "dockview"

import { useSailDesktopAgent, useConnectionStore } from "../../../contexts"
import { FDC3_PANEL_RENDERER } from "../dockview-options"

/**
 * FDC3 Iframe Panel Component
 *
 * This component renders an iframe that loads an FDC3 application.
 * The Browser Desktop Agent (initialized in main.tsx) automatically handles
 * the Web Connection Protocol (WCP) handshake when the app calls getAgent().
 *
 * WCP Flow:
 * 1. Iframe loads and app calls fdc3.getAgent()
 * 2. App sends WCP1Hello via postMessage
 * 3. The Desktop Agent's BrowserAppConnection responds with WCP3Handshake
 * 4. MessageChannel established for FDC3 communication
 * 5. App validates identity via WCP4/WCP5
 *
 * ```mermaid
 * sequenceDiagram
 *   participant App (Iframe)
 *   participant Browser Desktop Agent
 *
 *   App (Iframe)->>Browser Desktop Agent: WCP1Hello (postMessage)
 *   Browser Desktop Agent-->>App (Iframe): WCP3Handshake (MessagePort)
 *   Note over App (Iframe), Browser Desktop Agent: Communication via MessagePort
 *   App (Iframe)->>Browser Desktop Agent: WCP4ValidateAppIdentity
 *   Browser Desktop Agent-->>App (Iframe): WCP5ValidateAppIdentityResponse
 * ```
 */
export interface FDC3AppPanel {
  title: string
  url: string
  tabId: string
  panelId: string
  appId: string
  icon: string | null
}

interface FDC3PanelProps extends IDockviewPanelProps {
  panel: FDC3AppPanel
}

export const FDC3Panel = ({ api, panel }: FDC3PanelProps) => {
  const agent = useSailDesktopAgent()
  const { registerPanel } = useConnectionStore()

  console.log(`[FDC3Panel] Rendering panel: ${panel.panelId} with URL: ${panel.url}`)

  // Pre-register host instance id and panel mapping before WCP4 / iframe load.
  useEffect(() => {
    api.setRenderer(FDC3_PANEL_RENDERER)
    agent.registerPendingHostInstance({ appId: panel.appId, instanceId: panel.panelId })
    registerPanel(panel.panelId, panel.appId)
  }, [agent, api, registerPanel, panel.panelId, panel.appId])

  // Update panel title (channel indicator removed from title for now)
  useEffect(() => {
    // Just show the panel title without channel indicator
    api.setTitle(panel.title)
  }, [panel.title, api])

  return (
    <iframe
      src={panel.url}
      name={panel.panelId}
      onLoad={() => console.log(`[FDC3Panel] ${panel.panelId} - Iframe loaded successfully`)}
      onError={e => console.error(`[FDC3Panel] ${panel.panelId} - Iframe load error:`, e)}
      style={{
        width: "100%",
        height: "100%",
        border: "none",
        margin: 0,
        padding: 0,
        display: "block",
      }}
    />
  )
}
