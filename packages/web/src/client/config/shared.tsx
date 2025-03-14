import styles from "./styles.module.css"

export const InlineButton = ({
  text,
  url,
  onClick,
}: {
  text: string
  url: string
  onClick: () => void
}) => {
  return (
    <img
      src={url}
      className={styles.actionButton}
      title={text}
      onClick={onClick}
    />
  )
}
