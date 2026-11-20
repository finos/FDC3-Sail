import type { SailExtensionContext } from "@finos/sail-extension"
import type { FDC3ServerInstance } from "@finos/sail-headless-agent"
import {
  SAIL_PLATFORM_BUS,
  SAIL_PLATFORM_CATALOG,
  SAIL_PLATFORM_SESSION,
  type SailPlatformBus,
  type SailPlatformCatalog,
  type SailUserSession,
  type SessionService,
} from "@finos/sail-platform"
import { isAutoResolve } from "@finos/sail-env"
import type { RegisterMiddleware, SailMiddleware } from "./api"
import { createSailFdc3AppContribution, createSessionDirectory } from "./app-contribution"
import { createRegisterMiddleware } from "./apply-middleware"
import { createSailFdc3Channels } from "./channels"
import {
  SAIL_FDC3_APP_CONTRIBUTION,
  SAIL_FDC3_CHANNELS,
  SAIL_FDC3_INSTANCE,
  SAIL_FDC3_INTENT_RESOLVER,
  SAIL_FDC3_REGISTER_MIDDLEWARE,
} from "./ids"
import {
  createHostIntentResolver,
  createProgrammaticIntentResolver,
  type IntentResolver,
} from "./intent-resolver"
import { SailFDC3ServerInstance } from "./SailFDC3ServerInstance"

type QueuedMiddleware = SailMiddleware & { priority: number; id: number }

function createInstanceExport(getLive: () => FDC3ServerInstance | undefined): FDC3ServerInstance {
  return new Proxy({} as FDC3ServerInstance, {
    get(_target, prop) {
      if (prop === "then") {
        return undefined
      }
      const live = getLive()
      if (!live) {
        throw new Error(
          "sail.fdc3.instance is not ready — create the platform session after loading extensions",
        )
      }
      const value = Reflect.get(live, prop, live)
      return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(live) : value
    },
  })
}

/**
 * Isomorphic activate: export DA components + channels, and bind a Desktop Agent
 * to the single platform user session. WCP attaches in `sail.ui.hidden` via
 * host-provided {@link SailExtensionUIProps.getExport}.
 */
export async function activate(ctx: SailExtensionContext) {
  const catalog = ctx.getExport<SailPlatformCatalog>(SAIL_PLATFORM_CATALOG)
  const bus = ctx.getExport<SailPlatformBus>(SAIL_PLATFORM_BUS)
  const sessions = ctx.getExport<SessionService>(SAIL_PLATFORM_SESSION)
  if (!catalog || !bus) {
    throw new Error("sail.fdc3 requires sail.platform.catalog and sail.platform.bus")
  }

  const channels = await createSailFdc3Channels(ctx.storage)
  const { appContribution, dispose: disposeContribution } = createSailFdc3AppContribution(catalog)

  const autoResolve =
    typeof import.meta !== "undefined" &&
    isAutoResolve(
      (import.meta as ImportMeta & { env?: { VITE_AUTO_RESOLVE?: string } }).env?.VITE_AUTO_RESOLVE,
    )

  /** Always exported; hosts/UI subscribe even when the DA uses programmatic resolve. */
  const intentResolver = createHostIntentResolver()
  const daResolver: IntentResolver = autoResolve
    ? createProgrammaticIntentResolver()
    : intentResolver

  const queued: QueuedMiddleware[] = []
  let nextMwId = 0
  let liveWrapped: FDC3ServerInstance | undefined
  let core: SailFDC3ServerInstance | undefined
  let liveRegisterMiddleware: RegisterMiddleware | undefined
  let unbindChannels: (() => void) | null = null
  let bound = false

  const instanceExport = createInstanceExport(() => liveWrapped)

  const registerMiddleware: RegisterMiddleware = mw => {
    if (liveRegisterMiddleware) {
      return liveRegisterMiddleware(mw)
    }
    const entry: QueuedMiddleware = {
      ...mw,
      priority: mw.priority ?? 0,
      id: nextMwId++,
    }
    queued.push(entry)
    return {
      dispose: () => {
        const idx = queued.indexOf(entry)
        if (idx >= 0) {
          queued.splice(idx, 1)
        }
      },
    }
  }

  const shutdownAgent = () => {
    unbindChannels?.()
    unbindChannels = null
    void core?.shutdown()
    core = undefined
    liveWrapped = undefined
    liveRegisterMiddleware = undefined
    bound = false
  }

  const createDesktopAgent = (session: SailUserSession) => {
    if (bound) {
      throw new Error("sail.fdc3 already has a Desktop Agent instance for this user")
    }
    bound = true

    const sessionDirectory = createSessionDirectory(appContribution)
    const instance = new SailFDC3ServerInstance({
      bus,
      session,
      directory: sessionDirectory.directory,
      channels: channels.getUserChannels(),
      intentResolver: daResolver,
    })
    core = instance
    const wired = createRegisterMiddleware(instance)
    liveRegisterMiddleware = wired.registerMiddleware
    liveWrapped = wired.agent

    instance.setReceiveTarget(async (message, from) => {
      await sessionDirectory.refresh()
      return wired.agent.receive(message, from)
    })
    const openApp = wired.agent.open.bind(wired.agent)
    wired.agent.open = async appId => {
      await sessionDirectory.refresh()
      return openApp(appId)
    }

    for (const mw of [...queued].sort((a, b) => b.priority - a.priority)) {
      wired.registerMiddleware(mw)
    }
    queued.length = 0

    unbindChannels?.()
    unbindChannels = channels.bindSession(instance)
  }

  const bindSession = (session: SailUserSession) => {
    if (bound) {
      return
    }
    createDesktopAgent(session)
    void appContribution.retrieveAllApps().catch(err => {
      console.warn("[sail.fdc3] catalog warm failed", err)
    })
  }

  if (sessions) {
    ctx.subscriptions.push({
      dispose: sessions.onSession(bindSession),
    })
  }

  ctx.subscriptions.push({
    dispose() {
      shutdownAgent()
      disposeContribution()
    },
  })

  return {
    exports: {
      [SAIL_FDC3_INSTANCE]: instanceExport,
      [SAIL_FDC3_INTENT_RESOLVER]: intentResolver,
      [SAIL_FDC3_REGISTER_MIDDLEWARE]: registerMiddleware,
      [SAIL_FDC3_APP_CONTRIBUTION]: appContribution,
      [SAIL_FDC3_CHANNELS]: channels,
    },
  }
}
