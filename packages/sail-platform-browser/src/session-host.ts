import type {
  AppInstanceId,
  SailOpenAppRequest,
  SailUserSessionHostHooks,
} from "@finos/sail-platform"

/**
 * Browser host callbacks for {@link SailUserSession} open/close.
 * Replaces the old FDC3-shaped `AppLauncher` — launch is session-shaped only.
 */
export type BrowserSessionHostHandlers = {
  /**
   * Mount an iframe, popup, or panel for the pending instance.
   * Prefer setting iframe/`window.name` to `instanceId` for WCP identity.
   */
  mountApp: (request: SailOpenAppRequest, instanceId: AppInstanceId) => Promise<void>
  /** Tear down the browsing context for this instance. */
  unmountApp: (instanceId: AppInstanceId) => Promise<void>
}

/** Build {@link SailUserSessionHostHooks} from browser mount/unmount handlers. */
export function createBrowserSessionHostHooks(
  handlers: BrowserSessionHostHandlers,
): SailUserSessionHostHooks {
  return {
    onOpenApp: (request, instanceId) => handlers.mountApp(request, instanceId),
    onCloseApp: (instanceId) => handlers.unmountApp(instanceId),
  }
}
