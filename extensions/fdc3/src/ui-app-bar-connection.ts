/**
 * `sail.ui.app.bar` — per-app FDC3 connection indicator.
 */

import { State, type FDC3ServerInstance } from "@finos/sail-headless-agent"
import { getAppBarProperties, SAIL_UI_APP_BAR } from "@finos/sail-platform"
import type { SailExtensionUI, SailExtensionUIProps } from "@finos/sail-extension/ui"
import { SAIL_FDC3_INSTANCE } from "./ids"
import type { SailFDC3ServerInstance } from "./SailFDC3ServerInstance"

function colorForState(state: State | undefined): string {
  switch (state) {
    case State.Connected:
      return "#22c55e"
    case State.Pending:
      return "#eab308"
    case State.Terminated:
      return "#ef4444"
    default:
      return "#a3a3a3"
  }
}

function labelForState(state: State | undefined): string {
  switch (state) {
    case State.Connected:
      return "FDC3 connected"
    case State.Pending:
      return "FDC3 connecting…"
    case State.Terminated:
      return "FDC3 disconnected"
    default:
      return "FDC3 unknown"
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

  const instance = props.getExport<FDC3ServerInstance>(SAIL_FDC3_INSTANCE)
  const dot = document.createElement("span")
  dot.style.display = "inline-block"
  dot.style.width = "0.75rem"
  dot.style.height = "0.75rem"
  dot.style.borderRadius = "9999px"
  dot.style.border = "1px solid currentColor"
  dot.setAttribute("role", "status")
  el.replaceChildren(dot)

  const readState = (): State | undefined => {
    if (!instance) {
      return undefined
    }
    try {
      return instance.getInstanceDetails(appBar.instanceId)?.state
    } catch {
      return undefined
    }
  }

  const paint = (state: State | undefined) => {
    const label = labelForState(state)
    dot.style.backgroundColor = colorForState(state)
    dot.title = label
    dot.setAttribute("aria-label", label)
  }

  paint(readState())

  const unsubs: (() => void)[] = []
  const sailInstance = instance as SailFDC3ServerInstance | undefined
  if (sailInstance && typeof sailInstance.onAppStateChange === "function") {
    try {
      unsubs.push(
        sailInstance.onAppStateChange((instanceId, state) => {
          if (instanceId === appBar.instanceId) {
            paint(state)
          }
        }),
      )
    } catch {
      // Instance not ready yet — indicator stays at current paint.
    }
  }

  return () => {
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
