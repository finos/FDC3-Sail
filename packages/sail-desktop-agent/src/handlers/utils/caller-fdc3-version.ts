import { getInstanceFdc3Version } from "../../state/selectors"
import type { DACPHandlerParams } from "../types"

/**
 * The FDC3 version the calling app was served at. Gate version-specific request handling on
 * this, not on the agent's `implementationMetadata.fdc3Version`: a 2.2 app and a 3.0 app can
 * share one agent.
 */
export function callerFdc3Version(params: DACPHandlerParams): string {
  return getInstanceFdc3Version(
    params.getState(),
    params.instanceId,
    params.implementationMetadata.fdc3Version,
  )
}
