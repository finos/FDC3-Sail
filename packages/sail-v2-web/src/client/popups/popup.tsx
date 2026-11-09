import { Component, ReactNode } from "react"
import styles from "./styles.module.css"
import { Logo } from "../top/top"

type PopupProps = {
  buttons: ReactNode[]
  area: ReactNode
  closeAction: () => void
  title: string
  closeName: string
}

export class Popup extends Component<PopupProps> {
  componentDidMount(): void {
    setTimeout(() => {
      document.getElementById("backdrop")?.setAttribute("data-loaded", "true")
    }, 10)
  }

  render() {
    return (
      <div>
        <div id="backdrop" className={styles.popup}>
          <div id="popup" className={styles.popupInner}>
            <div className={styles.popupTitle}>
              <p className={styles.popupTitleText}>{this.props.title}</p>
              <Logo />
            </div>
            <div className={styles.popupArea}>{this.props.area}</div>
            <div className={styles.popupButtons}>
              {this.props.buttons}
              <PopupButton
                key="cancel"
                onClick={() => this.props.closeAction()}
                text={this.props.closeName}
                disabled={false}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }
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
      id="cancel"
      className={`${styles.popupButton} ${primary ? styles.popupButtonPrimary : ""}`}
      onClick={() => onClick()}
      disabled={disabled}
    >
      {text}
    </button>
  )
}
