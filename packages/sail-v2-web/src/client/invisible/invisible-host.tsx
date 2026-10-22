import { Component } from "react"
import { AppPanel, AppState, ClientState } from "../../common"
import { AppFrame } from "../grid/grid"
import { DA_PENDING_ICON } from "../pending/pending"
import styles from "./styles.module.css"

export const INVISIBLE_HOST_ID = "invisible-apps-host"

type InvisibleAppsHostProps = {
  cs: ClientState
  as: AppState
}

/**
 * Hosts invisible-app iframes in light DOM and projects the open one into a
 * shadow-DOM dialog via named slots (same continuity model as grid panels).
 */
export class InvisibleAppsHost extends Component<InvisibleAppsHostProps> {
  componentDidMount(): void {
    this.syncShadowDialog()
  }

  componentDidUpdate(): void {
    this.syncShadowDialog()
  }

  private invisiblePanels(): AppPanel[] {
    return this.props.cs.getPanels().filter(p => p.invisible)
  }

  private syncShadowDialog(): void {
    const host = document.getElementById(INVISIBLE_HOST_ID)
    if (!host) {
      return
    }

    let shadow = host.shadowRoot
    if (!shadow) {
      shadow = host.attachShadow({ mode: "open" })
      const pageStyles = Array.from(document.querySelectorAll("style"))
      const links = Array.from(document.querySelectorAll("link")).filter(l =>
        l.href.endsWith(".css"),
      )
      ;[...pageStyles, ...links]
        .map(el => el.cloneNode(true))
        .forEach(el => shadow!.appendChild(el))
      // ::slotted rules must live in the shadow tree
      const local = document.createElement("style")
      local.textContent = `
        .${styles.dialogBody} ::slotted(iframe) {
          flex: 1;
          width: 100%;
          height: 100%;
          border: none;
          display: block;
        }
      `
      shadow.appendChild(local)
    }

    const openPanel = this.invisiblePanels().find(p => p.dialogOpen)
    let dialog = shadow.getElementById("invisible-dialog")

    if (!openPanel) {
      dialog?.remove()
      return
    }

    if (!dialog) {
      dialog = document.createElement("div")
      dialog.id = "invisible-dialog"
      dialog.className = styles.dialogBackdrop
      shadow.appendChild(dialog)
    }

    dialog.innerHTML = ""
    dialog.className = styles.dialogBackdrop
    dialog.onclick = e => {
      if (e.target === dialog) {
        void this.closeDialog(openPanel)
      }
    }

    const inner = document.createElement("div")
    inner.className = styles.dialogInner
    inner.onclick = e => e.stopPropagation()

    const titleBar = document.createElement("div")
    titleBar.className = styles.dialogTitle
    const titleText = document.createElement("p")
    titleText.className = styles.dialogTitleText
    titleText.textContent = openPanel.title
    const closeBtn = document.createElement("img")
    closeBtn.src = "/icons/control/close.svg"
    closeBtn.className = styles.dialogClose
    closeBtn.title = "Hide"
    closeBtn.onclick = () => {
      void this.closeDialog(openPanel)
    }
    titleBar.appendChild(titleText)
    titleBar.appendChild(closeBtn)

    const body = document.createElement("div")
    body.className = styles.dialogBody
    if (this.props.as.isDesktopAgentReady()) {
      const slot = document.createElement("slot")
      slot.name = "slot_" + openPanel.panelId
      body.appendChild(slot)
    } else {
      const pending = document.createElement("div")
      pending.className = styles.daPending
      pending.title = "Waiting for Desktop Agent"
      const img = document.createElement("img")
      img.src = DA_PENDING_ICON
      img.alt = ""
      img.className = styles.daPendingIcon
      pending.appendChild(img)
      body.appendChild(pending)
    }

    inner.appendChild(titleBar)
    inner.appendChild(body)
    dialog.appendChild(inner)
  }

  private async closeDialog(panel: AppPanel): Promise<void> {
    await this.props.cs.updatePanel({ ...panel, dialogOpen: false })
  }

  render() {
    const panels = this.props.as.isDesktopAgentReady() ? this.invisiblePanels() : []
    return (
      <div id={INVISIBLE_HOST_ID} className={styles.host}>
        {panels.map(p => (
          <AppFrame
            key={p.panelId}
            panel={p}
            className={p.dialogOpen ? styles.iframeOpen : styles.iframeParked}
          />
        ))}
      </div>
    )
  }
}
