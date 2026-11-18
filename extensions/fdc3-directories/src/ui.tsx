import { useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import {
  SAIL_UI_CONFIG,
  type SailExtensionUI,
  type SailExtensionUIProps,
} from "@finos/sail-extension/ui"
import {
  DIRECTORIES_DEFAULT_SETTINGS,
  DIRECTORIES_SETTINGS_KEY,
  FDC3_DIRECTORIES_EXTENSION_ID,
  type DirectoriesSettings,
  type DirectorySource,
} from "./settings"

export function ConfigScreen({ storage }: SailExtensionUIProps) {
  const [settings, setSettings] = useState<DirectoriesSettings>(DIRECTORIES_DEFAULT_SETTINGS)
  const [url, setUrl] = useState("")
  const [label, setLabel] = useState("")

  useEffect(() => {
    void storage.get<DirectoriesSettings>(DIRECTORIES_SETTINGS_KEY).then(s => {
      if (s) setSettings(s)
    })
  }, [storage])

  async function save(next: DirectoriesSettings) {
    setSettings(next)
    // activate() subscribes via storage.onChange and re-syncs appDirectory.
    await storage.set(DIRECTORIES_SETTINGS_KEY, next)
  }

  async function addSource() {
    if (!url.trim()) return
    const source: DirectorySource = {
      id: crypto.randomUUID(),
      label: label.trim() || url,
      url: url.trim(),
      active: true,
    }
    await save({ sources: [...settings.sources, source] })
    setUrl("")
    setLabel("")
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <p style={{ margin: 0, opacity: 0.8 }}>
        AppD directory URLs. Active sources are published into sail.fdc3.appDirectory.
      </p>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {settings.sources.map(s => (
          <li key={s.id} style={{ marginBottom: 6 }}>
            <label>
              <input
                type="checkbox"
                checked={s.active}
                onChange={e => {
                  void save({
                    sources: settings.sources.map(x =>
                      x.id === s.id ? { ...x, active: e.target.checked } : x,
                    ),
                  })
                }}
              />{" "}
              {s.label} <code>{s.url}</code>
            </label>{" "}
            <button
              type="button"
              onClick={() => {
                void save({ sources: settings.sources.filter(x => x.id !== s.id) })
              }}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          placeholder="Label"
          value={label}
          onChange={e => setLabel(e.target.value)}
        />
        <input
          placeholder="https://…/apps"
          value={url}
          onChange={e => setUrl(e.target.value)}
          style={{ minWidth: 240 }}
        />
        <button type="button" onClick={() => void addSource()}>
          Add
        </button>
      </div>
    </div>
  )
}

/**
 * Own React root — required when the host dynamically imports this module from
 * the extension server (separate Vite origin). Rendering ConfigScreen inside the
 * host tree hits "Invalid hook call" from two copies of React.
 */
export function mount(el: HTMLElement, props: SailExtensionUIProps): () => void {
  const root = createRoot(el)
  root.render(<ConfigScreen {...props} />)
  return () => {
    root.unmount()
  }
}

export const directoriesUI: SailExtensionUI = {
  id: FDC3_DIRECTORIES_EXTENSION_ID,
  title: "Directories",
  type: SAIL_UI_CONFIG,
  ConfigScreen,
  mount,
}

export default directoriesUI
