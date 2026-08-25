import { createDACPSuccessResponse, createDACPEvent } from "../../dacp/dacp-message-creators"
import { type DACPHandlerParams } from "../types"
import { sendDACPResponse, sendDACPErrorResponse } from "../utils/dacp-response-utils"
import type { BrowserTypes, Context } from "@finos/fdc3"
import { ChannelError } from "@finos/fdc3"
import {
  FDC3ChannelError,
  NoChannelFoundError,
  ChannelAccessDeniedError,
  ListenerNotFoundChannelError,
} from "../../errors/fdc3-errors"
import {
  getAppChannel,
  getChannelContext,
  getInstance,
  getPrivateChannel,
  getStoredContext,
  getUserChannel,
  instanceContextListenerMatchesBroadcast,
} from "../../state/selectors"
import {
  storeContext,
  addContextListener,
  joinUserChannel,
  removeContextListener,
  addPrivateChannelContextListener,
  removePrivateChannelContextListener,
  setPrivateChannelLastContext,
} from "../../state/mutators"
import {
  notifyPrivateChannelAddContextListener,
  notifyPrivateChannelUnsubscribe,
} from "../private-channels/handlers"
import { notifyContextListenerAdded } from "../utils/open-with-context"
import { isValidContext } from "../utils/context-validation"
import { isFdc3VersionAtLeast } from "../../agent/fdc3-version"

/** Handles DACP broadcastRequest (validation runs at the router). */
export function handleBroadcastRequest(
  message: BrowserTypes.BroadcastRequest,
  params: DACPHandlerParams,
): void {
  const { responses, instanceId, getState, setState, logger, implementationMetadata } = params

  try {
    const { channelId, context } = message.payload
    const broadcastPayload = message.payload as BrowserTypes.BroadcastRequest["payload"] & {
      /** FDC3 3.0: optional app-provided ContextMetadata fields on broadcast. */
      metadata?: Record<string, unknown>
    }
    // Must not be read at all at 2.2 — the 2.2 JSON Schema has `additionalProperties: false`,
    // so a 3.0 field on the wire would otherwise be silently honoured even though the message
    // fails schema validation.
    const broadcastAppMetadata = isFdc3VersionAtLeast(implementationMetadata.fdc3Version, "3.0")
      ? broadcastPayload.metadata
      : undefined

    if (!isValidContext(context)) {
      sendDACPErrorResponse({
        message,
        errorType: ChannelError.MalformedContext,
        errorMessage: "Invalid context: context must be an object with a string type property",
        instanceId,
        responses,
      })
      return
    }

    const state = getState()
    const instance = getInstance(state, instanceId)
    if (!instance) {
      throw new Error("Instance not found")
    }

    // The 2.2 (and 3.0) schema requires `channelId` on broadcastRequest.payload — the FDC3
    // client resolves the current user channel and includes it on the wire itself, so a
    // missing `channelId` here is a malformed message, not a legitimate "not joined" case.
    // Only reachable under `validation: "warn"`, which dispatches non-conformant messages
    // anyway; under `strict` this message is rejected before the handler runs.
    if (!channelId) {
      throw new NoChannelFoundError("broadcastRequest.payload.channelId is required")
    }

    const userChannel = getUserChannel(state, channelId)
    const appChannel = getAppChannel(state, channelId)
    const privateChannel = getPrivateChannel(state, channelId)
    if (!userChannel && !appChannel && !privateChannel) {
      throw new NoChannelFoundError(`Channel ${channelId} does not exist`)
    }

    // There is deliberately no "not joined to this user channel" short-circuit here. The client
    // resolves the channel and puts it on the wire, so the agent cannot tell
    // `DesktopAgent.broadcast()` from `Channel.broadcast()` — and the latter is specified to
    // reach the named channel whether or not the app has joined it. `DesktopAgentProxy.broadcast`
    // already returns early when the app is unjoined, so the unjoined case never arrives.
    logger.info("DACP: Processing broadcast request", {
      channelId,
      contextType: context.type,
      requestUuid: message.meta.requestUuid,
    })

    // Store context using state transform (skip for private channels)
    if (!privateChannel) {
      setState(state => storeContext(state, channelId, context, instanceId))
    }

    if (privateChannel) {
      if (!privateChannel.connectedInstances.includes(instanceId)) {
        throw new ChannelAccessDeniedError(
          `Instance ${instanceId} is not connected to private channel ${channelId}`,
        )
      }

      setState(state => setPrivateChannelLastContext(state, channelId, context.type, context))
      notifyPrivateChannelContextListeners(channelId, context, params, broadcastAppMetadata)
    } else {
      notifyContextListeners(channelId, context, params, broadcastAppMetadata)
    }

    const response = createDACPSuccessResponse(message, "broadcastResponse")

    sendDACPResponse({ response, instanceId, responses })

    logger.debug("DACP: Broadcast request completed successfully", {
      requestUuid: message.meta.requestUuid,
    })
  } catch (error) {
    logger.error("DACP: Broadcast request failed", error)

    const errorType = error instanceof FDC3ChannelError ? error.errorType : ChannelError.ApiTimeout
    const errorMessage = error instanceof Error ? error.message : "Unknown broadcast error"

    sendDACPErrorResponse({
      message,
      errorType,
      errorMessage,
      instanceId,
      responses,
    })
  }
}

/**
 * Handles add context listener requests
 * Implements DACP addContextListenerRequest message handling
 */
export function handleAddContextListener(
  message: BrowserTypes.AddContextListenerRequest,
  params: DACPHandlerParams,
): void {
  const { responses, instanceId, getState, setState, logger } = params

  try {
    const { channelId, contextType: payloadContextType } = message.payload
    const contextType = payloadContextType ?? "*" // Default to all contexts if not specified

    if (channelId) {
      const state = getState()
      const userChannel = getUserChannel(state, channelId)
      const appChannel = getAppChannel(state, channelId)
      const privateChannel = getPrivateChannel(state, channelId)

      if (!userChannel && !appChannel && !privateChannel) {
        throw new NoChannelFoundError(`Channel ${channelId} does not exist`)
      }

      if (userChannel) {
        setState(state => joinUserChannel(state, instanceId, channelId))
      }

      if (privateChannel) {
        const privateContextType = payloadContextType ?? null
        const listenerId = crypto.randomUUID()
        const resolvedContextType = privateContextType === "*" ? null : privateContextType

        if (!privateChannel.connectedInstances.includes(instanceId)) {
          throw new ChannelAccessDeniedError(
            `Instance ${instanceId} is not connected to private channel ${channelId}`,
          )
        }
        setState(s =>
          addPrivateChannelContextListener(
            s,
            channelId,
            listenerId,
            instanceId,
            resolvedContextType,
          ),
        )

        notifyPrivateChannelAddContextListener(channelId, instanceId, resolvedContextType, params)

        const response = createDACPSuccessResponse(message, "addContextListenerResponse", {
          listenerUUID: listenerId,
        })

        sendDACPResponse({ response, instanceId, responses })
        return
      }
    }

    logger.info("DACP: Adding context listener", {
      instanceId,
      contextType,
      requestUuid: message.meta.requestUuid,
    })

    const listenerId = message.meta.requestUuid

    // Add context listener using state transform
    setState(state =>
      addContextListener(state, instanceId, listenerId, contextType, message.payload.channelId),
    )

    logger.info("DACP: Context listener registration result", {
      instanceId,
      contextType,
      listenerId,
      added: true,
      requestUuid: message.meta.requestUuid,
    })

    const response = createDACPSuccessResponse(message, "addContextListenerResponse", {
      listenerUUID: listenerId,
    })

    sendDACPResponse({ response, instanceId, responses })

    notifyContextListenerAdded(instanceId, contextType, params)

    logger.debug("DACP: Context listener added successfully", {
      listenerUUID: listenerId,
      instanceId,
      requestUuid: message.meta.requestUuid,
    })

    const stateAfterListener = getState()
    const requestedChannelId = message.payload.channelId
    if (requestedChannelId && getUserChannel(stateAfterListener, requestedChannelId)) {
      deliverCurrentContextToListener(instanceId, requestedChannelId, contextType, params)
    } else if (!requestedChannelId) {
      const inst = getInstance(stateAfterListener, instanceId)
      const uc = inst?.currentUserChannel
      if (uc && getUserChannel(stateAfterListener, uc)) {
        deliverCurrentContextToListener(instanceId, uc, contextType, params)
      }
    }
  } catch (error) {
    logger.error("DACP: Add context listener failed", error)

    const errorType = error instanceof FDC3ChannelError ? error.errorType : ChannelError.ApiTimeout
    const errorMessage = error instanceof Error ? error.message : "Failed to add context listener"

    sendDACPErrorResponse({
      message,
      errorType,
      errorMessage,
      instanceId,
      responses,
    })
  }
}

/**
 * Handles context listener unsubscribe requests
 * Implements DACP contextListenerUnsubscribeRequest message handling
 */
export function handleContextListenerUnsubscribe(
  message: BrowserTypes.ContextListenerUnsubscribeRequest,
  params: DACPHandlerParams,
): void {
  const { responses, instanceId, getState, setState, logger } = params

  try {
    const { listenerUUID } = message.payload

    logger.info("DACP: Unsubscribing context listener", {
      listenerUUID,
      instanceId,
      // oxlint-disable-next-line typescript/no-unnecessary-condition -- `message` is an inbound DACP wire message; its declared `meta.requestUuid` is an assumption about a well-behaved peer, not a guarantee.
      requestUuid: message.meta?.requestUuid,
    })

    const state = getState()
    const instance = getInstance(state, instanceId)
    const hasInstanceListener = !!instance && !!instance.contextListeners[listenerUUID]

    if (hasInstanceListener) {
      setState(state => removeContextListener(state, instanceId, listenerUUID))
    } else {
      const privateChannels = Object.values(state.channels.private)
      const privateChannelWithListener = privateChannels.find(
        channel => channel.contextListeners[listenerUUID],
      )

      if (!privateChannelWithListener) {
        throw new ListenerNotFoundChannelError(
          `Context listener ${listenerUUID} not found for instance ${instanceId}`,
        )
      }

      const privateListener = privateChannelWithListener.contextListeners[listenerUUID]!
      if (privateListener.instanceId !== instanceId) {
        throw new ListenerNotFoundChannelError(
          `Context listener ${listenerUUID} not found for instance ${instanceId}`,
        )
      }

      setState(state =>
        removePrivateChannelContextListener(state, privateChannelWithListener.id, listenerUUID),
      )
      notifyPrivateChannelUnsubscribe(
        privateChannelWithListener.id,
        listenerUUID,
        privateListener.contextType,
        instanceId,
        params,
      )
    }

    const response = createDACPSuccessResponse(message, "contextListenerUnsubscribeResponse")

    sendDACPResponse({ response, instanceId, responses })

    logger.debug("DACP: Context listener unsubscribed successfully", {
      listenerUUID,
      instanceId,
      // oxlint-disable-next-line typescript/no-unnecessary-condition -- `message` is an inbound DACP wire message; its declared `meta.requestUuid` is an assumption about a well-behaved peer, not a guarantee.
      requestUuid: message.meta?.requestUuid,
    })
  } catch (error) {
    logger.error("DACP: Context listener unsubscribe failed", error)

    const errorType = error instanceof FDC3ChannelError ? error.errorType : ChannelError.ApiTimeout
    const errorMessage =
      error instanceof Error ? error.message : "Failed to unsubscribe context listener"

    sendDACPErrorResponse({
      message,
      errorType,
      errorMessage,
      instanceId,
      responses,
    })
  }
}

function notifyContextListeners(
  channelId: string,
  context: Context,
  params: DACPHandlerParams,
  appMetadata?: Record<string, unknown>,
): void {
  const { getState, logger, logPayloadDetail } = params
  const state = getState()
  const userChannel = getUserChannel(state, channelId)
  const appChannel = getAppChannel(state, channelId)

  const instancesOnChannel = userChannel
    ? Object.values(state.instances).filter(
        instance =>
          instance.currentUserChannel === channelId &&
          Object.values(instance.contextListeners).some(
            listener =>
              instanceContextListenerMatchesBroadcast(listener, context.type) &&
              (listener.channelId === undefined || listener.channelId === channelId),
          ),
      )
    : appChannel
      ? Object.values(state.instances).filter(instance =>
          Object.values(instance.contextListeners).some(
            listener =>
              listener.channelId === channelId &&
              instanceContextListenerMatchesBroadcast(listener, context.type),
          ),
        )
      : []

  logger.info("DACP: Notifying context listeners", {
    channelId,
    contextType: context.type,
    totalInstancesOnChannel: instancesOnChannel.length,
    instanceIds: instancesOnChannel.map(i => i.instanceId),
  })

  const targets = instancesOnChannel.filter(instance => {
    if (instance.instanceId === params.instanceId) {
      logger.debug("Skipping sender instance", { instanceId: instance.instanceId })
      return false
    }
    return true
  })

  let successful = 0
  let failed = 0

  targets.forEach(instance => {
    try {
      const senderInstance = getInstance(getState(), params.instanceId)

      const broadcastEvent = createDACPEvent(
        "broadcastEvent",
        {
          channelId,
          context,
          originatingApp: {
            appId: senderInstance?.appId || "unknown",
            instanceId: params.instanceId,
          },
        },
        { appMetadata },
      )

      const broadcastEventWithRouting = {
        ...broadcastEvent,
        meta: {
          ...broadcastEvent.meta,
          destination: { instanceId: instance.instanceId },
        },
      }

      logger.info("DACP: Sending broadcast event to listener", {
        targetInstanceId: instance.instanceId,
        channelId,
        contextType: context.type,
        eventUuid: broadcastEvent.meta.eventUuid,
      })

      if (logPayloadDetail === "full") {
        logger.debug("DACP: Sending broadcast event to listener (full payload)", {
          targetInstanceId: instance.instanceId,
          broadcastEventPayload: JSON.stringify(broadcastEvent.payload),
        })
      }

      params.responses.sendOutbound(broadcastEventWithRouting)

      const broadcastPayload = (broadcastEvent as BrowserTypes.BroadcastEvent).payload
      logger.debug("DACP: Broadcast event message structure", {
        type: broadcastEventWithRouting.type,
        hasPayload: !!broadcastPayload,
        hasContext: !!broadcastPayload.context,
        contextType: broadcastPayload.context.type,
      })

      logger.debug("Broadcast event sent to listener", {
        instanceId: instance.instanceId,
        channelId,
        contextType: context.type,
      })
      successful++
    } catch (error) {
      failed++
      logger.error("Failed to notify context listener", {
        instanceId: instance.instanceId,
        error,
      })
    }
  })

  logger.info("DACP: Context listener notification complete", {
    channelId,
    contextType: context.type,
    successful,
    failed,
    total: successful + failed,
  })
}

function deliverCurrentContextToListener(
  instanceId: string,
  channelId: string,
  contextType: string,
  params: DACPHandlerParams,
): void {
  const state = params.getState()
  const contextToDeliver =
    contextType === "*"
      ? getChannelContext(state, channelId)
      : getChannelContext(state, channelId, contextType)

  if (!contextToDeliver) {
    return
  }

  const storedContext = getStoredContext(state, channelId, contextToDeliver.type)
  const sourceInstanceId = storedContext?.sourceInstanceId
  const sourceInstance = sourceInstanceId ? getInstance(state, sourceInstanceId) : undefined

  const broadcastEvent = createDACPEvent("broadcastEvent", {
    channelId,
    context: contextToDeliver,
    originatingApp: {
      appId: sourceInstance?.appId ?? "unknown",
      instanceId: sourceInstanceId ?? "unknown",
    },
  })

  const broadcastEventWithRouting = {
    ...broadcastEvent,
    meta: {
      ...broadcastEvent.meta,
      destination: { instanceId },
    },
  }

  params.responses.sendOutbound(broadcastEventWithRouting)
}

function notifyPrivateChannelContextListeners(
  channelId: string,
  context: Context,
  params: DACPHandlerParams,
  appMetadata?: Record<string, unknown>,
): void {
  const { getState, logger } = params
  const privateChannel = getPrivateChannel(getState(), channelId)

  if (!privateChannel) {
    return
  }

  const contextListeners = Object.values(privateChannel.contextListeners)

  contextListeners
    .filter(listener => {
      if (listener.instanceId === params.instanceId) {
        return false
      }

      return listener.contextType === null || listener.contextType === context.type
    })
    .forEach(listener => {
      const senderInstance = getInstance(getState(), params.instanceId)
      const broadcastEvent = createDACPEvent(
        "broadcastEvent",
        {
          channelId,
          context,
          originatingApp: {
            appId: senderInstance?.appId || "unknown",
            instanceId: params.instanceId,
          },
        },
        { appMetadata },
      )

      const broadcastEventWithRouting = {
        ...broadcastEvent,
        meta: {
          ...broadcastEvent.meta,
          destination: { instanceId: listener.instanceId },
        },
      }

      logger.info("DACP: Sending private channel broadcast event", {
        targetInstanceId: listener.instanceId,
        channelId,
        contextType: context.type,
      })

      params.responses.sendOutbound(broadcastEventWithRouting)
    })
}
