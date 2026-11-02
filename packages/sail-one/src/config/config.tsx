import { useEffect, useRef, useState } from "react"
import { SAIL_CONFIG_UI, type SailExtensionUI } from "@finos/sail-extension/ui"
import styles from "./styles.module.css"
import type { ClientState } from "../state"
import { Popup } from "../popups/popup"
import { DirectoryList } from "./directories"
import { TabList } from "./tabs"
import { CustomAppList } from "./custom-apps"
import { createSailOneExtensionStorage } from "../state/extension-storage"
import { getLoadedExtensionUIs, subscribeExtensionUIs } from "../state/extensions-runtime"

const CONFIG_ITEMS = ["Directories", "Tabs", "Custom Apps"]

function ExtensionScreen({ ui }: { ui: SailExtensionUI }) {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!host.current || !ui.mount) {
      return
    }
    return ui.mount(host.current, { storage: createSailOneExtensionStorage(ui.id) })
  }, [ui])

  return <div ref={host} />
}

type AppPanelProps = {
  closeAction: () => void
  cs: ClientState
}

export function ConfigPanel({ closeAction }: AppPanelProps) {
  const [item, setItem] = useState(CONFIG_ITEMS[0])
  const [, setUiEpoch] = useState(0)
  useEffect(() => subscribeExtensionUIs(() => setUiEpoch(epoch => epoch + 1)), [])
  const extensionUIs = getLoadedExtensionUIs(SAIL_CONFIG_UI)
  const extension = extensionUIs.find(ui => ui.id === item)

  return (
    <Popup
      key="AppDConfigPopup"
      title="Settings"
      variant="drawer"
      area={
        <div className={styles.configContent}>
          <div className={styles.configChoiceLeft}>
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
          </div>

          <div className={styles.configChoice}>
            {item == CONFIG_ITEMS[0] ? <DirectoryList /> : null}
            {item == CONFIG_ITEMS[1] ? <TabList /> : null}
            {item == CONFIG_ITEMS[2] ? <CustomAppList /> : null}
            {extension ? <ExtensionScreen ui={extension} /> : null}
          </div>
        </div>
      }
      closeAction={() => closeAction()}
    />
  )
}
