import { LayoutGrid, Settings as SettingsIcon } from "lucide-react"
import styles from "./styles.module.css"

export const Logo = ({ tone = "light" }: { tone?: "light" | "dark" }) => {
  return (
    <div className={`${styles.logo} ${tone === "dark" ? styles.logoOnDark : ""}`}>
      <img src="/icons/logo/logo.svg" className={styles.logoImage} alt="" />
      <p className={styles.logoTextThin}>FDC3</p>
      <p className={styles.logoTextBold}>Sail</p>
    </div>
  )
}

export const OpenAppButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <button type="button" className={styles.openAppButton} onClick={onClick} aria-label="Apps">
      <LayoutGrid className={styles.toolbarIcon} aria-hidden strokeWidth={2.25} />
      Apps
    </button>
  )
}

export const Settings = ({ onClick }: { onClick: () => void }) => {
  return (
    <button
      type="button"
      className={styles.settingsButton}
      onClick={onClick}
      aria-label="Settings"
      title="Settings"
    >
      <SettingsIcon className={styles.toolbarIcon} aria-hidden strokeWidth={2} />
    </button>
  )
}
