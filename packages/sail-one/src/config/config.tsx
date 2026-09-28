import { useState } from "react"
import styles from "./styles.module.css"
import type { ClientState } from "../state"
import { Popup } from "../popups/popup"
import { DirectoryList } from "./directories"
import { TabList } from "./tabs"
import { CustomAppList } from "./custom-apps"

const CONFIG_ITEMS = ["Directories", "Tabs", "Custom Apps"]

type AppPanelProps = {
  closeAction: () => void
  cs: ClientState
}

export function ConfigPanel({ closeAction }: AppPanelProps) {
  const [item, setItem] = useState(CONFIG_ITEMS[0])

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
          </div>

          <div className={styles.configChoice}>
            {item == CONFIG_ITEMS[0] ? <DirectoryList /> : null}
            {item == CONFIG_ITEMS[1] ? <TabList /> : null}
            {item == CONFIG_ITEMS[2] ? <CustomAppList /> : null}
          </div>
        </div>
      }
      closeAction={() => closeAction()}
    />
  )
}
