/**
 * Browsing contexts a host launched, by instance id: `SailDesktopAgent.hostWindows`.
 * Hosts `register` on launch and `forget` on teardown; `find` gets a tab back to close it.
 */
export class HostWindowRegistry {
  private readonly windows = new Map<string, Window>()

  register(windowRef: Window, instanceId: string): void {
    this.windows.set(instanceId, windowRef)
  }

  find(instanceId: string): Window | undefined {
    return this.windows.get(instanceId)
  }

  forget(instanceId: string): void {
    this.windows.delete(instanceId)
  }

  instanceIdFor(windowRef: Window): string | undefined {
    for (const [instanceId, registered] of this.windows) {
      if (registered === windowRef) {
        return instanceId
      }
    }
    return undefined
  }
}
