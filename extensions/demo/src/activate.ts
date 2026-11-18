import type { SailExtensionContext } from "@finos/sail-extension"
import {
  SAIL_PLATFORM_BUS,
  type SailPlatformBus,
} from "@finos/sail-platform"
import {
  DEMO_DEFAULT_SETTINGS,
  DEMO_EXTENSION_ID,
  DEMO_SETTINGS_KEY,
  type DemoSettings,
} from "./settings"

export async function activate(ctx: SailExtensionContext) {
  const bus = ctx.getExport<SailPlatformBus>(SAIL_PLATFORM_BUS)
  if (!bus) {
    throw new Error(`${DEMO_EXTENSION_ID} requires ${SAIL_PLATFORM_BUS}`)
  }

  const unsubscribe = bus.subscribe(async (message, instanceId) => {
    const settings =
      (await ctx.storage.get<DemoSettings>(DEMO_SETTINGS_KEY)) ?? DEMO_DEFAULT_SETTINGS
    if (!settings.enabled) {
      return
    }
    const type =
      message !== null && typeof message === "object" && "type" in message
        ? String((message as { type: unknown }).type)
        : typeof message
    if (type.startsWith("heartbeat")) {
      return
    }
    console.info(`[${settings.label}] ${type} from ${instanceId}`)
  })

  ctx.subscriptions.push({ dispose: unsubscribe })
  return {}
}
