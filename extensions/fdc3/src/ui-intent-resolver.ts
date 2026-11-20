/**
 * `sail.ui.hidden` — host intent-picker overlay for multi-handler raiseIntent.
 */

import { SAIL_UI_HIDDEN } from "@finos/sail-platform"
import type { SailExtensionUI, SailExtensionUIProps } from "@finos/sail-extension/ui"
import type {
  IntentHandler,
  IntentResolutionRequest,
  IntentResolverUIMethods,
} from "./intent-resolver"
import { SAIL_FDC3_INTENT_RESOLVER } from "./ids"

function handlerLabel(handler: IntentHandler): string {
  return handler.app.name ?? handler.app.appId
}

function renderResolver(
  host: HTMLElement,
  resolver: IntentResolverUIMethods,
  request: IntentResolutionRequest,
): void {
  host.replaceChildren()

  const backdrop = document.createElement("div")
  backdrop.style.cssText =
    "position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;justify-content:center;"

  const sheet = document.createElement("div")
  sheet.style.cssText =
    "width:min(560px,100%);max-height:60vh;overflow:auto;background:#111;color:#f5f5f5;border-radius:12px 12px 0 0;padding:16px 20px 24px;font:14px/1.4 system-ui,sans-serif;"

  const title = document.createElement("h2")
  title.textContent = "Select Application"
  title.style.cssText = "margin:0 0 8px;font-size:16px;"

  const desc = document.createElement("p")
  const contextType =
    request.context && typeof request.context === "object" && "type" in request.context
      ? String((request.context as { type: string }).type)
      : "unknown"
  desc.textContent = `Multiple applications can handle “${request.intent}” for ${contextType}.`
  desc.style.cssText = "margin:0 0 12px;opacity:.8;"

  const list = document.createElement("div")
  list.style.cssText = "display:grid;gap:8px;"

  for (const handler of request.handlers) {
    const btn = document.createElement("button")
    btn.type = "button"
    btn.textContent = `${handlerLabel(handler)}${handler.isRunning ? " (running)" : ""}`
    btn.style.cssText =
      "text-align:left;padding:10px 12px;border-radius:8px;border:1px solid #333;background:#1a1a1a;color:inherit;cursor:pointer;"
    btn.addEventListener("click", () => {
      resolver.select(request.requestId, handler)
      host.replaceChildren()
    })
    list.append(btn)
  }

  const cancel = document.createElement("button")
  cancel.type = "button"
  cancel.textContent = "Cancel"
  cancel.style.cssText =
    "margin-top:12px;width:100%;padding:10px;border:0;border-radius:8px;background:transparent;color:#aaa;cursor:pointer;"
  cancel.addEventListener("click", () => {
    resolver.cancel(request.requestId)
    host.replaceChildren()
  })

  sheet.append(title, desc, list, cancel)
  backdrop.append(sheet)
  host.append(backdrop)
}

/**
 * Mounts a lightweight intent-resolution overlay and binds it to the FDC3 session handle.
 */
export const fdc3IntentResolverUi: SailExtensionUI = {
  id: "sail.fdc3.intentResolver",
  title: "FDC3 intent resolver",
  type: SAIL_UI_HIDDEN,
  mount(el, props: SailExtensionUIProps) {
    const intentResolver = props.getExport<IntentResolverUIMethods>(SAIL_FDC3_INTENT_RESOLVER)
    if (!intentResolver) {
      return () => {
        /* no-op */
      }
    }

    const unsub = intentResolver.onRequest(request => {
      renderResolver(el, intentResolver, request)
    })

    return () => {
      unsub()
      el.replaceChildren()
    }
  },
}

export default fdc3IntentResolverUi
