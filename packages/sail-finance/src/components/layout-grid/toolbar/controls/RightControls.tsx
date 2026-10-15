import type { IDockviewHeaderActionsProps } from "dockview"
import { useState, useEffect, useCallback } from "react"
import { ExternalLink, Maximize2, Minimize2, X } from "lucide-react"

import { ChannelSelector } from "../../../ChannelSelector"
import { useConnectionStore } from "../../../../contexts"
import { extractFdc3PanelId } from "../../dockview-options"
import { dockviewPopoutUrl } from "../../../../utils/dockview-popout"

import { Icon } from "./Icon"

import "./controls.css"

// Popout button component with its own state and logic
const PopoutButton = (props: IDockviewHeaderActionsProps) => {
  const [isPopout, setIsPopout] = useState<boolean>(props.api.location.type === "popout")

  useEffect(() => {
    const locationDisposable = props.api.onDidLocationChange(() => {
      setIsPopout(props.api.location.type === "popout")
    })

    return () => {
      locationDisposable.dispose()
    }
  }, [props.api])

  const handlePopoutToggle = () => {
    if (props.api.location.type !== "popout") {
      props.containerApi
        .addPopoutGroup(props.group, { popoutUrl: dockviewPopoutUrl() })
        .catch(error => {
          console.error("Failed to create popout window:", error)
        })
    } else {
      props.api.moveTo({ position: "right" })
    }
  }

  return (
    <Icon
      title={isPopout ? "Close Window" : "Open In New Window"}
      icon={isPopout ? X : ExternalLink}
      onClick={handlePopoutToggle}
    />
  )
}

// Maximize button component with its own state and logic
const MaximizeButton = (props: IDockviewHeaderActionsProps) => {
  const [isMaximized, setIsMaximized] = useState<boolean>(props.containerApi.hasMaximizedGroup())

  useEffect(() => {
    const maximizedDisposable = props.containerApi.onDidMaximizedGroupChange(() => {
      setIsMaximized(props.containerApi.hasMaximizedGroup())
    })

    return () => {
      maximizedDisposable.dispose()
    }
  }, [props.containerApi])

  const handleMaximizeToggle = () => {
    if (props.containerApi.hasMaximizedGroup()) {
      props.containerApi.exitMaximizedGroup()
    } else {
      props.activePanel?.api.maximize()
    }
  }

  return (
    <Icon
      title={isMaximized ? "Minimize View" : "Maximize View"}
      icon={isMaximized ? Minimize2 : Maximize2}
      onClick={handleMaximizeToggle}
    />
  )
}

const ChannelSelectorButton = ({ activePanelId }: { activePanelId: string }) => {
  const connection = useConnectionStore(state => {
    const instanceId = state.panelToConnection.get(activePanelId)
    return instanceId ? state.connections.get(instanceId) : undefined
  })

  if (!connection) {
    return <div className="size-3 rounded-full bg-muted animate-pulse" />
  }

  return <ChannelSelector key={connection.instanceId} instanceId={connection.instanceId} />
}

/**
 * RightControls component renders action buttons for the right side of the panel header
 * Composes individual button components with their own state management
 */
export const RightControls = (props: IDockviewHeaderActionsProps) => {
  const isPopout = props.api.location.type === "popout"
  const [activePanelId, setActivePanelId] = useState<string | undefined>(() =>
    extractFdc3PanelId(props.activePanel?.params),
  )

  const syncActivePanelId = useCallback(() => {
    // oxlint-disable-next-line typescript/no-unnecessary-condition -- dockview declares group required on IDockviewHeaderActionsProps; the ?? fallback is load-bearing if it is ever absent
    const panel = props.group?.activePanel ?? props.activePanel
    setActivePanelId(panel ? extractFdc3PanelId(panel.params) : undefined)
  }, [props.activePanel, props.group])

  useEffect(() => {
    syncActivePanelId()

    const disposable = props.api.onDidActivePanelChange(() => {
      syncActivePanelId()
    })

    return () => disposable.dispose()
  }, [props.api, syncActivePanelId])

  return (
    <div className="group-control">
      {activePanelId && <ChannelSelectorButton activePanelId={activePanelId} />}
      <PopoutButton {...props} />
      {!isPopout && <MaximizeButton {...props} />}
    </div>
  )
}
