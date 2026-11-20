/**
 * `sail.ui.app.bar` — per-app FDC3 connection state indicator.
 * Renders nothing until the Desktop Agent knows this instance (non-FDC3 apps stay blank).
 */

import {
  State,
  type AppRegistration,
  type FDC3ServerInstance,
} from "@finos/sail-headless-agent"
import { getAppBarProperties, SAIL_UI_APP_BAR } from "@finos/sail-platform"
import type { SailExtensionUI, SailExtensionUIProps } from "@finos/sail-extension/ui"
import { SAIL_FDC3_INSTANCE } from "./ids"
import type { SailFDC3ServerInstance } from "./SailFDC3ServerInstance"

import connectedIcon from "./icons/app-state/connected.svg"
import pendingIcon from "./icons/app-state/pending.svg"
import terminatedIcon from "./icons/app-state/terminated.svg"
import notRespondingIcon from "./icons/app-state/not-responding.svg"

function symbolForRegistration(reg: AppRegistration): { src: string; label: string } {
  switch (reg.state) {
    case State.Connected: {
      const version = reg.fdc3Version
      const label = version ? `Connected to FDC3 ${version}` : "Connected to FDC3"
      return { src: connectedIcon, label }
    }
    case State.Pending:
      return { src: pendingIcon, label: "Pending FDC3 handshake" }
    case State.NotResponding:
      return { src: notRespondingIcon, label: "FDC3 not responding" }
    case State.Terminated:
      return { src: terminatedIcon, label: "FDC3 disconnected" }
    default:
      return { src: pendingIcon, label: "FDC3" }
  }
}

export function mount(el: HTMLElement, props: SailExtensionUIProps): () => void {
  const appBar = getAppBarProperties(props.properties)
  if (!appBar) {
    el.replaceChildren()
    return () => {
      /* no-op */
    }
  }

  // Mask + currentColor so the glyph follows host title-bar / tab foreground.
  const icon = document.createElement("span")
  icon.style.width = "1rem"
  icon.style.height = "1rem"
  icon.style.display = "none"
  icon.style.flexShrink = "0"
  icon.style.backgroundColor = "currentColor"
  icon.style.webkitMaskSize = "contain"
  icon.style.webkitMaskRepeat = "no-repeat"
  icon.style.webkitMaskPosition = "center"
  icon.style.maskSize = "contain"
  icon.style.maskRepeat = "no-repeat"
  icon.style.maskPosition = "center"
  icon.setAttribute("role", "status")
  el.replaceChildren(icon)

  const readRegistration = (): AppRegistration | undefined => {
    const instance = props.getExport<FDC3ServerInstance>(SAIL_FDC3_INSTANCE)
    if (!instance) {
      return undefined
    }
    try {
      return instance.getInstanceDetails(appBar.instanceId)
    } catch {
      return undefined
    }
  }

  const paint = () => {
    const reg = readRegistration()
    if (!reg) {
      // Not known to the DA — not an FDC3 app (or handshake not started).
      icon.style.display = "none"
      icon.style.webkitMaskImage = ""
      icon.style.maskImage = ""
      icon.removeAttribute("title")
      icon.removeAttribute("aria-label")
      return
    }
    const { src, label } = symbolForRegistration(reg)
    const mask = `url(${JSON.stringify(src)})`
    icon.style.webkitMaskImage = mask
    icon.style.maskImage = mask
    icon.title = label
    icon.setAttribute("aria-label", label)
    icon.style.display = "inline-block"
  }

  paint()

  const unsubs: (() => void)[] = []
  const sailInstance = props.getExport<SailFDC3ServerInstance>(SAIL_FDC3_INSTANCE)
  if (sailInstance && typeof sailInstance.onAppStateChange === "function") {
    try {
      unsubs.push(
        sailInstance.onAppStateChange((instanceId, _state) => {
          if (instanceId === appBar.instanceId) {
            paint()
          }
        }),
      )
    } catch {
      // Instance not ready yet — poll below will catch up.
    }
  }

  // Shell-opened apps may only appear in the DA after WCP hello; poll until then.
  const poll = window.setInterval(paint, 750)

  return () => {
    window.clearInterval(poll)
    for (const u of unsubs) u()
    el.replaceChildren()
  }
}

export const fdc3ConnectionAppBarUi: SailExtensionUI = {
  id: "sail.fdc3.connectionIndicator",
  title: "FDC3 connection",
  type: SAIL_UI_APP_BAR,
  mount,
}

export default fdc3ConnectionAppBarUi
