import { useCallback, useEffect } from "react"
import type { IDockviewPanelProps } from "dockview"

import { useSailSession, useConnectionStore } from "../../../contexts"
import { APP_PANEL_RENDERER } from "../dockview-options"

/**
 * Host iframe panel for a launched app instance.
 * The shell hosts the iframe and registers its window; protocol handshake
 * (if any) is owned by loaded agent extensions via `sail.ui.hidden`.
 */
export interface AppPanel {
  title: string
  url: string
  tabId: string
  panelId: string
  appId: string
  icon: string | null
}

interface AppIframePanelProps extends IDockviewPanelProps {
  panel: AppPanel
}

export const AppIframePanel = ({ api, panel }: AppIframePanelProps) => {
  const session = useSailSession()
  const { registerPanel } = useConnectionStore()

  console.log(`[AppIframePanel] Rendering panel: ${panel.panelId} with URL: ${panel.url}`)

  useEffect(() => {
    api.setRenderer(APP_PANEL_RENDERER)
    registerPanel(panel.panelId, panel.appId)
  }, [api, registerPanel, panel.panelId, panel.appId])

  useEffect(() => {
    api.setTitle(panel.title)
  }, [panel.title, api])

  const registerIframeWindow = useCallback(
    (iframe: HTMLIFrameElement | null) => {
      const win = iframe?.contentWindow
      if (win) {
        session.registerHostWindow(win, panel.panelId)
      }
    },
    [session, panel.panelId],
  )

  return (
    <iframe
      ref={registerIframeWindow}
      src={panel.url}
      name={panel.panelId}
      onLoad={event => {
        registerIframeWindow(event.currentTarget)
        console.log(`[AppIframePanel] ${panel.panelId} - Iframe loaded successfully`)
      }}
      onError={e => console.error(`[AppIframePanel] ${panel.panelId} - Iframe load error:`, e)}
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
