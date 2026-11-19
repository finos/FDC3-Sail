import { useEffect, useMemo, useRef, useState } from "react"
import { SAIL_UI_CONFIG } from "@finos/sail-platform"
import type { SailExtensionUI } from "@finos/sail-extension/ui"
import { createSailFinanceExtensionStorage } from "../../state/extension-storage"
import {
  getExtensionExport,
  getLoadedExtensionUIs,
  loadExtensionUIs,
} from "../../state/extensions-runtime"

function ExtensionUiMount({ ui }: { ui: SailExtensionUI }) {
  const host = useRef<HTMLDivElement>(null)
  const storage = useMemo(() => createSailFinanceExtensionStorage(ui.id), [ui.id])
  const props = useMemo(
    () => ({ storage, getExport: getExtensionExport }),
    [storage],
  )

  useEffect(() => {
    const el = host.current
    if (!el) {
      return
    }
    return ui.mount(el, props)
  }, [ui, props])

  return <div ref={host} />
}

/**
 * Renders sail.ui.config contributions from loaded extensions.
 */
export function ExtensionSettings() {
  const [uis, setUis] = useState<SailExtensionUI[]>([])

  useEffect(() => {
    void loadExtensionUIs().then(() => {
      setUis(getLoadedExtensionUIs(SAIL_UI_CONFIG))
    })
  }, [])

  if (uis.length === 0) {
    return (
      <p className="text-sm text-muted-foreground px-2">
        No extension settings loaded. Check host <code className="text-xs">extensions.json</code>{" "}
        and that the Sail extensions Vite plugin is enabled.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-2">
      {uis.map(ui => (
        <section key={ui.id} className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">{ui.title}</h3>
          <ExtensionUiMount ui={ui} />
        </section>
      ))}
    </div>
  )
}
