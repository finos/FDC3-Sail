import { After } from "@cucumber/cucumber"
import { CustomWorld } from "../world"

/**
 * Handlers such as HeartbeatHandler start interval timers in their
 * constructors. Without this, any scenario that does not explicitly stop them
 * leaves a live timer behind and the cucumber process never exits.
 */
After(async function (this: CustomWorld) {
  await this.sc?.shutdown()
})
