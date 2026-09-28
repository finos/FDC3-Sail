import React from "react"

interface WorkspaceProps {
  children: React.ReactNode
  className?: string
}

export const Workspace: React.FC<WorkspaceProps> = ({ children, className = "" }) => {
  return <div className={`flex-1 overflow-hidden ${className}`}>{children}</div>
}
