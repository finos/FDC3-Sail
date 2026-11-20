import { useEffect, useMemo, useRef, useState } from "react"
import { SAIL_UI_HIDDEN } from "@finos/sail-platform"
import type { SailExtensionUI } from "@finos/sail-extension/ui"
import { createSailFinanceExtensionStorage } from "../../state/extension-storage"
import {
  getExtensionExport,
  getLoadedExtensionUIs,
  loadExtensionUIs,
} from "../../state/extensions-runtime"

function HiddenUiMount({ ui }: { ui: SailExtensionUI }) {
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

  return <div ref={host} hidden aria-hidden="true" />
}

/** Top-level host mount for `sail.ui.hidden` contributions (agent edges, overlays, etc.). */
export function HiddenExtensionHost() {
  const [, setEpoch] = useState(0)
  useEffect(() => {
    void loadExtensionUIs().then(() => setEpoch(n => n + 1))
  }, [])
  const hidden = getLoadedExtensionUIs(SAIL_UI_HIDDEN)
  return (
    <>
      {hidden.map(ui => (
        <HiddenUiMount key={ui.id} ui={ui} />
      ))}
    </>
  )
}
