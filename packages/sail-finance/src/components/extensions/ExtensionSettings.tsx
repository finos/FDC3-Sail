import { useEffect, useState } from "react"
import { SAIL_UI_CONFIG } from "@finos/sail-extension"
import type { SailExtensionUI } from "@finos/sail-extension/ui"
import { createSailFinanceExtensionStorage } from "../../state/extension-storage"
import { getLoadedExtensionUIs, loadExtensionUIs } from "../../state/extensions-runtime"

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
      {uis.map(ui => {
        const Screen = ui.ConfigScreen
        if (!Screen) {
          return null
        }
        const storage = createSailFinanceExtensionStorage(ui.id)
        return (
          <section key={ui.id} className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">{ui.title}</h3>
            <Screen storage={storage} />
          </section>
        )
      })}
    </div>
  )
}
