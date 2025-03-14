import { ReactNode } from "react"
import styles from "./styles.module.css"

export const Bin = () => {
  return (
    <div className={styles.control} id="trash">
      <img
        src="/static/icons/control/bin.svg"
        title="Remove App"
        className={styles.controlImage}
      />
    </div>
  )
}

export const NewPanel = ({ onClick }: { onClick: () => void }) => {
  return (
    <div className={styles.control}>
      <img
        src="/static/icons/control/add.svg"
        title="Add Tab"
        className={styles.controlImage}
        onClick={onClick}
      />
    </div>
  )
}

export const Resolver = ({ onClick }: { onClick: () => void }) => {
  return (
    <div className={styles.control}>
      <img
        src="/static/icons/control/resolver.svg"
        title="Add Tab"
        className={styles.controlImage}
        onClick={onClick}
      />
    </div>
  )
}

export const Controls = ({ children }: { children: ReactNode }) => {
  return <div className={styles.controls}>{children}</div>
}
