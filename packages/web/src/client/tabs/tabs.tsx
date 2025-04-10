import { Icon } from "../icon/icon"
import { ClientState } from "@finos/fdc3-sail-common"
import { TabDetail } from "@finos/fdc3-sail-common"
import styles from "./styles.module.css"

const Tab = ({
  td,
  active,
  onClick,
}: {
  td: TabDetail
  active: boolean
  onClick: () => void
}) => {
  return (
    <div
      id={td.id}
      onClick={onClick}
      className={`${styles.tab} ${active ? styles.activeTab : styles.inactiveTab} drop-tab`}
      style={{
        backgroundColor: td.background,
        zIndex: active ? 100 : "none",
      }}
    >
      <Icon text={td.id} image={td.icon} dark={true} />
    </div>
  )
}

export const Tabs = ({ cs }: { cs: ClientState }) => {
  return (
    <div className={styles.tabs}>
      {cs.getTabs().map((t) => (
        <Tab
          key={t.id}
          td={t}
          active={t.id == cs.getActiveTab().id}
          onClick={() => cs.setActiveTabId(t.id)}
        />
      ))}
    </div>
  )
}
