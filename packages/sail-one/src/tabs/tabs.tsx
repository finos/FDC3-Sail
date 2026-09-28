import type { ClientState } from "../state"
import type { TabDetail } from "../state"
import styles from "./styles.module.css"

const Tab = ({ td, active, onClick }: { td: TabDetail; active: boolean; onClick: () => void }) => {
  const label = `Channel ${td.id}`

  return (
    <button
      type="button"
      id={td.id}
      onClick={onClick}
      className={`${styles.tab} ${active ? styles.activeTab : styles.inactiveTab} drop-tab`}
      style={{ backgroundColor: td.background }}
      title={label}
      aria-label={label}
      aria-pressed={active}
    >
      <img src={td.icon} className={styles.tabGlyph} alt="" />
    </button>
  )
}

export const Tabs = ({ cs }: { cs: ClientState }) => {
  return (
    <nav className={styles.tabs} aria-label="User channels">
      <span className={styles.railLabel}>Channels</span>
      {cs.getTabs().map(t => (
        <Tab
          key={t.id}
          td={t}
          active={t.id == cs.getActiveTab().id}
          onClick={() => {
            void cs.setActiveTabId(t.id)
          }}
        />
      ))}
    </nav>
  )
}
