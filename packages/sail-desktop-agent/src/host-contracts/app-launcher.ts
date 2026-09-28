/**
 * AppLauncher Interface
 *
 * Abstraction for launching FDC3 applications. Implementations handle
 * environment-specific launching (browser tabs/iframes, native windows,
 * native processes, etc.)
 */

import type { AppMetadata, AppIdentifier, BrowserTypes } from "@finos/fdc3"

/**
 * AppLauncher interface for launching FDC3 applications.
 * Implementations handle environment-specific app launching logic.
 */
export interface AppLauncher {
  /**
   * Launch an application and return information about the launched instance.
   *
   * The launcher is responsible for:
   * 1. Determining how to launch based on app metadata (type, url, etc.)
   * 2. Performing the actual launch (open tab, create window, spawn process, etc.)
   * 3. Generating a unique instance ID (or reusing request.app.instanceId)
   * 4. Returning launch result for the Desktop Agent to complete registration
   *
   * Host environments should set iframe `name` to the returned instanceId so WCP4
   * identity validation can adopt it as the validated WCP5 id.
   *
   * The Desktop Agent will handle:
   * - Pre-registering the launcher instanceId as PENDING until WCP4 completes
   * - Joining any requested channel (if applicable)
   * - Delivering launch context (if specified)
   * - Sending the FDC3 response
   *
   * @param request - Launch request with app identifier and context
   * @param appMetadata - App metadata from directory (for launch details)
   * @returns Promise resolving to launched app identifier
   * @throws Error if launch fails (Desktop Agent will convert to FDC3 error response)
   */
  launch(request: BrowserTypes.OpenRequestPayload, appMetadata: AppMetadata): Promise<AppIdentifier>

  /**
   * Close an app instance's browsing context (tab, window, iframe, etc.).
   *
   * Invoked by the Desktop Agent when an app calls `fdc3.close()` (FDC3 v3.0). Implementations
   * should tear down the host container; agent state cleanup runs after this resolves.
   *
   * @param instanceId - Validated WCP5 instance id for the app to close
   * @throws Error if the host cannot close the container (mapped to CloseError.ErrorOnClose)
   */
  close?(instanceId: string): Promise<void>
}
