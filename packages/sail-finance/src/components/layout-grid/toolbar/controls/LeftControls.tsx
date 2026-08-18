import type { IDockviewHeaderActionsProps } from "dockview"
import { Plus } from "lucide-react"

import { Icon } from "./Icon"
import "./controls.css"

const AddPanelButton = (props: IDockviewHeaderActionsProps) => {
  const handleAddPanel = () => {
    const timestamp = Date.now().toString()

    props.containerApi.addPanel({
      id: `id_${timestamp}`,
      component: "default",
      title: "New Tab",
      position: {
        referenceGroup: props.group,
      },
    })
  }
  return <Icon icon={Plus} title="Add New Panel" onClick={handleAddPanel} />
}

/**
 * LeftControls component renders the add panel button on the left side of the panel header
 * Allows users to create new panels in the current group
 */
export const LeftControls = (props: IDockviewHeaderActionsProps) => {
  // Handle adding a new panel to the current group

  return (
    <div className="group-control">
      <AddPanelButton {...props} />
    </div>
  )
}
