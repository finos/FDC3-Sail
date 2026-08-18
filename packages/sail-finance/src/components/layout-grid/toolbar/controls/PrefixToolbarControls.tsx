import { Menu } from "lucide-react"
import { useSidebar } from "@/components/ui"

import { Icon } from "./Icon"
import "./controls.css"

const MenuButton = () => {
  const { toggleSidebar } = useSidebar()
  return <Icon icon={Menu} title="Menu" onClick={toggleSidebar} />
}

/**
 * PrefixHeaderControls component renders controls at the beginning of the panel header
 * Currently displays a menu icon (placeholder for future functionality)
 */
export const PrefixToolbarControls = () => {
  return (
    <div className="group-control">
      <MenuButton />
    </div>
  )
}
