import { useCallback, useEffect, useState, type ReactNode } from "react"
import { createRoot } from "react-dom/client"
import type { ChannelState } from "@finos/sail-headless-agent"
import { getAppBarProperties, SAIL_UI_APP_BAR } from "@finos/sail-platform"
import type { SailExtensionUI, SailExtensionUIProps } from "@finos/sail-extension/ui"
import {
  SAIL_FDC3_CHANNELS,
  type SailFdc3Channels,
} from "@finos/sail-extension-fdc3/api"

import { FDC3_CHANNELS_EXTENSION_ID } from "./ids"

function ChannelMenu({
  trigger,
  channels,
  selectedChannelId,
  onChannelSelect,
  open,
  onOpenChange,
  error,
}: {
  trigger: ReactNode
  channels: ChannelState[]
  selectedChannelId: string | null
  onChannelSelect: (channelId: string | null) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  error: string | null
}) {
  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      <div
        onClick={() => onOpenChange(!open)}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onOpenChange(!open)
          }
        }}
        role="button"
        tabIndex={0}
      >
        {trigger}
      </div>
      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "100%",
            marginTop: 4,
            zIndex: 50,
            minWidth: 160,
            padding: 8,
            background: "var(--popover, #fff)",
            color: "var(--popover-foreground, #111)",
            border: "1px solid var(--border, #ddd)",
            borderRadius: 6,
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
          }}
        >
          <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>User Channels</div>
          {channels.map(channel => {
            const selected = selectedChannelId === channel.id
            const color = channel.displayMetadata?.color ?? "#888"
            const name = channel.displayMetadata?.name ?? channel.id
            return (
              <button
                key={channel.id}
                type="button"
                onClick={() => onChannelSelect(selected ? null : channel.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "4px 6px",
                  border: "none",
                  background: selected ? "rgba(0,0,0,0.06)" : "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  borderRadius: 4,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 9999,
                    background: color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ flex: 1 }}>{name}</span>
                {selected ? "✓" : null}
              </button>
            )
          })}
          {selectedChannelId && (
            <button
              type="button"
              onClick={() => onChannelSelect(null)}
              style={{
                display: "block",
                width: "100%",
                marginTop: 4,
                padding: "4px 6px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                textAlign: "left",
                opacity: 0.75,
              }}
            >
              Leave channel
            </button>
          )}
          {channels.length === 0 && (
            <div style={{ fontSize: 12, opacity: 0.6 }}>No channels available</div>
          )}
          {error && (
            <div style={{ marginTop: 4, fontSize: 11, color: "#b91c1c" }}>{error}</div>
          )}
        </div>
      )}
    </div>
  )
}

export function ChannelSelectorAppBar({ getExport, properties }: SailExtensionUIProps) {
  const appBar = getAppBarProperties(properties)
  const channelsApi = getExport<SailFdc3Channels>(SAIL_FDC3_CHANNELS)
  const instanceId = appBar?.instanceId

  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [catalog, setCatalog] = useState<ChannelState[]>([])
  const [currentId, setCurrentId] = useState<string | null>(null)

  const refreshCatalog = useCallback(() => {
    setCatalog(channelsApi?.getUserChannels() ?? [])
  }, [channelsApi])

  const refreshMembership = useCallback(() => {
    if (!channelsApi || !instanceId) {
      setCurrentId(null)
      return
    }
    setCurrentId(channelsApi.getAppChannelId(instanceId))
  }, [channelsApi, instanceId])

  useEffect(() => {
    refreshCatalog()
    refreshMembership()
    if (!channelsApi) return
    const unsubCatalog = channelsApi.onCatalogChange(refreshCatalog)
    const unsubMember = channelsApi.onAppChannelChange(e => {
      if (!instanceId || e.instanceId === instanceId) {
        refreshMembership()
      }
    })
    return () => {
      unsubCatalog()
      unsubMember()
    }
  }, [channelsApi, instanceId, refreshCatalog, refreshMembership])

  if (!instanceId || !channelsApi) {
    return null
  }

  const current = catalog.find(c => c.id === currentId)
  const color = current?.displayMetadata?.color ?? "var(--muted-foreground, #888)"
  const label = current?.displayMetadata?.name ?? "No channel"

  const handleSelect = (channelId: string | null) => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        await channelsApi.changeAppChannel(instanceId, channelId)
        setOpen(false)
        refreshMembership()
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setLoading(false)
      }
    })()
  }

  const trigger = (
    <button
      type="button"
      disabled={loading}
      title={label}
      aria-label={label}
      aria-haspopup="menu"
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 28,
        height: 28,
        border: "none",
        background: "transparent",
        cursor: loading ? "wait" : "pointer",
        opacity: loading ? 0.5 : 1,
      }}
    >
      <span
        style={{
          width: 12,
          height: 12,
          borderRadius: 9999,
          background: color,
          border: "1px solid var(--border, #ccc)",
        }}
      />
    </button>
  )

  return (
    <ChannelMenu
      trigger={trigger}
      channels={catalog}
      selectedChannelId={currentId}
      onChannelSelect={handleSelect}
      open={open}
      onOpenChange={setOpen}
      error={error}
    />
  )
}

export function mount(el: HTMLElement, props: SailExtensionUIProps): () => void {
  const root = createRoot(el)
  root.render(<ChannelSelectorAppBar {...props} />)
  return () => {
    root.unmount()
  }
}

export const channelSelectorAppBarUi: SailExtensionUI = {
  id: `${FDC3_CHANNELS_EXTENSION_ID}.selector`,
  title: "Channel selector",
  type: SAIL_UI_APP_BAR,
  mount,
}

export default channelSelectorAppBarUi
