import type { SailExtensionContext } from "@finos/sail-extension"
import {
  SAIL_FDC3_APP_CONTRIBUTION,
  type SailFdc3AppContribution,
} from "@finos/sail-extension-fdc3/api"
import {
  CUSTOM_APPS_DEFAULT_SETTINGS,
  CUSTOM_APPS_SETTINGS_KEY,
  type CustomAppsSettings,
} from "./settings"

const SOURCE_ID = "customApps"

export async function activate(ctx: SailExtensionContext) {
  const registry = ctx.getExport<SailFdc3AppContribution>(SAIL_FDC3_APP_CONTRIBUTION)
  if (!registry) {
    throw new Error(`sail.fdc3.customApps requires ${SAIL_FDC3_APP_CONTRIBUTION}`)
  }

  registry.registerSource(SOURCE_ID, {
    async returnApps() {
      const settings =
        (await ctx.storage.get<CustomAppsSettings>(CUSTOM_APPS_SETTINGS_KEY)) ??
        CUSTOM_APPS_DEFAULT_SETTINGS
      return settings.apps
    },
  })

  ctx.subscriptions.push({
    dispose: () => registry.unregisterSource(SOURCE_ID),
  })

  return {}
}
