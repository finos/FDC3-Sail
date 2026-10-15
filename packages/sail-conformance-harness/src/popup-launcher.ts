import {
  createPopupCloseWatcher as createBrowserPopupCloseWatcher,
  type PopupCloseWatcher,
  type PopupCloseWatcherOptions,
} from "@finos/sail-browser-agent"

import { tryCloseBrowsingContext } from "./harness-browsing-context-close"
import type { HarnessPanel } from "./types"

export type { PopupCloseWatcher, PopupCloseWatcherOptions }

/**
 * Open a conformance mock app in a named browser tab. The window name must match
 * {@link HarnessPanel.instanceId} so the app can claim it in WCP4.
 *
 * Omits `window.open` features so the browser opens a tab (same as sail-one / v2)
 * rather than a popup; keeps `window.opener` for WCP.
 */
export function openHarnessPopup(
  panel: HarnessPanel,
  options?: { onPopupCreated?: (popup: Window) => void },
): Window | null {
  const popup = window.open(panel.url, panel.instanceId)
  if (!popup) {
    return null
  }

  options?.onPopupCreated?.(popup)

  // FINOS mock apps may clear `window.name` during load; WCP1 reads it for host-instance adoption.
  try {
    if (popup.name !== panel.instanceId) {
      popup.name = panel.instanceId
    }
  } catch (error) {
    console.warn(
      `[ConformanceHarness] Could not reassert window.name for ${panel.appId} (${panel.instanceId})`,
      error,
    )
  }

  return popup
}

/**
 * Poll `window.closed` for harness tabs and invoke cleanup when one closes.
 * Defaults {@link PopupCloseWatcherOptions.closeWindow} to {@link tryCloseBrowsingContext}.
 */
export function createPopupCloseWatcher(options: PopupCloseWatcherOptions): PopupCloseWatcher {
  return createBrowserPopupCloseWatcher({
    ...options,
    closeWindow: options.closeWindow ?? tryCloseBrowsingContext,
  })
}
