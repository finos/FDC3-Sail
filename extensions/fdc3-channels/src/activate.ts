import type { SailExtensionContext } from "@finos/sail-extension"
import { SAIL_FDC3_CHANNELS, type SailFdc3Channels } from "@finos/sail-extension-fdc3/api"

/**
 * UI-only extension: catalog persistence lives on sail.fdc3.channels.
 */
export async function activate(ctx: SailExtensionContext) {
  const channels = ctx.getExport<SailFdc3Channels>(SAIL_FDC3_CHANNELS)
  if (!channels) {
    throw new Error(`sail.fdc3.channelSettings requires ${SAIL_FDC3_CHANNELS}`)
  }
  return {}
}
