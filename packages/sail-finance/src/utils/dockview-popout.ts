const DOCKVIEW_POPOUT_QUERY = "popout"

export function dockviewPopoutUrl(): string {
  const url = new URL(window.location.href)
  url.searchParams.set(DOCKVIEW_POPOUT_QUERY, "1")
  return url.toString()
}

export function isDockviewPopoutShell(): boolean {
  return new URLSearchParams(window.location.search).get(DOCKVIEW_POPOUT_QUERY) === "1"
}

function syncThemeFromOpener(): void {
  const openerRoot = window.opener?.document.documentElement
  if (!(openerRoot instanceof HTMLElement)) {
    return
  }
  document.documentElement.className = openerRoot.className
}

/**
 * Minimal dockview popout page: mirror opener theme and forward iframe
 * postMessages (with any transferred ports) to the opener. Protocol-agnostic —
 * agent extensions own handshake semantics on the main window.
 */
export function bootstrapDockviewPopoutShell(): void {
  syncThemeFromOpener()

  const openerRoot = window.opener?.document.documentElement
  if (openerRoot instanceof HTMLElement) {
    const observer = new MutationObserver(syncThemeFromOpener)
    observer.observe(openerRoot, { attributes: true, attributeFilter: ["class"] })
  }

  window.addEventListener("message", event => {
    const opener = window.opener as Window | null
    if (!opener || opener.closed) {
      return
    }

    if (event.source === window || event.source === opener) {
      return
    }

    const ports = event.ports.length > 0 ? [...event.ports] : undefined
    opener.postMessage(event.data, event.origin, ports)
  })
}
