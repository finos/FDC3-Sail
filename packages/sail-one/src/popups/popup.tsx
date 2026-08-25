import { useEffect, type ReactNode } from "react"
import { X } from "lucide-react"
import styles from "./styles.module.css"
import { Logo } from "../top/top"

type PopupProps = {
  buttons?: ReactNode[]
  headerActions?: ReactNode
  area: ReactNode
  closeAction: () => void
  title: string
  closeName?: string
  variant?: "modal" | "drawer"
}

export function Popup({
  buttons = [],
  headerActions,
  area,
  closeAction,
  title,
  closeName = "Close",
  variant = "modal",
}: PopupProps) {
  const isDrawer = variant === "drawer"
  const showFooter = buttons.length > 0 || !isDrawer

  useEffect(() => {
    setTimeout(() => {
      document.getElementById("backdrop")?.setAttribute("data-loaded", "true")
    }, 10)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeAction()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [closeAction])

  return (
    <div
      id="backdrop"
      className={styles.popup}
      data-variant={variant}
      onClick={event => {
        if (event.target === event.currentTarget) {
          closeAction()
        }
      }}
      role="presentation"
    >
      <div
        id="popup"
        className={styles.popupInner}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className={styles.popupTitle}>
          <p className={styles.popupTitleText}>{title}</p>
          <div className={styles.popupTitleActions}>
            {headerActions}
            {isDrawer ? (
              <button
                type="button"
                className={styles.popupHeaderClose}
                onClick={() => closeAction()}
                title="Close"
                aria-label="Close"
              >
                <X aria-hidden strokeWidth={2.25} size={16} />
              </button>
            ) : (
              <Logo />
            )}
          </div>
        </div>
        <div className={styles.popupArea}>{area}</div>
        {showFooter ? (
          <div className={styles.popupButtons}>
            {buttons}
            {!isDrawer ? (
              <PopupButton
                key="cancel"
                onClick={() => closeAction()}
                text={closeName}
                disabled={false}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export const PopupButton = ({
  text,
  onClick,
  disabled,
  primary = false,
}: {
  text: string
  onClick: () => void
  disabled: boolean
  primary?: boolean
}) => {
  return (
    <button
      type="button"
      className={`${styles.popupButton} ${primary ? styles.popupButtonPrimary : ""}`}
      onClick={() => onClick()}
      disabled={disabled}
    >
      {text}
    </button>
  )
}

export const PopupHeaderButton = ({
  text,
  onClick,
  disabled,
  primary = false,
  icon,
}: {
  text: string
  onClick: () => void
  disabled: boolean
  primary?: boolean
  icon?: ReactNode
}) => {
  return (
    <button
      type="button"
      className={`${styles.popupHeaderButton} ${primary ? styles.popupHeaderButtonPrimary : ""}`}
      onClick={() => onClick()}
      disabled={disabled}
    >
      {icon}
      {text}
    </button>
  )
}
