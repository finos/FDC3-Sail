import { When } from "@cucumber/cucumber"
import { CustomWorld } from "../world"
import { createMeta } from "./generic.steps"
import {} from "@finos/fdc3-standard"
import { handleResolve } from "@finos/cucumber-testing-steps"
import { BrowserTypes } from "@finos/fdc3-schema"

type AddEventListenerRequest = BrowserTypes.AddEventListenerRequest
type EventListenerUnsubscribeRequest =
  BrowserTypes.EventListenerUnsubscribeRequest

/** ClearContextRequest is FDC3 3.0; typed loosely until schema deps update. */
type ClearContextRequest = {
  type: "clearContextRequest"
  meta: ReturnType<typeof createMeta>
  payload: { channelId: string; contextType?: string | null }
}

When(
  "{string} adds an event listener for {string}",
  function (this: CustomWorld, app: string, type: string) {
    const meta = createMeta(this, app)
    const resolvedType = handleResolve(type, this)

    const uuid = this.sc.getInstanceUUID(meta.source)!
    const message = {
      meta,
      payload: {
        type: resolvedType,
        channelId: null,
      },
      type: "addEventListenerRequest",
    } as AddEventListenerRequest

    this.sc.receive(message, uuid)
  },
)

When(
  "{string} adds an event listener for {string} on channel {string}",
  function (this: CustomWorld, app: string, type: string, channelId: string) {
    const meta = createMeta(this, app)
    const resolvedType = handleResolve(type, this)
    const resolvedChannelId = handleResolve(channelId, this)

    const uuid = this.sc.getInstanceUUID(meta.source)!
    const message = {
      meta,
      payload: {
        type: resolvedType,
        channelId: resolvedChannelId,
      },
      type: "addEventListenerRequest",
    } as AddEventListenerRequest

    this.sc.receive(message, uuid)
  },
)

When(
  "{string} clears context {string} on {string}",
  function (
    this: CustomWorld,
    app: string,
    contextType: string,
    channelId: string,
  ) {
    const meta = createMeta(this, app)
    const uuid = this.sc.getInstanceUUID(meta.source)!

    const message: ClearContextRequest = {
      meta,
      payload: {
        channelId: handleResolve(channelId, this) as string,
        contextType: handleResolve(contextType, this) as string | null,
      },
      type: "clearContextRequest",
    }

    this.sc.receive(message, uuid)
  },
)

When(
  "{string} removes event listener with id {string}",
  function (this: CustomWorld, app: string, id: string) {
    const meta = createMeta(this, app)
    const uuid = this.sc.getInstanceUUID(meta.source)!

    const message = {
      meta,
      payload: {
        listenerUUID: id,
      },
      type: "eventListenerUnsubscribeRequest",
    } as EventListenerUnsubscribeRequest

    this.sc.receive(message, uuid)
  },
)
