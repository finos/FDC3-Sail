import { useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import { SAIL_UI_CONFIG } from "@finos/sail-platform"
import type { SailExtensionUI, SailExtensionUIProps } from "@finos/sail-extension/ui"
import type { DirectoryApp } from "@finos/sail-headless-agent"
import {
  CUSTOM_APPS_DEFAULT_SETTINGS,
  CUSTOM_APPS_SETTINGS_KEY,
  type CustomAppsSettings,
} from "./settings"

function CustomAppsConfig({ storage }: SailExtensionUIProps) {
  const [settings, setSettings] = useState<CustomAppsSettings>(CUSTOM_APPS_DEFAULT_SETTINGS)
  const [appId, setAppId] = useState("")
  const [title, setTitle] = useState("")
  const [url, setUrl] = useState("")

  useEffect(() => {
    void storage.get<CustomAppsSettings>(CUSTOM_APPS_SETTINGS_KEY).then(s => {
      if (s) setSettings(s)
    })
  }, [storage])

  async function save(next: CustomAppsSettings) {
    setSettings(next)
    await storage.set(CUSTOM_APPS_SETTINGS_KEY, next)
    await (
      globalThis as { __sailFdc3CustomAppsSync?: () => Promise<void> }
    ).__sailFdc3CustomAppsSync?.()
  }

  async function addApp() {
    if (!appId.trim() || !url.trim()) return
    const app = {
      appId: appId.trim(),
      title: title.trim() || appId.trim(),
      type: "web",
      details: { url: url.trim() },
    } as DirectoryApp
    await save({ apps: [...settings.apps, app] })
    setAppId("")
    setTitle("")
    setUrl("")
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <p style={{ margin: 0, opacity: 0.8 }}>
        Inline app definitions published into sail.fdc3.appDirectory.
      </p>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {settings.apps.map(a => (
          <li key={a.appId} style={{ marginBottom: 6 }}>
            <strong>{a.title ?? a.appId}</strong> <code>{a.appId}</code>{" "}
            <button
              type="button"
              onClick={() => {
                void save({ apps: settings.apps.filter(x => x.appId !== a.appId) })
              }}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input placeholder="appId" value={appId} onChange={e => setAppId(e.target.value)} />
        <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
        <input
          placeholder="https://…"
          value={url}
          onChange={e => setUrl(e.target.value)}
          style={{ minWidth: 240 }}
        />
        <button type="button" onClick={() => void addApp()}>
          Add
        </button>
      </div>
    </div>
  )
}

export function mount(el: HTMLElement, props: SailExtensionUIProps): () => void {
  const root = createRoot(el)
  root.render(<CustomAppsConfig {...props} />)
  return () => {
    root.unmount()
  }
}

export const customAppsUI: SailExtensionUI = {
  id: "sail.fdc3.customApps",
  title: "Custom Apps",
  type: SAIL_UI_CONFIG,
  mount,
}

export default customAppsUI
