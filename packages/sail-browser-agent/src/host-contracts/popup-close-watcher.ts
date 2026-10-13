/**
 * Poll `window.closed` for host-owned popups (forceNewWindow / Tab launches).
 *
 * 2.2 conformance mocks call `window.close()` after a `closeWindow` control
 * broadcast. Chrome does not tear down the WCP MessagePort reliably on that
 * path, so without this watcher the Desktop Agent still lists the instance as
 * Connected and the next `raiseIntent` reuses the zombie instead of opening a
 * fresh window.
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
  /** Close by registry key or by browsing-context `window.name` (launcher instance id). */
  closePopupForInstance: (instanceId: string) => boolean
  /** Registry keys whose popup `window.name` matches (for launcher ↔ validated id drift). */
  findRegisteredIdsForWindowName: (windowName: string) => string[]
  /** Reverse lookup for host-owned popups when mock apps clear `window.name`. */
  findInstanceIdForPopup: (popup: Window) => string | undefined
  /** Re-key a registered popup when WCP5 validated id differs from launcher id. */
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
  // oxlint-disable-next-line typescript/no-unnecessary-condition -- close() mutates closed
  return windowRef.closed
}

/**
 * Poll `window.closed` for host popups and invoke cleanup when a popup closes.
 * Does not override `window.close` on child windows.
 */
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
    for (const [instanceId, popup] of popups) {
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

  const readPopupWindowName = (popup: Window): string | undefined => {
    try {
      return popup.name || undefined
    } catch {
      return undefined
    }
  }

  const findRegisteredIdsForWindowName = (windowName: string): string[] => {
    const matches: string[] = []
    for (const [registeredId, popup] of popups) {
      if (registeredId === windowName || readPopupWindowName(popup) === windowName) {
        matches.push(registeredId)
      }
    }
    return matches
  }

  const findInstanceIdForPopup = (popup: Window): string | undefined => {
    for (const [registeredId, registeredPopup] of popups) {
      if (registeredPopup === popup) {
        return registeredId
      }
    }
    return undefined
  }

  const closeRegisteredPopup = (registeredId: string, popup: Window): boolean => {
    if (popup.closed) {
      popups.delete(registeredId)
      return true
    }
    if (closeWindow(popup, registeredId)) {
      popups.delete(registeredId)
      return true
    }
    return false
  }

  return {
    registerPopup(instanceId: string, popup: Window) {
      popups.set(instanceId, popup)
      startPollingIfNeeded()
    },

    unregisterPopup(instanceId: string) {
      popups.delete(instanceId)
      if (popups.size === 0) {
        stopPolling()
      }
    },

    hasPopup(instanceId: string) {
      return popups.has(instanceId) || findRegisteredIdsForWindowName(instanceId).length > 0
    },

    closePopup(instanceId: string) {
      const popup = popups.get(instanceId)
      if (!popup) {
        return false
      }
      return closeRegisteredPopup(instanceId, popup)
    },

    closePopupForInstance(instanceId: string) {
      const direct = popups.get(instanceId)
      if (direct && closeRegisteredPopup(instanceId, direct)) {
        return true
      }

      for (const registeredId of findRegisteredIdsForWindowName(instanceId)) {
        const popup = popups.get(registeredId)
        if (popup && closeRegisteredPopup(registeredId, popup)) {
          return true
        }
      }

      return false
    },

    findRegisteredIdsForWindowName,

    findInstanceIdForPopup,

    remapPopupByWindow(source: Window, validatedInstanceId: string) {
      for (const [launcherInstanceId, popup] of popups) {
        if (popup === source) {
          if (launcherInstanceId !== validatedInstanceId) {
            popups.delete(launcherInstanceId)
            popups.set(validatedInstanceId, popup)
          }
          return true
        }
      }
      return false
    },

    stop() {
      stopPolling()
      popups.clear()
    },
  }
}
