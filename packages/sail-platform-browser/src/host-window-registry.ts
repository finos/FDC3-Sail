/**
 * Map browsing-context Window → instance id for cross-origin WCP hostIdentifier.
 * Session host calls {@link registerHostWindow} when an iframe/popup Window is available;
 * the FDC3 `sail.ui.hidden` WCP edge reads the same registry.
 */

export type HostWindowRegistry = {
  registerHostWindow: (windowRef: Window, instanceId: string) => void
  unregisterHostWindow: (instanceId: string) => void
  getInstanceIdForWindow: (windowRef: Window) => string | undefined
  getWindowForInstanceId: (instanceId: string) => Window | undefined
  clear: () => void
}

export function createHostWindowRegistry(): HostWindowRegistry {
  const byInstance = new Map<string, WeakRef<Window>>()
  const byWindow = new WeakMap<Window, string>()

  return {
    registerHostWindow(windowRef, instanceId) {
      byInstance.set(instanceId, new WeakRef(windowRef))
      byWindow.set(windowRef, instanceId)
    },
    unregisterHostWindow(instanceId) {
      const ref = byInstance.get(instanceId)
      byInstance.delete(instanceId)
      const win = ref?.deref()
      if (win) {
        byWindow.delete(win)
      }
    },
    getInstanceIdForWindow(windowRef) {
      return byWindow.get(windowRef)
    },
    getWindowForInstanceId(instanceId) {
      return byInstance.get(instanceId)?.deref()
    },
    clear() {
      byInstance.clear()
    },
  }
}

/** Process-wide default registry shared by session host and FDC3 WCP hidden UI. */
export const defaultHostWindowRegistry: HostWindowRegistry = createHostWindowRegistry()
