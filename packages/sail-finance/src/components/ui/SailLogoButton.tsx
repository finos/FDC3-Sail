import * as React from "react"
import { type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

import { Button, buttonVariants } from "./button"

const SailLogo = () => (
  <svg viewBox="0 0 88.3 129.1" xmlns="http://www.w3.org/2000/svg" className="size-4">
    <defs>
      <linearGradient
        id="SVGID_1_"
        gradientUnits="userSpaceOnUse"
        x1="123.0337"
        y1="527.5911"
        x2="7.14"
        y2="635.2071"
        gradientTransform="matrix(1 0 0 1 0 -495.3865)"
      >
        <stop offset="0.5805" style={{ stopColor: "#3EC6F3", stopOpacity: 0 }} />
        <stop offset="1" style={{ stopColor: "#3EC6F3" }} />
      </linearGradient>
      <linearGradient
        id="SVGID_00000043455096372608589010000017493685529213971365_"
        gradientUnits="userSpaceOnUse"
        x1="43.506"
        y1="85.0807"
        x2="43.506"
        y2="207.2497"
        gradientTransform="matrix(1 0 0 -1 0 214)"
      >
        <stop offset="0" style={{ stopColor: "#50C9EF" }} />
        <stop offset="1" style={{ stopColor: "#50C9EF", stopOpacity: 0.6 }} />
      </linearGradient>
    </defs>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      fill="url(#SVGID_1_)"
      d="M88.3,0c0,0-0.6,1.4-2,3.9c-5,9-19.8,32.6-51.7,60.5c-40.9,35.8-34.2,64.5-34.2,64.5h87.9V0z"
    />
    <path
      fill="url(#SVGID_00000043455096372608589010000017493685529213971365_)"
      d="M0.4,128.9c-0.3-6.4,1.4-12.7,3.6-18.7c2.3-6,5.4-11.6,8.9-16.9C20,82.7,29.2,73.6,38.4,65c4.7-4.3,9.4-8.5,13.8-13c4.5-4.4,8.7-9.1,12.8-13.9s7.9-9.9,11.5-15c3.7-5.1,7.1-10.5,10.1-16l0.1,0.1c-2.9,5.7-6.1,11.1-9.7,16.4c-3.5,5.3-7.3,10.4-11.3,15.3S57.4,48.5,52.9,53s-9.2,8.8-13.8,13.1s-9.2,8.7-13.6,13.3c-4.3,4.6-8.4,9.5-12,14.7s-6.7,10.7-9.1,16.6c-2.4,5.8-4.2,12-4.1,18.4L0.4,128.9z"
    />
  </svg>
)

interface SailLogoButtonProps
  extends React.ComponentProps<typeof Button>, VariantProps<typeof buttonVariants> {
  showText?: boolean
  logoPosition?: "left" | "right"
}

const SailLogoButton = React.forwardRef<HTMLButtonElement, SailLogoButtonProps>(
  ({ children, showText = true, logoPosition = "left", className, ...props }, ref) => {
    const logoElement = <SailLogo />

    return (
      <Button ref={ref} className={cn("gap-2", className)} {...props}>
        {logoPosition === "left" && logoElement}
        {showText && (children || "Sail")}
        {logoPosition === "right" && logoElement}
      </Button>
    )
  },
)

SailLogoButton.displayName = "SailLogoButton"

export { SailLogoButton }
