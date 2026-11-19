/**
 * Legacy host ChannelSelector kept for ChannelSelectorTestPage e2e.
 * Production chrome uses `sail.ui.app.bar` via {@link AppBarSlot}.
 */

import { useEffect, useMemo, useState } from "react"
import {
  SAIL_FDC3_CHANNELS,
  type SailFdc3Channels,
} from "@finos/sail-extension-fdc3"
import type { ChannelState } from "@finos/sail-headless-agent"

import { useConnectionStore } from "../contexts"
import { getExtensionExport } from "../state/extensions-runtime"
import { ChannelMenu } from "./channel-selector/ChannelMenu"

import "./layout-grid/toolbar/controls/controls.css"

interface ChannelSelectorProps {
  instanceId: string
}

function toBrowserChannels(channels: ChannelState[]) {
  return channels.map(c => ({
    id: c.id,
    type: "user" as const,
    displayMetadata: c.displayMetadata,
  }))
}

export function ChannelSelector({ instanceId }: ChannelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [catalog, setCatalog] = useState(() =>
    toBrowserChannels(getExtensionExport<SailFdc3Channels>(SAIL_FDC3_CHANNELS)?.getUserChannels() ?? []),
  )

  const channelsApi = getExtensionExport<SailFdc3Channels>(SAIL_FDC3_CHANNELS)
  const connection = useConnectionStore(state => state.connections.get(instanceId))
  const currentChannelId =
    connection?.channelId ?? channelsApi?.getAppChannelId(instanceId) ?? null

  useEffect(() => {
    if (!channelsApi) return
    const refresh = () => setCatalog(toBrowserChannels(channelsApi.getUserChannels()))
    refresh()
    return channelsApi.onCatalogChange(refresh)
  }, [channelsApi])

  const currentChannel = useMemo(
    () => catalog.find(channel => channel.id === currentChannelId),
    [catalog, currentChannelId],
  )
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
      if (!channelsApi) {
        setError("sail.fdc3.channels is not available")
        return
      }
      setIsLoading(true)
      setError(null)
      try {
        await channelsApi.changeAppChannel(instanceId, channelId)
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
      channels={catalog}
      selectedChannelId={currentChannelId}
      onChannelSelect={handleSelectChannel}
      open={isOpen}
      onOpenChange={setIsOpen}
      error={error}
      onDismissError={() => setError(null)}
    />
  )
}
