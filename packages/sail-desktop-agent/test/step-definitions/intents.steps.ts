import { DataTable, Given, When } from "@cucumber/cucumber"
import { CustomWorld } from "../world/index.ts"
import type { DirectoryApp } from "../../src/app-directory/types"
import { APP_FIELD, contextMap, createMeta, getAppInstanceId } from "./generic.steps"
import { handleResolve } from "../support/testing-utils"
import { BrowserTypes } from "@finos/fdc3-schema"
import { AppInstanceState } from "../../src/state/types"
import { getInstance, getInstancesByAppId } from "../../src/state/selectors"
import { connectInstance, updateInstanceState } from "../../src/state/mutators"

type FindIntentRequest = BrowserTypes.FindIntentRequest
type FindIntentsByContextRequest = BrowserTypes.FindIntentsByContextRequest
type AddIntentListenerRequest = BrowserTypes.AddIntentListenerRequest
type IntentListenerUnsubscribeRequest = BrowserTypes.IntentListenerUnsubscribeRequest
type RaiseIntentRequest = BrowserTypes.RaiseIntentRequest
type RaiseIntentForContextRequest = BrowserTypes.RaiseIntentForContextRequest
type IntentResultRequest = BrowserTypes.IntentResultRequest

type ListensFor = {
  [key: string]: {
    displayName?: string | undefined
    contexts: string[]
    resultType?: string | undefined
  }
}

/**
 * Helper to ensure app instance exists and is connected before sending messages
 */
function ensureAppInstance(world: CustomWorld, appStr: string): string {
  let instanceId = getAppInstanceId(world, appStr)

  const state = world.getState()
  let instance = getInstance(state, instanceId)
  if (!instance) {
    const meta = createMeta(world, appStr)
    if (meta.source?.appId) {
      const existingInstances = getInstancesByAppId(state, meta.source.appId).filter(
        candidate => candidate.state === AppInstanceState.CONNECTED,
      )
      if (existingInstances.length === 1) {
        instanceId = existingInstances[0]!.instanceId
        if (!world.props.instances) {
          world.props.instances = {}
        }
        world.props.instances[appStr] = instanceId
        instance = getInstance(state, instanceId)
      }
    }
    if (!instance) {
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
  }

  return instanceId
}

type IntentEventMeta = { eventUuid?: string }

function resolveIntentEventUuid(world: CustomWorld, value: string): string {
  if (value === "{lastIntentEventUuid}") {
    const lastIntentEvent = [...world.mockTransport.getPostedMessages()]
      .reverse()
      .find(record => record.msg.type === "intentEvent")
    const eventUuid = (lastIntentEvent?.msg.meta as IntentEventMeta | undefined)?.eventUuid
    if (!eventUuid) {
      throw new Error("No intentEvent found to resolve {lastIntentEventUuid}")
    }
    return eventUuid
  }

  return handleResolve(value, world) as string
}

function decamelize(str: string, separator: string) {
  separator = typeof separator === "undefined" ? "_" : separator

  return str
    .replace(/([a-z\d])([A-Z])/g, "$1" + separator + "$2")
    .replace(/([A-Z]+)([A-Z][a-z\d]+)/g, "$1" + separator + "$2")
    .toLowerCase()
}

function convertDataTableToListensFor(cw: CustomWorld, dt: DataTable): ListensFor {
  const hashes = dt.hashes()
  const out: ListensFor = {}
  hashes.forEach(h => {
    const explicitDisplayName = h["Display Name"]?.trim()
    out[h["Intent Name"]!] = {
      displayName: explicitDisplayName
        ? (handleResolve(explicitDisplayName, cw) as string)
        : decamelize(h["Intent Name"]!, " "),
      contexts: [handleResolve(h["Context Type"]!, cw) as string],
      resultType: handleResolve(h["Result Type"]!, cw) ?? undefined,
    }
  })

  return out
}

Given(
  "{string} is an app with the following intents",
  function (this: CustomWorld, appId: string, dt: DataTable) {
    const currentApps = this.props[APP_FIELD] ?? []

    const newApp: DirectoryApp = {
      appId,
      type: "web",
      description: "",
      title: appId, // Use appId as title to ensure it's not empty
      details: {
        url: `https://example.com/${appId}`, // Provide valid URL for web apps
      },
      interop: {
        intents: {
          listensFor: convertDataTableToListensFor(this, dt),
        },
      },
    }

    currentApps.push(newApp)

    this.props[APP_FIELD] = currentApps
  },
)

When(
  "{string} finds intents with intent {string} and contextType {string} and result type {string} [fdc3.findIntent]",
  async function (
    this: CustomWorld,
    appStr: string,
    intentName: string,
    contextType: string,
    resultType: string,
  ) {
    ensureAppInstance(this, appStr)
    const meta = createMeta(this, appStr)

    const message: FindIntentRequest = {
      meta,
      payload: {
        intent: handleResolve(intentName, this) as string,
        resultType: handleResolve(resultType, this) ?? undefined,
        context: contextMap[contextType],
      },
      type: "findIntentRequest",
    }

    await this.mockTransport.receiveMessage(message)
  },
)

When(
  "{string} finds intents with contextType {string} and result type {string} [fdc3.findIntentsByContext]",
  async function (this: CustomWorld, appStr: string, contextType: string, resultType: string) {
    ensureAppInstance(this, appStr)
    const meta = createMeta(this, appStr)

    const message: FindIntentsByContextRequest = {
      meta,
      payload: {
        context: contextMap[contextType] ?? { type: contextType },
        resultType: handleResolve(resultType, this) ?? undefined,
      },
      type: "findIntentsByContextRequest",
    }

    await this.mockTransport.receiveMessage(message)
  },
)

Given(
  "{string} registers an intent listener for {string} with contextType {string} [fdc3.addIntentListener]",
  async function (this: CustomWorld, appStr: string, intent: string, contextType: string) {
    await registerIntentListenerWithContextTypes(this, appStr, intent, [contextType])
  },
)

Given(
  "{string} registers an intent listener for {string} with contextType {string} [fdc3.addIntentListenerWithContext]",
  async function (this: CustomWorld, appStr: string, intent: string, contextType: string) {
    await registerIntentListenerWithContextTypes(this, appStr, intent, [contextType])
  },
)

Given(
  "{string} registers an intent listener for {string} with contextTypes {string} [fdc3.addIntentListenerWithContext]",
  async function (this: CustomWorld, appStr: string, intent: string, contextTypesCsv: string) {
    const contextTypes = contextTypesCsv.split(",").map(type => type.trim())
    await registerIntentListenerWithContextTypes(this, appStr, intent, contextTypes)
  },
)

async function registerIntentListenerWithContextTypes(
  world: CustomWorld,
  appStr: string,
  intent: string,
  contextTypes: string[],
): Promise<void> {
  ensureAppInstance(world, appStr)
  const meta = createMeta(world, appStr)

  const message = {
    type: "addIntentListenerRequest",
    meta,
    payload: {
      intent: handleResolve(intent, world) as string,
      contextType: contextTypes.length === 1 ? contextTypes[0] : contextTypes,
    },
  } as AddIntentListenerRequest

  world.props.lastInboundRequestAt = Date.now()
  await world.mockTransport.receiveMessage(message)

  const lastMessage = world.mockTransport.getLastMessage()
  const listenerUUID = (lastMessage?.msg?.payload as { listenerUUID?: string } | undefined)
    ?.listenerUUID
  if (listenerUUID) {
    world.props.lastIntentListenerId = listenerUUID
    const instanceId = getAppInstanceId(world, appStr)
    const byInstance =
      (world.props.intentListenersByInstance as Record<string, string> | undefined) ?? {}
    byInstance[instanceId] = listenerUUID
    world.props.intentListenersByInstance = byInstance
  }
}

Given(
  "{string} registers an intent listener for {string} [fdc3.addIntentListener]",
  async function (this: CustomWorld, appStr: string, intent: string) {
    ensureAppInstance(this, appStr)
    const meta = createMeta(this, appStr)

    const message: AddIntentListenerRequest = {
      type: "addIntentListenerRequest",
      meta,
      payload: {
        intent: handleResolve(intent, this) as string,
      },
    }

    this.props.lastInboundRequestAt = Date.now()
    await this.mockTransport.receiveMessage(message)

    const lastMessage = this.mockTransport.getLastMessage()
    const listenerUUID = (lastMessage?.msg?.payload as { listenerUUID?: string } | undefined)
      ?.listenerUUID
    if (listenerUUID) {
      this.props.lastIntentListenerId = listenerUUID
      const instanceId = getAppInstanceId(this, appStr)
      const byInstance =
        (this.props.intentListenersByInstance as Record<string, string> | undefined) ?? {}
      byInstance[instanceId] = listenerUUID
      this.props.intentListenersByInstance = byInstance
    }
  },
)

Given(
  "{string} unsubscribes an intent listener with id {string} [fdc3.removeIntentListener]",
  async function (this: CustomWorld, appStr: string, id: string) {
    ensureAppInstance(this, appStr)
    const meta = createMeta(this, appStr)

    const resolvedId = handleResolve(id, this) as string
    const instanceId = getAppInstanceId(this, appStr)
    const byInstance = this.props.intentListenersByInstance as Record<string, string> | undefined
    const listenerUUID =
      id === "{lastIntentListenerId}" && byInstance?.[instanceId]
        ? byInstance[instanceId]
        : resolvedId

    const message: IntentListenerUnsubscribeRequest = {
      type: "intentListenerUnsubscribeRequest",
      meta,
      payload: {
        listenerUUID,
      },
    }

    await this.mockTransport.receiveMessage(message)
  },
)

function raise(
  cw: CustomWorld,
  intentName: string,
  contextType: string,
  dest: string | null,
  meta: RaiseIntentRequest["meta"],
): RaiseIntentRequest {
  const destMeta = dest != null ? createMeta(cw, dest) : null
  const message = {
    type: "raiseIntentRequest",
    meta: {
      ...meta,
    },
    payload: {
      intent: handleResolve(intentName, cw),
      context: contextMap[contextType],
      ...(dest ? { app: destMeta!.source } : {}),
    },
  } as RaiseIntentRequest
  return message
}

function raiseWithContext(
  cw: CustomWorld,
  contextType: string,
  dest: string | null,
  meta: RaiseIntentForContextRequest["meta"],
): RaiseIntentForContextRequest {
  const destMeta = dest != null ? createMeta(cw, dest) : null
  const message = {
    type: "raiseIntentForContextRequest",
    meta: {
      ...meta,
    },
    payload: {
      context: contextMap[contextType],
      ...(dest ? { app: destMeta!.source } : {}),
    },
  } as RaiseIntentForContextRequest
  return message
}

function raiseWithInvalidTarget(
  cw: CustomWorld,
  intentName: string,
  contextType: string,
  meta: RaiseIntentRequest["meta"],
): RaiseIntentRequest {
  const message = {
    type: "raiseIntentRequest",
    meta: {
      ...meta,
    },
    payload: {
      intent: handleResolve(intentName, cw),
      context: contextMap[contextType],
      app: "SPOON",
    },
  } as unknown as RaiseIntentRequest
  return message
}

function raiseWithContextAnInvalidTarget(
  contextType: string,
  meta: RaiseIntentForContextRequest["meta"],
): RaiseIntentForContextRequest {
  const message = {
    type: "raiseIntentForContextRequest",
    meta: {
      ...meta,
    },
    payload: {
      context: contextMap[contextType],
      app: "SPOON",
    },
  } as unknown as RaiseIntentForContextRequest
  return message
}

When(
  "{string} raises an intent with contextType {string} [fdc3.raiseIntentForContext]",
  async function (this: CustomWorld, appStr: string, contextType: string) {
    ensureAppInstance(this, appStr)
    const meta = createMeta(this, appStr)
    const message = raiseWithContext(this, contextType, null, meta)
    await this.mockTransport.receiveMessage(message)
  },
)

When(
  "{string} raises an intent with contextType {string} on app {string} [fdc3.raiseIntentForContext]",
  async function (this: CustomWorld, appStr: string, contextType: string, dest: string) {
    ensureAppInstance(this, appStr)
    const meta = createMeta(this, appStr)
    const message = raiseWithContext(this, contextType, dest, meta)
    await this.mockTransport.receiveMessage(message)
  },
)

When(
  "{string} raises an intent for {string} with contextType {string} [fdc3.raiseIntent]",
  async function (this: CustomWorld, appStr: string, intentName: string, contextType: string) {
    ensureAppInstance(this, appStr)
    const meta = createMeta(this, appStr)
    const message = raise(this, intentName, contextType, null, meta)
    await this.mockTransport.receiveMessage(message)
  },
)

When(
  "{string} raises an intent for {string} with contextType {string} on app {string} [fdc3.raiseIntent]",
  async function (
    this: CustomWorld,
    appStr: string,
    intentName: string,
    contextType: string,
    dest: string,
  ) {
    ensureAppInstance(this, appStr)
    const meta = createMeta(this, appStr)
    const message = raise(this, intentName, contextType, dest, meta)
    await this.mockTransport.receiveMessage(message)
  },
)

When(
  "{string} raises an intent for {string} with contextType {string} on an invalid app instance [fdc3.raiseIntent]",
  async function (this: CustomWorld, appStr: string, intentName: string, contextType: string) {
    ensureAppInstance(this, appStr)
    const meta = createMeta(this, appStr)
    const message = raiseWithInvalidTarget(this, intentName, contextType, meta)
    await this.mockTransport.receiveMessage(message)
  },
)

When(
  "{string} raises an intent with contextType {string} on an invalid app instance [fdc3.raiseIntentForContext]",
  async function (this: CustomWorld, appStr: string, contextType: string) {
    ensureAppInstance(this, appStr)
    const meta = createMeta(this, appStr)
    const message = raiseWithContextAnInvalidTarget(contextType, meta)
    await this.mockTransport.receiveMessage(message)
  },
)

When(
  "{string} raises an intent for {string} with contextType {string} on app {string} with requestUuid {string} [fdc3.raiseIntent]",
  async function (
    this: CustomWorld,
    appStr: string,
    intentName: string,
    contextType: string,
    dest: string,
    requestUuid: string,
  ) {
    ensureAppInstance(this, appStr)
    const meta = {
      ...createMeta(this, appStr),
      requestUuid,
    }
    const message = raise(this, intentName, contextType, dest, meta)
    await this.mockTransport.receiveMessage(message)
  },
)

When(
  "{string} raises an intent for {string} with contextType {string} and metadata traceId {string} on app {string} with requestUuid {string} [fdc3.raiseIntent]",
  async function (
    this: CustomWorld,
    appStr: string,
    intentName: string,
    contextType: string,
    traceId: string,
    dest: string,
    requestUuid: string,
  ) {
    ensureAppInstance(this, appStr)
    const meta = {
      ...createMeta(this, appStr),
      requestUuid,
    }
    const destMeta = createMeta(this, dest)
    const message = {
      type: "raiseIntentRequest",
      meta,
      payload: {
        intent: handleResolve(intentName, this),
        context: {
          ...contextMap[contextType],
          metadata: { traceId: handleResolve(traceId, this) as string },
        },
        app: destMeta.source,
      },
    } as RaiseIntentRequest
    await this.mockTransport.receiveMessage(message)
  },
)

When("we wait for the intent timeout", function (this: CustomWorld) {
  return new Promise<void>(resolve => {
    setTimeout(() => resolve(), 2100)
  })
})

When(
  "{string} sends a intentResultRequest with eventUuid {string} and contextType {string} and raiseIntentUuid {string} [IntentResolution.getResult]",
  async function (
    this: CustomWorld,
    appStr: string,
    eventUuid: string,
    contextType: string,
    raiseIntentUuid: string,
  ) {
    ensureAppInstance(this, appStr)
    const meta = createMeta(this, appStr)
    const resolvedEventUuid = resolveIntentEventUuid(this, eventUuid)

    const message: IntentResultRequest = {
      type: "intentResultRequest",
      meta: {
        ...meta,
      },
      payload: {
        intentResult: {
          context: contextMap[contextType],
        },
        intentEventUuid: resolvedEventUuid,
        raiseIntentRequestUuid: raiseIntentUuid,
      },
    }

    this.props.lastIntentResultRequestUuid = message.meta?.requestUuid
    await this.mockTransport.receiveMessage(message)
  },
)

When(
  "{string} sends a intentResultRequest with eventUuid {string} and void contents and raiseIntentUuid {string} [IntentResolution.getResult]",
  async function (this: CustomWorld, appStr: string, eventUuid: string, raiseIntentUuid: string) {
    ensureAppInstance(this, appStr)
    const meta = createMeta(this, appStr)
    const resolvedEventUuid = resolveIntentEventUuid(this, eventUuid)

    const message: IntentResultRequest = {
      type: "intentResultRequest",
      meta: {
        ...meta,
      },
      payload: {
        intentResult: {},
        intentEventUuid: resolvedEventUuid,
        raiseIntentRequestUuid: raiseIntentUuid,
      },
    }

    this.props.lastIntentResultRequestUuid = message.meta?.requestUuid
    await this.mockTransport.receiveMessage(message)
  },
)

When(
  "{string} sends a intentResultRequest with eventUuid {string} and private channel {string} and raiseIntentUuid {string} [IntentResolution.getResult]",
  async function (
    this: CustomWorld,
    appStr: string,
    eventUuid: string,
    channelId: string,
    raiseIntentUuid: string,
  ) {
    ensureAppInstance(this, appStr)
    const meta = createMeta(this, appStr)
    const resolvedEventUuid = resolveIntentEventUuid(this, eventUuid)

    const message: IntentResultRequest = {
      type: "intentResultRequest",
      meta: {
        ...meta,
      },
      payload: {
        intentResult: {
          channel: {
            type: "private",
            id: channelId,
          },
        },
        intentEventUuid: resolvedEventUuid,
        raiseIntentRequestUuid: raiseIntentUuid,
      },
    }

    this.props.lastIntentResultRequestUuid = message.meta?.requestUuid
    await this.mockTransport.receiveMessage(message)
  },
)

When(
  "{string} sends a intentResultRequest with eventUuid {string} and contextWithMetadata type {string} and raiseIntentUuid {string} [IntentResolution.getResult]",
  async function (
    this: CustomWorld,
    appStr: string,
    eventUuid: string,
    contextType: string,
    raiseIntentUuid: string,
  ) {
    ensureAppInstance(this, appStr)
    const meta = createMeta(this, appStr)
    const resolvedEventUuid = resolveIntentEventUuid(this, eventUuid)

    const message: IntentResultRequest = {
      type: "intentResultRequest",
      meta: {
        ...meta,
      },
      payload: {
        intentResult: {
          context: contextMap[contextType],
          metadata: {
            signature: "conformance-signature",
            custom: { conformanceKey: "value" },
          },
        } as unknown as BrowserTypes.IntentResult,
        intentEventUuid: resolvedEventUuid,
        raiseIntentRequestUuid: raiseIntentUuid,
      },
    }

    this.props.lastIntentResultRequestUuid = message.meta?.requestUuid
    await this.mockTransport.receiveMessage(message)
  },
)
