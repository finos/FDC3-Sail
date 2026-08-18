import type { ReactNode } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui"
import { Check, Circle, X } from "lucide-react"
import type { BrowserTypes } from "@finos/fdc3"

export interface ChannelMenuProps {
  trigger: ReactNode
  channels: BrowserTypes.Channel[]
  selectedChannelId?: string | null
  onChannelSelect?: (channelId: string | null) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  error?: string | null
  onDismissError?: () => void
}

export function ChannelMenu({
  trigger,
  channels,
  selectedChannelId,
  onChannelSelect,
  open,
  onOpenChange,
  error,
  onDismissError,
}: ChannelMenuProps) {
  const handleChannelClick = (channelId: string) => {
    if (selectedChannelId === channelId) {
      onChannelSelect?.(null)
    } else {
      onChannelSelect?.(channelId)
    }
    onOpenChange?.(false)
  }

  const handleLeaveChannel = () => {
    onChannelSelect?.(null)
    onOpenChange?.(false)
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="end">
        <div className="flex flex-col gap-1">
          <div className="px-2 py-1 text-xs font-medium text-muted-foreground">User Channels</div>
          {channels.map(channel => {
            const isSelected = selectedChannelId === channel.id
            const color = channel.displayMetadata?.color
            const name = channel.displayMetadata?.name || channel.id

            return (
              <button
                key={channel.id}
                type="button"
                onClick={() => handleChannelClick(channel.id)}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                  isSelected ? "bg-accent" : "hover:bg-accent/50"
                }`}
              >
                {color ? (
                  <Circle className="size-3" style={{ fill: color, stroke: color }} />
                ) : (
                  <Circle className="size-3 text-muted-foreground" />
                )}
                <span className="flex-1 text-left">{name}</span>
                {isSelected && <Check className="size-4 text-primary" />}
              </button>
            )
          })}

          {selectedChannelId && (
            <>
              <hr className="my-1 border-border" />
              <button
                type="button"
                onClick={handleLeaveChannel}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-accent/50"
              >
                <X className="size-3" />
                <span>Leave Channel</span>
              </button>
            </>
          )}

          {channels.length === 0 && (
            <div className="px-2 py-1 text-sm text-muted-foreground">No channels available</div>
          )}

          {error && (
            <div className="mt-1 px-2 text-xs text-destructive">
              {error}
              {onDismissError && (
                <button type="button" onClick={onDismissError} className="ml-2 underline">
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
