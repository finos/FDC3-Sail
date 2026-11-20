import { useEffect, useMemo, useRef, useState } from "react"
import { SAIL_UI_CONFIG } from "@finos/sail-platform"
import styles from "./styles.module.css"
import type { ClientState } from "../state"
import { Popup } from "../popups/popup"
import { TabList } from "./tabs"
import { createSailOneExtensionStorage } from "../state/extension-storage"
import {
  getExtensionExport,
  getLoadedExtensionUIs,
  subscribeExtensionUIs,
  type LoadedSailExtensionUI,
} from "../state/extensions-runtime"

/** Built-in panels that are not yet extension-owned. */
const CONFIG_ITEMS = ["Tabs"] as const

function ExtensionScreen({ ui }: { ui: LoadedSailExtensionUI }) {
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

  return <div ref={host} />
}

type AppPanelProps = {
  closeAction: () => void
  cs: ClientState
}

export function ConfigPanel({ closeAction }: AppPanelProps) {
  const [item, setItem] = useState<string>("")
  const [, setUiEpoch] = useState(0)
  useEffect(() => subscribeExtensionUIs(() => setUiEpoch(epoch => epoch + 1)), [])
  const extensionUIs = getLoadedExtensionUIs(SAIL_UI_CONFIG)

  // Prefer a directories-titled contribution as the default tab when present.
  useEffect(() => {
    if (item) {
      return
    }
    const directories = extensionUIs.find(ui => /director/i.test(ui.title))
    setItem(directories?.id ?? extensionUIs[0]?.id ?? CONFIG_ITEMS[0])
  }, [extensionUIs, item])

  const extension = extensionUIs.find(ui => ui.id === item)

  return (
    <Popup
      key="AppDConfigPopup"
      title="Settings"
      variant="drawer"
      area={
        <div className={styles.configContent}>
          <div className={styles.configChoiceLeft}>
            {extensionUIs.map(ui => (
              <button
                type="button"
                key={ui.id}
                className={`${styles.configItem} ${ui.id == item ? styles.selected : ""}`}
                onClick={() => setItem(ui.id)}
              >
                {ui.title}
              </button>
            ))}
            {CONFIG_ITEMS.map(a => (
              <button
                type="button"
                key={a}
                className={`${styles.configItem} ${a == item ? styles.selected : ""}`}
                onClick={() => setItem(a)}
              >
                {a}
              </button>
            ))}
          </div>

          <div className={styles.configChoice}>
            {item == "Tabs" ? <TabList /> : null}
            {extension ? <ExtensionScreen ui={extension} /> : null}
          </div>
        </div>
      }
      closeAction={() => closeAction()}
    />
  )
}
