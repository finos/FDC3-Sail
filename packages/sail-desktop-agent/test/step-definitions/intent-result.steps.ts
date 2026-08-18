import { When } from "@cucumber/cucumber"
import { CustomWorld } from "../world/index"
import { createMeta } from "./generic.steps"
import { BrowserTypes } from "@finos/fdc3-schema"

type IntentResultRequest = BrowserTypes.IntentResultRequest

function resolveLastIntentEventUuid(world: CustomWorld): string {
  const last = [...world.mockTransport.getPostedMessages()]
    .reverse()
    .find(r => r.msg.type === "intentEvent")
  const uuid = (last?.msg.meta as { eventUuid?: string } | undefined)?.eventUuid
  if (!uuid) throw new Error("No intentEvent found to resolve eventUuid")
  return uuid
}

function resolveEventUuid(world: CustomWorld, value: string): string {
  return value === "{lastIntentEventUuid}" ? resolveLastIntentEventUuid(world) : value
}

/**
 * Step for ResultError.NoResultReturned — simulates a handler that returns nothing.
 * The intentResultRequest carries a null intentResult to signal the absence of a return value.
 * Per FDC3 2.2 spec, IntentResolution.getResult() must reject with ResultError.NoResultReturned.
 */
When(
  "{string} sends a intentResultRequest with eventUuid {string} and no result returned and raiseIntentUuid {string} [IntentResolution.getResult]",
  async function (this: CustomWorld, appStr: string, eventUuid: string, raiseIntentUuid: string) {
    const meta = createMeta(this, appStr)
    const message = {
      type: "intentResultRequest" as const,
      meta: { ...meta },
      payload: {
        intentResult: null,
        intentEventUuid: resolveEventUuid(this, eventUuid),
        raiseIntentRequestUuid: raiseIntentUuid,
      },
    } as unknown as IntentResultRequest
    this.props.lastIntentResultRequestUuid = message.meta?.requestUuid
    await this.mockTransport.receiveMessage(message)
  },
)

/**
 * Step for ResultError.IntentHandlerRejected — simulates a handler whose promise rejects.
 * The intentResultRequest carries an error marker in the intentResult payload.
 * Per FDC3 2.2 spec, IntentResolution.getResult() must reject with ResultError.IntentHandlerRejected.
 */
When(
  "{string} sends a intentResultRequest with eventUuid {string} and handler rejection and raiseIntentUuid {string} [IntentResolution.getResult]",
  async function (this: CustomWorld, appStr: string, eventUuid: string, raiseIntentUuid: string) {
    const meta = createMeta(this, appStr)
    const message = {
      type: "intentResultRequest" as const,
      meta: { ...meta },
      payload: {
        intentResult: { error: "IntentHandlerRejected" },
        intentEventUuid: resolveEventUuid(this, eventUuid),
        raiseIntentRequestUuid: raiseIntentUuid,
      },
    } as unknown as IntentResultRequest
    this.props.lastIntentResultRequestUuid = message.meta?.requestUuid
    await this.mockTransport.receiveMessage(message)
  },
)
