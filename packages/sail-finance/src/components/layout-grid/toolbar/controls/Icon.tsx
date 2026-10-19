import React from "react"
import "./controls.css"

// Types for better type safety
interface IconProps {
  icon: React.ComponentType<{ size?: number }>
  title?: string
  onClick?: (event: React.MouseEvent) => void
}

const ICON_SIZE = 16

// Reusable icon component with consistent styling and behavior
export const Icon = ({ icon: IconComponent, title, onClick }: IconProps) => {
  return (
    <div title={title} className="icon-button" onClick={onClick}>
      <IconComponent size={ICON_SIZE} />
    </div>
  )
}
