import React from "react"

interface ChooseAppIconProps {
  className?: string
  size?: number
}

export const ChooseAppIcon: React.FC<ChooseAppIconProps> = ({ className = "", size = 40 }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={className}
    >
      <rect width="40" height="40" rx="8" fill="currentColor" fillOpacity="0.1" />
      <rect
        x="8"
        y="8"
        width="10"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <rect
        x="22"
        y="8"
        width="10"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeDasharray="2 2"
      />
      <rect
        x="8"
        y="22"
        width="10"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeDasharray="2 2"
      />
      <rect
        x="22"
        y="22"
        width="10"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <circle cx="15" cy="15" r="1.5" fill="currentColor" />
      <circle cx="29" cy="15" r="1.5" fill="currentColor" opacity="0.5" />
      <circle cx="15" cy="29" r="1.5" fill="currentColor" opacity="0.5" />
      <circle cx="29" cy="29" r="1.5" fill="currentColor" />
    </svg>
  )
}
