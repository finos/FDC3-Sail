import { useEffect, useMemo, useRef, useState } from "react"
import type { BrowserTypes } from "@finos/fdc3"

import { useSailDesktopAgent, useConnectionStore } from "../contexts"
import { ChannelMenu } from "./channel-selector/ChannelMenu"

import "./layout-grid/toolbar/controls/controls.css"

interface ChannelSelectorProps {
  instanceId: string
}

export function ChannelSelector({ instanceId }: ChannelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const agent = useSailDesktopAgent()
  const agentRef = useRef(agent)
  agentRef.current = agent

  // Subscribe to connection-store push updates (channelChanged) — not agent state snapshots.
  const connection = useConnectionStore(state => state.connections.get(instanceId))
  const currentChannelId = connection?.channelId ?? null

  const channels = useMemo<BrowserTypes.Channel[]>(() => {
    try {
      return agentRef.current.channels.getUserChannels()
    } catch (err) {
      console.error("[ChannelSelector] Failed to get user channels:", err)
      return []
    }
    // User channels are fixed at Desktop Agent construction.
  }, [])

  const currentChannel = channels.find(channel => channel.id === currentChannelId)
  const currentColor = currentChannel?.displayMetadata?.color ?? "var(--muted-foreground)"

  useEffect(() => {
    if (!connection) {
      setIsOpen(false)
    }
  }, [connection])

  useEffect(() => {
    setIsOpen(false)
    setError(null)
  }, [instanceId])

  const handleSelectChannel = (channelId: string | null) => {
    void (async () => {
      setIsLoading(true)
      setError(null)

      try {
        // channels.changeAppChannel resolves after onAppChannelChange push; store updates via apps/channels subscriptions.
        await agentRef.current.channels.changeAppChannel(instanceId, channelId)
        setIsOpen(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to change channel")
      } finally {
        setIsLoading(false)
      }
    })()
  }

  const channelLabel = currentChannel?.displayMetadata?.name ?? "No channel"

  const trigger = (
    <button
      type="button"
      className="icon-button relative flex items-center justify-center disabled:opacity-50"
      disabled={isLoading}
      title={channelLabel}
      aria-label={channelLabel}
      aria-haspopup="menu"
    >
      <span
        className="size-3 rounded-full border border-border"
        style={{ backgroundColor: currentColor }}
      />
      {isLoading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="size-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </span>
      )}
    </button>
  )

  return (
    <ChannelMenu
      trigger={trigger}
      channels={channels}
      selectedChannelId={currentChannelId}
      onChannelSelect={handleSelectChannel}
      open={isOpen}
      onOpenChange={setIsOpen}
      error={error}
      onDismissError={() => setError(null)}
    />
  )
}
