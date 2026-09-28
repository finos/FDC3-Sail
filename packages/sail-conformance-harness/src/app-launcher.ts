import type { AppLauncher, DirectoryApp } from "@finos/sail-desktop-agent"
import type { AppIdentifier, AppMetadata, BrowserTypes } from "@finos/fdc3"
import type { HarnessLaunchMode, HarnessPanel } from "./types"

type AppMetadataWithDetails = AppMetadata & Partial<Pick<DirectoryApp, "details" | "hostManifests">>

export type HarnessLaunchCallback = (panel: HarnessPanel) => void

/**
 * Extract the web launch URL from FDC3 directory app metadata.
 */
function extractAppUrl(appMetadata: AppMetadataWithDetails): string | undefined {
  const details = appMetadata.details
  if (details && "url" in details && typeof details.url === "string") {
    return details.url
  }
  return undefined
}

/**
 * Conformance mock apps set `hostManifests.sail.forceNewWindow` so FINOS open tests
 * run in a top-level browsing context (tab/popup), not an iframe.
 */
export function resolveHarnessLaunchMode(appMetadata: AppMetadataWithDetails): HarnessLaunchMode {
  const sailManifest = appMetadata.hostManifests?.sail
  if (sailManifest && typeof sailManifest === "object" && sailManifest.forceNewWindow === true) {
    return "popup"
  }
  return "iframe"
}

/**
 * Minimal AppLauncher for the conformance harness.
 *
 * Each launch generates a fresh {@link crypto.randomUUID} instance id unless
 * the open request targets an existing instance. The returned id must match the
 * iframe `name` or popup `window.name` so the app can claim it in WCP4.
 */
export function createHarnessAppLauncher(
  onLaunch: HarnessLaunchCallback,
  options?: {
    /** Full host teardown when an app calls `fdc3.close()` (popup + panel + agent disconnect). */
    onClose?: (instanceId: string) => void
    closePopup?: (instanceId: string) => boolean
    removePanel?: (instanceId: string) => void
  },
): AppLauncher {
  return {
    launch(
      request: BrowserTypes.OpenRequestPayload,
      appMetadata: AppMetadata,
    ): Promise<AppIdentifier> {
      // Reuse caller-supplied instance id when opening an existing instance.
      const instanceId = request.app.instanceId ?? crypto.randomUUID()
      const metadata = appMetadata as AppMetadataWithDetails
      const url = extractAppUrl(metadata)

      if (!url) {
        throw new Error(`Cannot launch app ${request.app.appId}: no URL found in app metadata`)
      }

      onLaunch({
        instanceId,
        appId: request.app.appId,
        url,
        title: metadata.title ?? metadata.name ?? request.app.appId,
        launchMode: resolveHarnessLaunchMode(metadata),
        // oxlint-disable-next-line typescript/no-unnecessary-condition -- FDC3 wire payload
        openWithContext: request.context !== undefined && request.context !== null,
      })

      return Promise.resolve({
        appId: request.app.appId,
        instanceId,
      })
    },

    close(instanceId: string): Promise<void> {
      if (options?.onClose) {
        options.onClose(instanceId)
        return Promise.resolve()
      }

      options?.closePopup?.(instanceId)
      options?.removePanel?.(instanceId)
      return Promise.resolve()
    },
  }
}
