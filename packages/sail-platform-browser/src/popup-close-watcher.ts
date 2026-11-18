/**
 * Poll `window.closed` for host-owned popups.
 * When a popup closes, invoke cleanup (typically `session.closeApp`).
 */

export type PopupCloseWatcherOptions = {
  onPopupClosed: (instanceId: string) => void
  pollIntervalMs?: number
  closeWindow?: (windowRef: Window, instanceId: string) => boolean
}

export type PopupCloseWatcher = {
  registerPopup: (instanceId: string, popup: Window) => void
  unregisterPopup: (instanceId: string) => void
  hasPopup: (instanceId: string) => boolean
  closePopup: (instanceId: string) => boolean
  closePopupForInstance: (instanceId: string) => boolean
  findRegisteredIdsForWindowName: (windowName: string) => string[]
  findInstanceIdForPopup: (popup: Window) => string | undefined
  remapPopupByWindow: (source: Window, validatedInstanceId: string) => boolean
  stop: () => void
}

function defaultCloseWindow(windowRef: Window, _instanceId: string): boolean {
  if (windowRef.closed) {
    return true
  }
  try {
    windowRef.close()
  } catch {
    // Cross-origin or already-tearing-down windows may throw.
  }
  return windowRef.closed
}

export function createPopupCloseWatcher(options: PopupCloseWatcherOptions): PopupCloseWatcher {
  const popups = new Map<string, Window>()
  const pollIntervalMs = options.pollIntervalMs ?? 100
  const closeWindow = options.closeWindow ?? defaultCloseWindow
  let intervalId: ReturnType<typeof setInterval> | undefined

  const stopPolling = () => {
    if (intervalId !== undefined) {
      clearInterval(intervalId)
      intervalId = undefined
    }
  }

  const pollClosedPopups = () => {
    for (const [instanceId, popup] of [...popups.entries()]) {
      if (popup.closed) {
        popups.delete(instanceId)
        options.onPopupClosed(instanceId)
      }
    }
    if (popups.size === 0) {
      stopPolling()
    }
  }

  const startPollingIfNeeded = () => {
    if (intervalId !== undefined || popups.size === 0) {
      return
    }
    intervalId = setInterval(pollClosedPopups, pollIntervalMs)
  }

  return {
    registerPopup(instanceId, popup) {
      popups.set(instanceId, popup)
      startPollingIfNeeded()
    },
    unregisterPopup(instanceId) {
      popups.delete(instanceId)
      if (popups.size === 0) {
        stopPolling()
      }
    },
    hasPopup(instanceId) {
      return popups.has(instanceId)
    },
    closePopup(instanceId) {
      const popup = popups.get(instanceId)
      if (!popup) {
        return false
      }
      const closed = closeWindow(popup, instanceId)
      if (closed) {
        popups.delete(instanceId)
        if (popups.size === 0) {
          stopPolling()
        }
      }
      return closed
    },
    closePopupForInstance(instanceId) {
      if (this.closePopup(instanceId)) {
        return true
      }
      for (const id of this.findRegisteredIdsForWindowName(instanceId)) {
        if (this.closePopup(id)) {
          return true
        }
      }
      return false
    },
    findRegisteredIdsForWindowName(windowName) {
      const ids: string[] = []
      for (const [id, popup] of [...popups.entries()]) {
        try {
          if (popup.name === windowName) {
            ids.push(id)
          }
        } catch {
          // cross-origin
        }
      }
      return ids
    },
    findInstanceIdForPopup(popup) {
      for (const [id, p] of [...popups.entries()]) {
        if (p === popup) {
          return id
        }
      }
      return undefined
    },
    remapPopupByWindow(source, validatedInstanceId) {
      const oldId = this.findInstanceIdForPopup(source)
      if (!oldId || oldId === validatedInstanceId) {
        return oldId === validatedInstanceId
      }
      popups.delete(oldId)
      popups.set(validatedInstanceId, source)
      return true
    },
    stop() {
      popups.clear()
      stopPolling()
    },
  }
}
