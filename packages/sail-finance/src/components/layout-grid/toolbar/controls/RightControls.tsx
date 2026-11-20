import type { IDockviewHeaderActionsProps } from "dockview"
import { useState, useEffect } from "react"
import { ExternalLink, Maximize2, Minimize2, X } from "lucide-react"

import { dockviewPopoutUrl } from "../../../../utils/dockview-popout"

import { Icon } from "./Icon"

import "./controls.css"

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

/**
 * Group-level chrome only (popout / maximize). Per-app `sail.ui.app.bar`
 * contributions render on {@link AppTab}.
 */
export const RightControls = (props: IDockviewHeaderActionsProps) => {
  const isPopout = props.api.location.type === "popout"

  return (
    <div className="group-control">
      <PopoutButton {...props} />
      {!isPopout && <MaximizeButton {...props} />}
    </div>
  )
}
