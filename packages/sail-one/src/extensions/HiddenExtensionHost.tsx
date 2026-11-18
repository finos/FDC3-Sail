import { useEffect, useMemo, useRef, useState } from "react"
import { SAIL_UI_HIDDEN } from "@finos/sail-platform"
import { createSailOneExtensionStorage } from "../state/extension-storage"
import {
  getExtensionExport,
  getLoadedExtensionUIs,
  subscribeExtensionUIs,
  type LoadedSailExtensionUI,
} from "../state/extensions-runtime"

/**
 * Mounts `sail.ui.hidden` contributions in the top-level host page (no visible chrome).
 * WCP / MessagePort edges attach here so they share the app iframes' parent window.
 */
function HiddenUiMount({ ui }: { ui: LoadedSailExtensionUI }) {
  const host = useRef<HTMLDivElement>(null)
  const storage = useMemo(() => createSailOneExtensionStorage(ui.coreId), [ui.coreId])
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

export function HiddenExtensionHost() {
  const [, setEpoch] = useState(0)
  useEffect(() => subscribeExtensionUIs(() => setEpoch(n => n + 1)), [])
  const hidden = getLoadedExtensionUIs(SAIL_UI_HIDDEN)
  return (
    <>
      {hidden.map(ui => (
        <HiddenUiMount key={`${ui.coreId}:${ui.id}`} ui={ui} />
      ))}
    </>
  )
}
