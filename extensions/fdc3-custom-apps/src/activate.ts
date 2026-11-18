import type { SailExtensionContext } from "@finos/sail-extension"
import type { SailFdc3AppDirectory } from "@finos/sail-extension-fdc3/api"
import {
  CUSTOM_APPS_DEFAULT_SETTINGS,
  CUSTOM_APPS_SETTINGS_KEY,
  type CustomAppsSettings,
} from "./settings"

const SOURCE_ID = "customApps"

async function sync(ctx: SailExtensionContext, appDirectory: SailFdc3AppDirectory) {
  const settings =
    (await ctx.storage.get<CustomAppsSettings>(CUSTOM_APPS_SETTINGS_KEY)) ??
    CUSTOM_APPS_DEFAULT_SETTINGS
  appDirectory.replaceSource(SOURCE_ID, settings.apps)
}

export async function activate(ctx: SailExtensionContext) {
  const appDirectory = ctx.getExport<SailFdc3AppDirectory>("sail.fdc3.appDirectory")
  if (!appDirectory) {
    throw new Error("sail.fdc3.customApps requires sail.fdc3.appDirectory")
  }

  await sync(ctx, appDirectory)
  ;(globalThis as { __sailFdc3CustomAppsSync?: () => Promise<void> }).__sailFdc3CustomAppsSync =
    () => sync(ctx, appDirectory)

  return {}
}
