import { LogoSail } from "@/components/ui"
import { useState, useRef, useEffect, useCallback } from "react"

interface Position {
  x: number
  y: number
  dockedTo: "top" | "bottom" | "none"
}

export const IconButton = () => {
  const [position, setPosition] = useState<Position>({
    x: 20,
    y: 20,
    dockedTo: "none",
  })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const buttonRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    })
  }

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return

      const newX = e.clientX - dragStart.x
      const newY = e.clientY - dragStart.y

      // Check if we should dock to top or bottom
      const windowHeight = window.innerHeight
      const dockThreshold = 50

      if (newY < dockThreshold) {
        // Dock to top
        setPosition({
          x: Math.max(0, Math.min(newX, window.innerWidth - 120)), // 120px is approximate button width
          y: 0,
          dockedTo: "top",
        })
      } else if (newY > windowHeight - dockThreshold) {
        // Dock to bottom
        setPosition({
          x: Math.max(0, Math.min(newX, window.innerWidth - 120)),
          y: windowHeight - 64, // 64px is button height
          dockedTo: "bottom",
        })
      } else {
        // Free floating
        setPosition({
          x: Math.max(0, Math.min(newX, window.innerWidth - 120)),
          y: Math.max(0, Math.min(newY, windowHeight - 64)),
          dockedTo: "none",
        })
      }
    },
    [isDragging, dragStart],
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }
    }
    return undefined
  }, [isDragging, handleMouseMove, handleMouseUp])

  // Handle window resize to keep button in bounds
  useEffect(() => {
    const handleResize = () => {
      if (position.dockedTo === "top" || position.dockedTo === "bottom") {
        setPosition(prev => ({
          ...prev,
          x: Math.max(0, Math.min(prev.x, window.innerWidth - 120)),
        }))
      } else {
        setPosition(prev => ({
          ...prev,
          x: Math.max(0, Math.min(prev.x, window.innerWidth - 120)),
          y: Math.max(0, Math.min(prev.y, window.innerHeight - 64)),
        }))
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [position.dockedTo])

  const getButtonStyles = () => {
    const baseStyles = {
      position: "fixed" as const,
      zIndex: 9999,
      width: "120px",
      height: "64px",
      cursor: isDragging ? "grabbing" : "grab",
      userSelect: "none" as const,
      transition: isDragging ? "none" : "all 0.2s ease",
      left: `${position.x}px`,
      top: `${position.y}px`,
    }

    if (position.dockedTo === "top") {
      return {
        ...baseStyles,
        top: "0px",
        left: `${position.x}px`,
        right: "auto",
        bottom: "auto",
      }
    } else if (position.dockedTo === "bottom") {
      return {
        ...baseStyles,
        bottom: "0px",
        top: "auto",
        left: `${position.x}px`,
        right: "auto",
      }
    }

    return baseStyles
  }

  return (
    <div
      ref={buttonRef}
      className="bg-sidebar border-brand-secondary flex size-full items-center justify-center rounded-lg border shadow-lg hover:shadow-xl"
      style={getButtonStyles()}
      onMouseDown={handleMouseDown}
    >
      <LogoSail />
    </div>
  )
}
