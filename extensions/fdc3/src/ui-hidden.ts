import {
  SAIL_PLATFORM_BUS,
  SAIL_PLATFORM_SESSION,
  SAIL_UI_HIDDEN,
  type SailPlatformBus,
  type SessionService,
} from "@finos/sail-platform"
import type { SailExtensionUI, SailExtensionUIProps } from "@finos/sail-extension/ui"
import { startWcpBusEdge } from "./wcp-edge"

let edgeStop: (() => void) | null = null

/**
 * Start the browser WCP edge once (idempotent). Relays MessagePort traffic on
 * `sail.platform.bus`.
 */
export function startFdc3WcpEdge(bus: SailPlatformBus, sessions: SessionService): () => void {
  if (edgeStop) {
    return edgeStop
  }
  if (typeof window === "undefined") {
    return () => {
      /* no-op */
    }
  }
  const stop = startWcpBusEdge(bus, { sessions })
  edgeStop = () => {
    stop()
    edgeStop = null
  }
  return edgeStop
}

/**
 * `sail.ui.hidden`: WCP / MessagePort ↔ `sail.platform.bus`.
 */
export const fdc3WcpHiddenUi: SailExtensionUI = {
  id: "sail.fdc3.wcp",
  title: "FDC3 WCP edge",
  type: SAIL_UI_HIDDEN,
  mount(_el, props: SailExtensionUIProps) {
    const bus = props.getExport<SailPlatformBus>(SAIL_PLATFORM_BUS)
    const sessions = props.getExport<SessionService>(SAIL_PLATFORM_SESSION)
    if (!bus || !sessions) {
      return () => {
        /* no-op */
      }
    }
    const stop = startFdc3WcpEdge(bus, sessions)
    return () => {
      stop()
    }
  },
}

export default fdc3WcpHiddenUi
