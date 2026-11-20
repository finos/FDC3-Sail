import type { SailExtensionContext } from "@finos/sail-extension"
import {
  SAIL_PLATFORM_BUS,
  SAIL_PLATFORM_SESSION,
  type SailPlatformBus,
  type SessionService,
} from "@finos/sail-platform"
import {
  DEMO_DEFAULT_SETTINGS,
  DEMO_EXTENSION_ID,
  DEMO_SETTINGS_KEY,
  type DemoSettings,
} from "./settings"

/**
 * Log bus traffic (settings from extension storage).
 */
export async function activate(ctx: SailExtensionContext) {
  const bus = ctx.getExport<SailPlatformBus>(SAIL_PLATFORM_BUS)
  const sessions = ctx.getExport<SessionService>(SAIL_PLATFORM_SESSION)
  if (!bus || !sessions) {
    throw new Error(
      `${DEMO_EXTENSION_ID} requires ${SAIL_PLATFORM_BUS} and ${SAIL_PLATFORM_SESSION}`,
    )
  }

  let attached = false
  let unsubscribe: (() => void) | undefined

  const attach = () => {
    if (attached) {
      return
    }
    if (!sessions.getSession()) {
      return
    }
    attached = true
    unsubscribe = bus.subscribe(async (message, instanceId) => {
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
      console.info(`[${settings.label}] ${type} peer=${instanceId}`)
    })
  }

  const stopWatch = sessions.onSession(attach)

  ctx.subscriptions.push({
    dispose() {
      stopWatch()
      unsubscribe?.()
      attached = false
    },
  })
  return {}
}
