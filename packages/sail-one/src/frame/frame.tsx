import { useState } from "react"
import { Logo, OpenAppButton, Settings } from "../top/top"
import { Tabs } from "../tabs/tabs"
import styles from "./styles.module.css"
import type { ClientState } from "../state"
import { AppDPanel } from "../appd/appd"
import { Grids } from "../grid/grid"
import { ConfigPanel } from "../config/config"

enum Popup {
  NONE,
  APPD,
  SETTINGS,
}

interface FrameProps {
  cs: ClientState
}

export function Frame({ cs }: FrameProps) {
  const [popup, setPopup] = useState(Popup.NONE)
  const openAppDirectory = () => setPopup(Popup.APPD)

  return (
    <div className={styles.outer}>
      <div className={styles.top}>
        <Logo tone="dark" />
        <div className={styles.topActions}>
          <OpenAppButton onClick={openAppDirectory} />
          <Settings onClick={() => setPopup(Popup.SETTINGS)} />
        </div>
      </div>
      <div className={styles.left} aria-label="Workspace tabs">
        <Tabs cs={cs} />
      </div>
      <div className={styles.main}>
        <Grids cs={cs} onOpenApp={openAppDirectory} />
      </div>
      {popup == Popup.APPD ? (
        <AppDPanel key="appd" closeAction={() => setPopup(Popup.NONE)} />
      ) : null}
      {popup == Popup.SETTINGS ? (
        <ConfigPanel key="config" cs={cs} closeAction={() => setPopup(Popup.NONE)} />
      ) : null}
    </div>
  )
}
