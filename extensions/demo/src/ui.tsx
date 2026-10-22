import { useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import {
  SAIL_CONFIG_UI,
  type SailExtensionConfigProps,
  type SailExtensionUI,
} from "@finos/sail-extension/ui"

import { DEMO_DEFAULT_SETTINGS, DEMO_SETTINGS_KEY, type DemoSettings } from "./settings"

export function ConfigScreen({ storage }: SailExtensionConfigProps) {
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
        When enabled, inbound DACP messages are written to the Desktop Agent log.
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
        Log inbound messages
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

export function mount(el: HTMLElement, props: SailExtensionConfigProps): () => void {
  const root = createRoot(el)
  root.render(<ConfigScreen {...props} />)
  return () => {
    root.unmount()
  }
}

export const demoExtensionUI: SailExtensionUI = {
  id: "demo",
  title: "Message Log",
  type: SAIL_CONFIG_UI,
  ConfigScreen,
  mount,
}

export default demoExtensionUI
