import { Context } from "@finos/fdc3-context-v3"
import { AppPanel } from "@finos/fdc3-sail-common"
import { DA_PENDING_ICON } from "../pending/pending"
import styles from "./styles.module.css"

export const Empty = () => {
  return <div className={styles.empty} />
}

export const Logo = ({ onClick }: { onClick?: () => void }) => {
  return (
    <div className={styles.logo} onClick={onClick}>
      <img src="/icons/logo/logo.svg" className={styles.logoImage} />
      <p className={styles.logoTextThin}>FDC3</p>
      <p className={styles.logoTextBold}>Sail</p>
    </div>
  )
}

export const InvisibleAppIcons = ({
  panels,
  onToggle,
  daReady,
}: {
  panels: AppPanel[]
  onToggle: (panel: AppPanel) => void
  daReady: boolean
}) => {
  if (panels.length === 0) {
    return null
  }
  return (
    <div className={styles.invisibleApps}>
      {panels.map((p) => (
        <button
          key={p.panelId}
          type="button"
          className={
            !daReady
              ? styles.invisibleAppIconPending
              : p.dialogOpen
                ? styles.invisibleAppIconActive
                : styles.invisibleAppIcon
          }
          title={daReady ? p.title : "Waiting for Desktop Agent"}
          onClick={() => onToggle(p)}
        >
          {daReady && p.icon ? (
            <img src={p.icon} alt={p.title} className={styles.invisibleAppImg} />
          ) : daReady ? (
            <span className={styles.invisibleAppFallback}>
              {(p.title || p.appId).slice(0, 1).toUpperCase()}
            </span>
          ) : (
            <img src={DA_PENDING_ICON} alt="" className={styles.invisibleAppImg} />
          )}
        </button>
      ))}
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
