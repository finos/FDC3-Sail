import { useEffect, useMemo, useRef, useState } from "react"
import { SAIL_UI_APP_BAR } from "@finos/sail-platform"
import type { SailExtensionUI } from "@finos/sail-extension/ui"
import { createSailFinanceExtensionStorage } from "../../state/extension-storage"
import {
  getExtensionExport,
  getLoadedExtensionUIs,
  loadExtensionUIs,
} from "../../state/extensions-runtime"

function AppBarUiMount({ ui, instanceId }: { ui: SailExtensionUI; instanceId: string }) {
  const host = useRef<HTMLDivElement>(null)
  const storage = useMemo(() => createSailFinanceExtensionStorage(ui.id), [ui.id])
  const props = useMemo(
    () => ({
      storage,
      getExport: getExtensionExport,
      properties: { instanceId },
    }),
    [storage, instanceId],
  )

  useEffect(() => {
    const el = host.current
    if (!el) {
      return
    }
    return ui.mount(el, props)
  }, [ui, props])

  return <div ref={host} className="inline-flex items-center" />
}

/**
 * Mounts all `sail.ui.app.bar` contributions for one app instance.
 */
export function AppBarSlot({ instanceId }: { instanceId: string }) {
  const [uis, setUis] = useState<SailExtensionUI[]>([])

  useEffect(() => {
    void loadExtensionUIs().then(() => {
      setUis(getLoadedExtensionUIs(SAIL_UI_APP_BAR))
    })
  }, [])

  if (uis.length === 0) {
    return null
  }

  return (
    <div className="inline-flex items-center gap-1">
      {uis.map(ui => (
        <AppBarUiMount key={ui.id} ui={ui} instanceId={instanceId} />
      ))}
    </div>
  )
}
