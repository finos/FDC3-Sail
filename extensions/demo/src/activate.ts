import type { SailExtensionContext } from "@finos/sail-extension"
import {
  SAIL_PLATFORM_BUS,
  SAIL_PLATFORM_SESSION,
  type SailPlatformBus,
  type SailUserSession,
  type SessionService,
} from "@finos/sail-platform"
import {
  DEMO_DEFAULT_SETTINGS,
  DEMO_EXTENSION_ID,
  DEMO_SETTINGS_KEY,
  type DemoSettings,
} from "./settings"

/**
 * Log each session's bus (settings from extension storage). Does not listen on
 * the platform-wide bus — only {@link SailPlatformBus.forSession}.
 */
export async function activate(ctx: SailExtensionContext) {
  const bus = ctx.getExport<SailPlatformBus>(SAIL_PLATFORM_BUS)
  const sessions = ctx.getExport<SessionService>(SAIL_PLATFORM_SESSION)
  if (!bus || !sessions) {
    throw new Error(
      `${DEMO_EXTENSION_ID} requires ${SAIL_PLATFORM_BUS} and ${SAIL_PLATFORM_SESSION}`,
    )
  }

  const sessionUnsubs = new Map<string, () => void>()

  const attach = (session: SailUserSession) => {
    if (sessionUnsubs.has(session.id)) {
      return
    }
    const sessionBus = bus.forSession(session)
    const unsubscribe = sessionBus.subscribe(async (message, instanceId) => {
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
    sessionUnsubs.set(session.id, unsubscribe)
  }

  for (const session of sessions.getSessions()) {
    attach(session)
  }
  const stopWatch = sessions.onSession(attach)

  ctx.subscriptions.push({
    dispose() {
      stopWatch()
      for (const unsubscribe of sessionUnsubs.values()) {
        unsubscribe()
      }
      sessionUnsubs.clear()
    },
  })
  return {}
}
