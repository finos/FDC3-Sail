import { When } from "@cucumber/cucumber"
import { CustomWorld } from "../world/index.ts"
import { getAppInstanceId } from "./generic.steps"

function resolveValidatedInstanceId(world: CustomWorld, appStr: string): string {
  const connectionId = getAppInstanceId(world, appStr)
  return world.mockTransport.resolveWcp5InstanceId(connectionId)
}

When("{string} disconnects from the DA", function (this: CustomWorld, appStr: string) {
  const connectionId = getAppInstanceId(this, appStr)
  const validatedId = resolveValidatedInstanceId(this, appStr)
  // Production teardown runs on the WCP5 instance; launch-time keys may still use the connection id.
  this.desktopAgent.disconnectInstance(validatedId)
  if (validatedId !== connectionId) {
    this.desktopAgent.disconnectInstance(connectionId)
  }
})
