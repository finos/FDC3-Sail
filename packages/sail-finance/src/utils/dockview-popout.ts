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

function isWcpHello(data: unknown): boolean {
  if (!data || typeof data !== "object") {
    return false
  }
  const type = (data as { type?: unknown }).type
  return type === "WCP1Hello"
}

/**
 * Minimal dockview popout page: mirror opener theme and forward WCP1Hello from popout
 * iframes to the main window where BrowserAppConnection listens.
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

    if (!isWcpHello(event.data)) {
      return
    }

    const ports = event.ports.length > 0 ? [...event.ports] : undefined
    opener.postMessage(event.data, event.origin, ports)
  })
}
