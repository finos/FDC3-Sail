import { DockviewDefaultTab, type IDockviewPanelHeaderProps } from "dockview-react"
import { useState } from "react"

import type { FDC3AppPanel } from "../panel-templates/FDC3IframePanel"

/**
 * Custom tab component for FDC3 panels that displays an icon alongside the title.
 * Renders an icon before the default tab content when available.
 */
export const FDC3Tab = (props: IDockviewPanelHeaderProps) => {
  // oxlint-disable-next-line typescript/no-unnecessary-condition -- localStorage-persisted state: props.params is restored from Dockview's persisted layout JSON on reload, whose actual shape can predate the current FDC3AppPanel type
  const panelData = (props.params as { panel?: FDC3AppPanel })?.panel
  const iconUrl = panelData?.icon
  const [iconError, setIconError] = useState(false)

  // If no icon or icon failed to load, use the default tab
  if (!iconUrl || iconError) {
    return <DockviewDefaultTab {...props} />
  }

  // Render custom tab with icon + default tab behavior
  return (
    <div className="dv-default-tab" style={{ display: "flex", alignItems: "center" }}>
      <img
        src={iconUrl}
        alt=""
        style={{
          width: "16px",
          height: "16px",
          marginRight: "4px",
          objectFit: "contain",
          borderRadius: "2px",
        }}
        onError={() => setIconError(true)}
      />
      <DockviewDefaultTab {...props} />
    </div>
  )
}
