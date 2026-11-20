import { DockviewDefaultTab, type IDockviewPanelHeaderProps } from "dockview-react"
import { useState } from "react"

import type { AppPanel } from "../panel-templates/AppIframePanel"

/**
 * Custom tab for app panels that displays an icon alongside the title.
 */
export const AppTab = (props: IDockviewPanelHeaderProps) => {
  // oxlint-disable-next-line typescript/no-unnecessary-condition -- localStorage-persisted state: props.params is restored from Dockview's persisted layout JSON on reload
  const panelData = (props.params as { panel?: AppPanel })?.panel
  const iconUrl = panelData?.icon
  const [iconError, setIconError] = useState(false)

  if (!iconUrl || iconError) {
    return <DockviewDefaultTab {...props} />
  }

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
