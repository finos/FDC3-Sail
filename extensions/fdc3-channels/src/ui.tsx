import { useCallback, useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import { ChannelType, type ChannelState } from "@finos/sail-headless-agent"
import { SAIL_UI_CONFIG } from "@finos/sail-platform"
import type { SailExtensionUI, SailExtensionUIProps } from "@finos/sail-extension/ui"
import {
  SAIL_FDC3_CHANNELS,
  type SailFdc3Channels,
} from "@finos/sail-extension-fdc3/api"

import { FDC3_CHANNELS_EXTENSION_ID } from "./ids"

function emptyDraft(): ChannelState {
  return {
    id: `fdc3.channel.${crypto.randomUUID().slice(0, 8)}`,
    type: ChannelType.user,
    context: [],
    displayMetadata: { name: "", color: "#888888", glyph: "?" },
  }
}

export function ConfigScreen({ getExport }: SailExtensionUIProps) {
  const channels = getExport<SailFdc3Channels>(SAIL_FDC3_CHANNELS)
  const [list, setList] = useState<ChannelState[]>([])
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<ChannelState>(emptyDraft)

  const refresh = useCallback(() => {
    setList(channels?.getUserChannels() ?? [])
  }, [channels])

  useEffect(() => {
    refresh()
    if (!channels) return
    return channels.onCatalogChange(refresh)
  }, [channels, refresh])

  async function persist(next: ChannelState[]) {
    if (!channels) return
    setError(null)
    try {
      await channels.setUserChannels(next)
      setList(channels.getUserChannels())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  if (!channels) {
    return <p>sail.fdc3.channels is not available.</p>
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <p style={{ margin: 0, opacity: 0.8 }}>
        User channels (name, colour, and icon must each be unique). Stored by sail.fdc3.
      </p>
      {error && (
        <p style={{ margin: 0, color: "#b91c1c" }} role="alert">
          {error}
        </p>
      )}
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {list.map(c => (
          <li key={c.id} style={{ marginBottom: 6 }}>
            <span
              style={{
                display: "inline-block",
                width: 12,
                height: 12,
                borderRadius: 9999,
                background: c.displayMetadata?.color ?? "#888",
                marginRight: 6,
                verticalAlign: "middle",
              }}
            />
            <strong>{c.displayMetadata?.name}</strong>{" "}
            <code>{c.displayMetadata?.glyph}</code> <code>{c.id}</code>{" "}
            <button
              type="button"
              onClick={() => {
                void persist(list.filter(x => x.id !== c.id))
              }}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          placeholder="Name"
          value={draft.displayMetadata?.name ?? ""}
          onChange={e =>
            setDraft({
              ...draft,
              displayMetadata: { ...draft.displayMetadata, name: e.target.value },
            })
          }
        />
        <input
          type="color"
          value={draft.displayMetadata?.color ?? "#888888"}
          onChange={e =>
            setDraft({
              ...draft,
              displayMetadata: { ...draft.displayMetadata, color: e.target.value },
            })
          }
          title="Colour"
        />
        <input
          placeholder="Icon"
          value={draft.displayMetadata?.glyph ?? ""}
          onChange={e =>
            setDraft({
              ...draft,
              displayMetadata: { ...draft.displayMetadata, glyph: e.target.value },
            })
          }
          style={{ width: 48 }}
        />
        <button
          type="button"
          onClick={() => {
            void (async () => {
              await persist([...list, draft])
              setDraft(emptyDraft())
            })()
          }}
        >
          Add
        </button>
      </div>
    </div>
  )
}

export function mount(el: HTMLElement, props: SailExtensionUIProps): () => void {
  const root = createRoot(el)
  root.render(<ConfigScreen {...props} />)
  return () => {
    root.unmount()
  }
}

export const channelsConfigUI: SailExtensionUI = {
  id: FDC3_CHANNELS_EXTENSION_ID,
  title: "User Channels",
  type: SAIL_UI_CONFIG,
  mount,
}

export default channelsConfigUI
