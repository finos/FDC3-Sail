/**
 * Host-owned browsing-context registry: map {@link Window} proxies → instance ids.
 *
 * Cross-origin iframes throw `SecurityError` when the parent reads `window.name`,
 * so WCP hostIdentifier adoption needs this registry (see
 * {@link AppConnectionOptions.resolveHostIdentifier}).
 */

export type HostWindowRegistry = {
  register(windowRef: Window, instanceId: string): void
  getInstanceId(windowRef: Window): string | undefined
  findWindow(instanceId: string): Window | undefined
  forget(instanceId: string): void
}

/**
 * Create an in-memory Window ↔ instanceId registry for browser Desktop Agent hosts.
 */
export function createHostWindowRegistry(): HostWindowRegistry {
  const windowToInstanceId = new Map<Window, string>()

  return {
    register(windowRef, instanceId) {
      // Drop any prior mapping for this instance so reverse lookup stays unique.
      for (const [win, id] of windowToInstanceId) {
        if (id === instanceId && win !== windowRef) {
          windowToInstanceId.delete(win)
        }
      }
      windowToInstanceId.set(windowRef, instanceId)
    },

    getInstanceId(windowRef) {
      return windowToInstanceId.get(windowRef)
    },

    findWindow(instanceId) {
      for (const [win, id] of windowToInstanceId) {
        if (id === instanceId) {
          return win
        }
      }
      return undefined
    },

    forget(instanceId) {
      for (const [win, id] of windowToInstanceId) {
        if (id === instanceId) {
          windowToInstanceId.delete(win)
        }
      }
    },
  }
}
