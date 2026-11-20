import { DockviewDefaultTab, type IDockviewPanelHeaderProps } from "dockview-react"
import { X } from "lucide-react"
import { useState, type MouseEvent, type PointerEvent } from "react"

import { useConnectionStore } from "../../../contexts"
import { AppBarSlot } from "../../extensions/AppBarSlot"
import type { AppPanel } from "../panel-templates/AppIframePanel"

/**
 * Custom tab for app panels: app icon, title, `sail.ui.app.bar` (connection /
 * channel), then close. App-bar chrome lives on the tab — not the group header.
 */
export const AppTab = (props: IDockviewPanelHeaderProps) => {
  // oxlint-disable-next-line typescript/no-unnecessary-condition -- localStorage-persisted state: props.params is restored from Dockview's persisted layout JSON on reload
  const panelData = (props.params as { panel?: AppPanel })?.panel
  const panelId = panelData?.panelId
  const iconUrl = panelData?.icon
  const [iconError, setIconError] = useState(false)

  const connection = useConnectionStore(state => {
    if (!panelId) return undefined
    const instanceId = state.panelToConnection.get(panelId)
    return instanceId ? state.connections.get(instanceId) : undefined
  })
  const instanceId = connection?.instanceId ?? panelId

  const stopTabDrag = (event: PointerEvent) => {
    // Keep channel menu / connection chrome from starting a tab drag.
    // stopPropagation only — preventDefault on pointerdown can suppress click.
    event.stopPropagation()
  }

  const onClose = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    props.api.close()
  }

  return (
    <div className="dv-default-tab" style={{ display: "flex", alignItems: "center", gap: 4 }}>
      {iconUrl && !iconError ? (
        <img
          src={iconUrl}
          alt=""
          style={{
            width: "16px",
            height: "16px",
            objectFit: "contain",
            borderRadius: "2px",
            flexShrink: 0,
          }}
          onError={() => setIconError(true)}
        />
      ) : null}
      <DockviewDefaultTab
        {...props}
        hideClose
        style={{ flex: 1, minWidth: 0, padding: 0 }}
      />
      {instanceId ? (
        <div
          style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}
          onPointerDown={stopTabDrag}
        >
          <AppBarSlot key={instanceId} instanceId={instanceId} />
        </div>
      ) : null}
      <div
        className="dv-default-tab-action"
        onPointerDown={stopTabDrag}
        onClick={onClose}
        title="Close"
        aria-label="Close"
        role="button"
      >
        <X size={14} strokeWidth={2} aria-hidden />
      </div>
    </div>
  )
}
