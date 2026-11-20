import { useEffect, useMemo, useRef, useState } from "react"
import { SAIL_UI_APP_BAR } from "@finos/sail-platform"
import {
  getExtensionExport,
  getLoadedExtensionUIs,
  subscribeExtensionUIs,
  type LoadedSailExtensionUI,
} from "../state/extensions-runtime"
import { createSailOneExtensionStorage } from "../state/extension-storage"

function AppBarUiMount({ ui, instanceId }: { ui: LoadedSailExtensionUI; instanceId: string }) {
  const host = useRef<HTMLDivElement>(null)
  const storage = useMemo(() => createSailOneExtensionStorage(ui.coreId), [ui.coreId])
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

  return (
    <div
      ref={host}
      style={{ display: "inline-flex", alignItems: "center", color: "inherit" }}
    />
  )
}

/** Mounts all `sail.ui.app.bar` contributions for one app instance. */
export function AppBarSlot({ instanceId }: { instanceId: string }) {
  const [, setEpoch] = useState(0)
  useEffect(() => subscribeExtensionUIs(() => setEpoch(n => n + 1)), [])
  const uis = getLoadedExtensionUIs(SAIL_UI_APP_BAR)

  if (uis.length === 0) {
    return null
  }

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
      {uis.map(ui => (
        <AppBarUiMount key={`${ui.coreId}:${ui.id}`} ui={ui} instanceId={instanceId} />
      ))}
    </div>
  )
}
