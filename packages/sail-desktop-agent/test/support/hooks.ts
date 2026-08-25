import { After } from "@cucumber/cucumber"
import { clearAllPendingIntentTimeoutsForTesting } from "../../src/handlers/intents/intent-pending-timeout-registry"
import { clearAllHeartbeatTimersForTesting } from "../../src/handlers/heartbeat/runtime"
import { clearAllPendingOpenWithContextTimeoutsForTesting } from "../../src/handlers/utils/open-with-context"
import type { CustomWorld } from "../world/index"

/**
 * Reset module-level timers after every scenario so the Cucumber process can exit
 * cleanly (heartbeat, open-with-context, and pending-intent scenarios schedule
 * real timeouts).
 *
 * Assertions that cleanup worked belong in feature steps (e.g. "no heartbeat timers
 * are active"), not on scenario tags.
 */
After(function (this: CustomWorld) {
  clearAllHeartbeatTimersForTesting()
  clearAllPendingOpenWithContextTimeoutsForTesting()
  clearAllPendingIntentTimeoutsForTesting()
  this.desktopAgent?.stop()
})
