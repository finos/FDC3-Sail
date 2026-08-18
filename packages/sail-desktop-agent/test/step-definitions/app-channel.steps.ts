import { When } from "@cucumber/cucumber"
import { CustomWorld } from "../world/index.ts"
import { createMeta, getAppInstanceId } from "./generic.steps"
import { handleResolve } from "../support/testing-utils"
import { BrowserTypes } from "@finos/fdc3-schema"
import { AppInstanceState } from "../../src/state/types"
import { getInstance } from "../../src/state/selectors"
import { connectInstance, updateInstanceState } from "../../src/state/mutators"
type GetOrCreateChannelRequest = BrowserTypes.GetOrCreateChannelRequest

/**
 * Helper to ensure app instance exists and is connected before sending messages
 */
function ensureAppInstance(world: CustomWorld, appStr: string): string {
  const instanceId = getAppInstanceId(world, appStr)

  const state = world.getState()
  const instance = getInstance(state, instanceId)
  if (!instance) {
    const meta = createMeta(world, appStr)
    world.updateState(currentState =>
      updateInstanceState(
        connectInstance(currentState, {
          instanceId,
          appId: meta.source.appId,
          metadata: {
            name: meta.source.appId,
          },
        }),
        instanceId,
        AppInstanceState.CONNECTED,
      ),
    )
  }

  return instanceId
}

When(
  "{string} creates or gets an app channel called {string} [fdc3.getOrCreateChannel]",
  async function (this: CustomWorld, app: string, channel: string) {
    ensureAppInstance(this, app)
    const meta = createMeta(this, app)

    const message: GetOrCreateChannelRequest = {
      meta,
      payload: {
        channelId: handleResolve(channel, this) as string,
      },
      type: "getOrCreateChannelRequest",
    }

    await this.mockTransport.receiveMessage(message)
  },
)
