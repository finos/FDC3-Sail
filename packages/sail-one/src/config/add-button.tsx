import { Plus } from "lucide-react"
import styles from "./styles.module.css"

export function AddButton({
  label,
  onClick,
  compact = false,
}: {
  label: string
  onClick: () => void
  compact?: boolean
}) {
  return (
    <button
      type="button"
      className={`${styles.addButton} ${compact ? styles.addButtonCompact : ""}`}
      onClick={onClick}
    >
      <Plus aria-hidden strokeWidth={2.25} />
      {label}
    </button>
  )
}
