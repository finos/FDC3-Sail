import { DesktopAgentAppWindowClosedArgs } from "@finos/fdc3-sail-common"
import { State } from "@finos/sail-headless-agent"
import { SailFDC3ServerFactory } from "../SailFDC3ServerFactory"
import { createLogger } from "../../logger"

const log = createLogger("AppWindowClosed")

/* eslint-disable  @typescript-eslint/no-explicit-any */

/**
 * Handle DA_APP_WINDOW_CLOSED — Tab popup closed externally (e.g. 2.2 mock
 * window.close()). Terminate the instance so findIntent does not keep zombies.
 */
export async function handleAppWindowClosed(
  factory: SailFDC3ServerFactory,
  props: DesktopAgentAppWindowClosedArgs,
  callback: (success: any, err?: string) => void,
): Promise<void> {
  log.debug({ props }, "APP_WINDOW_CLOSED received")

  const { instanceId, userSessionId } = props
  const session = factory.getSession(userSessionId)
  if (!session) {
    log.error({ userSessionId }, "Session not found")
    callback(null, "Session not found")
    return
  }

  try {
    // Do not call session.close() — that emits SAIL_APP_CLOSE to close a window
    // that is already gone. Mirror APP disconnect: terminate + cleanup listeners.
    await session.setAppState(instanceId, State.Terminated)
    await session.cleanupApp(instanceId)
    log.info({ instanceId }, "Terminated instance after popup close")
    callback(true)
  } catch (e: unknown) {
    log.error({ instanceId, error: e }, "Failed to terminate after popup close")
    callback(null, e instanceof Error ? e.message : String(e))
  }
}
