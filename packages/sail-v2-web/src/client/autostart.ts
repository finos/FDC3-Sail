import { getAppState, getClientState, getServerState } from "../common"
import type { DirectoryApp } from "@finos/sail-headless-agent"

/**
 * Refresh known apps from the server, then ensure autostart cardinality (≥1).
 * Call only after DA_HELLO; app iframes mount after markDesktopAgentReady().
 */
export async function refreshKnownAppsAndAutostart(): Promise<DirectoryApp[]> {
  const apps = await getServerState().getApplications()
  await getClientState().setKnownApps(apps)
  await getAppState().ensureAutostartApps(apps)
  return apps
}
