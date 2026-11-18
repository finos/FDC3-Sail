import type { SailExtensionContext } from "@finos/sail-extension"
import {
  SAIL_PLATFORM_BUS,
  SAIL_PLATFORM_CATALOG,
  type SailPlatformBus,
  type SailPlatformCatalog,
} from "@finos/sail-platform"
import {
  SAIL_FDC3_APP_DIRECTORY,
  SAIL_FDC3_REGISTER_MIDDLEWARE,
  SAIL_FDC3_SERVER_FACTORY,
} from "./ids"
import { SailFDC3ServerFactory } from "./SailFDC3ServerFactory"

/**
 * Isomorphic activate: export the factory. WCP attaches in `sail.ui.hidden`
 * via host-provided {@link SailExtensionUIProps.getExport} for the bus.
 */
export async function activate(ctx: SailExtensionContext) {
  const catalog = ctx.getExport<SailPlatformCatalog>(SAIL_PLATFORM_CATALOG)
  const bus = ctx.getExport<SailPlatformBus>(SAIL_PLATFORM_BUS)
  if (!catalog || !bus) {
    throw new Error("sail.fdc3 requires sail.platform.catalog and sail.platform.bus")
  }

  const factory = new SailFDC3ServerFactory({ catalog, bus })

  ctx.subscriptions.push({
    dispose() {
      factory.shutdownAll()
    },
  })

  return {
    exports: {
      [SAIL_FDC3_SERVER_FACTORY]: factory,
      [SAIL_FDC3_REGISTER_MIDDLEWARE]: factory.registerMiddleware,
      [SAIL_FDC3_APP_DIRECTORY]: factory.appDirectory,
    },
  }
}
