import { useEffect, useMemo, useRef, useState } from "react"
import { SAIL_UI_HIDDEN } from "@finos/sail-platform"
import { createClientStateExtensionStorage } from "../extension-storage"
import {
  getLoadedExtensionUIs,
  subscribeExtensionUIs,
  type LoadedSailExtensionUI,
} from "../extensions-runtime"

function HiddenUiMount({ ui }: { ui: LoadedSailExtensionUI }) {
  const host = useRef<HTMLDivElement>(null)
  const storage = useMemo(() => createClientStateExtensionStorage(ui.coreId), [ui.coreId])

  useEffect(() => {
    const el = host.current
    if (!el || !ui.mount) {
      return
    }
    return ui.mount(el, { storage })
  }, [ui, storage])

  if (ui.ConfigScreen) {
    const Screen = ui.ConfigScreen
    return (
      <div hidden aria-hidden="true">
        <Screen storage={storage} />
      </div>
    )
  }

  return <div ref={host} hidden aria-hidden="true" />
}

/** Top-level client mount for `sail.ui.hidden` (WCP edge lives here, not on the Node DA). */
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
