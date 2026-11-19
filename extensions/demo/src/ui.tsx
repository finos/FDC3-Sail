import { useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import { SAIL_UI_CONFIG } from "@finos/sail-platform"
import type { SailExtensionUI, SailExtensionUIProps } from "@finos/sail-extension/ui"

import {
  DEMO_DEFAULT_SETTINGS,
  DEMO_EXTENSION_ID,
  DEMO_SETTINGS_KEY,
  type DemoSettings,
} from "./settings"

export function ConfigScreen({ storage }: SailExtensionUIProps) {
  const [enabled, setEnabled] = useState(DEMO_DEFAULT_SETTINGS.enabled)
  const [label, setLabel] = useState(DEMO_DEFAULT_SETTINGS.label)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    void storage.get<DemoSettings>(DEMO_SETTINGS_KEY).then(stored => {
      setEnabled(stored?.enabled ?? DEMO_DEFAULT_SETTINGS.enabled)
      setLabel(stored?.label ?? DEMO_DEFAULT_SETTINGS.label)
      setReady(true)
    })
  }, [storage])

  async function persist(next: DemoSettings): Promise<void> {
    await storage.set(DEMO_SETTINGS_KEY, next)
  }

  if (!ready) {
    return <p>Loading…</p>
  }

  return (
    <form
      style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: "24rem" }}
      onSubmit={event => event.preventDefault()}
    >
      <p style={{ margin: 0 }}>
        When enabled, messages on <code>sail.platform.bus</code> are written to the console.
      </p>
      <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={event => {
            const next = { enabled: event.target.checked, label }
            setEnabled(next.enabled)
            void persist(next)
          }}
        />
        Log bus messages
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        Log label
        <input
          type="text"
          value={label}
          onChange={event => {
            const next = { enabled, label: event.target.value }
            setLabel(next.label)
            void persist(next)
          }}
        />
      </label>
    </form>
  )
}

export function mount(el: HTMLElement, props: SailExtensionUIProps): () => void {
  const root = createRoot(el)
  root.render(<ConfigScreen {...props} />)
  return () => {
    root.unmount()
  }
}

export const demoExtensionUI: SailExtensionUI = {
  id: DEMO_EXTENSION_ID,
  title: "Message Log",
  type: SAIL_UI_CONFIG,
  mount,
}

export default demoExtensionUI
