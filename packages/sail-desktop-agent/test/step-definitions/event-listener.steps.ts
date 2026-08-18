import { When } from "@cucumber/cucumber"
import { CustomWorld } from "../world/index.ts"
import { handleResolve } from "../support/testing-utils"
import { createMeta, getAppInstanceId } from "./generic.steps"
import { BrowserTypes } from "@finos/fdc3-schema"
import { AppInstanceState } from "../../src/state/types"
import { getInstance } from "../../src/state/selectors"
import { connectInstance, updateInstanceState } from "../../src/state/mutators"

type AddEventListenerRequest = BrowserTypes.AddEventListenerRequest
type EventListenerUnsubscribeRequest = BrowserTypes.EventListenerUnsubscribeRequest

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

/**
 * Add a Desktop Agent event listener (for DA-level events like channelChanged)
 */
When(
  "{string} adds an event listener for {string} [fdc3.addEventListener]",
  async function (this: CustomWorld, app: string, eventType: string) {
    ensureAppInstance(this, app)
    const meta = createMeta(this, app)

    const message: AddEventListenerRequest = {
      meta,
      payload: {
        type: eventType as AddEventListenerRequest["payload"]["type"],
      },
      type: "addEventListenerRequest",
    }

    await this.mockTransport.receiveMessage(message)

    const lastMessage = this.mockTransport.getLastMessage()
    const listenerUUID = (lastMessage?.msg?.payload as { listenerUUID?: string } | undefined)
      ?.listenerUUID
    if (listenerUUID) {
      this.props.lastEventListenerId = listenerUUID
    }
  },
)

/**
 * Add a Desktop Agent event listener for ALL event types (null type per FDC3 spec)
 */
When(
  "{string} adds an event listener for all event types [fdc3.addEventListener]",
  async function (this: CustomWorld, app: string) {
    ensureAppInstance(this, app)
    const meta = createMeta(this, app)

    const message: AddEventListenerRequest = {
      meta,
      payload: {
        type: null,
      },
      type: "addEventListenerRequest",
    }

    await this.mockTransport.receiveMessage(message)

    const lastMessage = this.mockTransport.getLastMessage()
    const listenerUUID = (lastMessage?.msg?.payload as { listenerUUID?: string } | undefined)
      ?.listenerUUID
    if (listenerUUID) {
      this.props.lastEventListenerId = listenerUUID
    }
  },
)

/**
 * Unsubscribe from a Desktop Agent event listener
 * Note: This is different from private channel event listeners
 */
When(
  "{string} removes DA event listener {string} [fdc3.removeEventListener]",
  async function (this: CustomWorld, app: string, listenerUUID: string) {
    ensureAppInstance(this, app)
    const meta = createMeta(this, app)

    const message: EventListenerUnsubscribeRequest = {
      meta,
      payload: {
        listenerUUID: handleResolve(listenerUUID, this) ?? listenerUUID,
      },
      type: "eventListenerUnsubscribeRequest",
    }

    await this.mockTransport.receiveMessage(message)
  },
)
