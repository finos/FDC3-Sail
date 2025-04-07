import { Context } from "@finos/fdc3-context"
import styles from "./styles.module.css"

export const Empty = () => {
  return <div className={styles.empty} />
}

export const Logo = () => {
  return (
    <div className={styles.logo}>
      <img src="/icons/logo/logo.svg" className={styles.logoImage} />
      <p className={styles.logoTextThin}>FDC3</p>
      <p className={styles.logoTextBold}>Sail</p>
    </div>
  )
}

export const Settings = ({ onClick }: { onClick: () => void }) => {
  return (
    <div className={styles.settings}>
      <img
        src="/icons/control/dots.svg"
        className={styles.settingsControl}
        onClick={onClick}
      />
    </div>
  )
}

export const ContextHistory = ({
  onClick,
  contextHistory,
}: {
  onClick: () => void
  contextHistory: Context[]
}) => {
  return contextHistory.length == 0 ? null : (
    <div className={styles.contextHistoryClosed} onClick={onClick}>
      <div className={styles.contextHistoryItem}>
        <div className={styles.contextType}>{contextHistory[0].type}</div>
        <div className={styles.contextData}>
          {contextHistory[0].name ?? "No Name"}
        </div>
      </div>
    </div>
  )
}
