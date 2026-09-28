import { Trash2 } from "lucide-react"
import styles from "./styles.module.css"

export function DeleteButton({
  onClick,
  title,
  disabled = false,
  compact = false,
}: {
  onClick: () => void
  title: string
  disabled?: boolean
  compact?: boolean
}) {
  return (
    <button
      type="button"
      className={`${styles.deleteButton} ${compact ? styles.deleteButtonCompact : ""}`}
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
    >
      <Trash2 aria-hidden strokeWidth={2} />
    </button>
  )
}
